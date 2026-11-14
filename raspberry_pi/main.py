"""
BankGuard - Combined Raspberry Pi Controller
Components:
- RC522 RFID
- ADXL345 accelerometer (I2C)
- DHT11 temperature/humidity
- HC-SR04 ultrasonic sensor
- PIR motion sensor
- MQ-2 smoke/gas sensor (digital DO output only)
- Two servo motors

RFID authorization opens branch gate for 5 seconds.
Vault gate opens only through website authorization.
"""

import time
import math
import struct
import logging
import threading

import RPi.GPIO as GPIO
import socketio
import board
import adafruit_dht
import smbus
from mfrc522 import SimpleMFRC522


# =========================================================
# 1. CONFIGURATION
# =========================================================

BACKEND_HOST = "10.1.104.58"   # Change to your laptop/backend IP if needed
BACKEND_PORT = 5000
BACKEND_SECRET = "bankguard_pi_secret_token_12345"
DEVICE_ID = "bankguard_pi_01"

AUTHORIZED_UIDS = {
    "811100484108",   # Manager card
    "288527357674"    # Employee card
}

AUTO_LOCK_SECONDS = 5

# Servo positions: adjust carefully for your particular servo/mechanism.
BANK_LOCK_POSITION = 2.5
BANK_UNLOCK_POSITION = 7.5
VAULT_LOCK_POSITION = 2.5
VAULT_UNLOCK_POSITION = 7.5

ADXL_ADDRESS = 0x53
ACCEL_MOVEMENT_THRESHOLD = 0.15  # Low threshold for vibration testing

# MQ-2 digital output (DO). Existing BankGuard mapping uses BCM GPIO14.
MQ2_PIN = 14
MQ2_ALARM_LEVEL = GPIO.LOW  # Common LM393 modules pull DO LOW when threshold is crossed.


# =========================================================
# 2. GPIO PIN CONFIGURATION (BCM numbering)
# =========================================================

# HC-SR04
TRIG = 23
ECHO = 24

# PIR motion sensor
PIR_PIN = 12
PIR_WARMUP_SECONDS = 30

# MQ-2 digital output only (DO)
# GPIO14 is the existing project assignment.

# Servos
BANK_SERVO = 18
VAULT_SERVO = 13

# LEDs
BRANCH_LED = 26
VAULT_LED = 27


# =========================================================
# 3. GPIO INITIALIZATION
# =========================================================

GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)
GPIO.output(TRIG, GPIO.LOW)

GPIO.setup(PIR_PIN, GPIO.IN)
GPIO.setup(MQ2_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# LED initialization
GPIO.setup(BRANCH_LED, GPIO.OUT)
GPIO.setup(VAULT_LED, GPIO.OUT)
GPIO.output(BRANCH_LED, GPIO.LOW)
GPIO.output(VAULT_LED, GPIO.LOW)

GPIO.setup(BANK_SERVO, GPIO.OUT)
GPIO.setup(VAULT_SERVO, GPIO.OUT)

bank_pwm = GPIO.PWM(BANK_SERVO, 50)
vault_pwm = GPIO.PWM(VAULT_SERVO, 50)

bank_pwm.start(0)
vault_pwm.start(0)


# =========================================================
# 4. SENSOR INITIALIZATION
# =========================================================

# DHT11 on BCM GPIO4 (physical pin 7)
try:
    dht = adafruit_dht.DHT11(board.D4)
    logging.info("DHT11 initialized")
except Exception as exc:
    logging.exception("DHT11 initialization failed: %s", exc)
    dht = None

# ADXL345 on I2C bus 1, address 0x53
try:
    bus = smbus.SMBus(1)
    device_id = bus.read_byte_data(ADXL_ADDRESS, 0x00)
    if device_id != 0xE5:
        raise RuntimeError(
            f"Unexpected ADXL345 device ID: 0x{device_id:02X}; expected 0xE5"
        )
    bus.write_byte_data(ADXL_ADDRESS, 0x2D, 0x08)  # Measurement mode
    logging.info("ADXL345 initialized")
except Exception as exc:
    logging.exception("ADXL345 initialization failed: %s", exc)
    bus = None

# RC522 RFID
try:
    reader = SimpleMFRC522()
    logging.info("RC522 RFID reader initialized")
except Exception as exc:
    logging.exception("RFID initialization failed: %s", exc)
    reader = None


# =========================================================
# 5. SOCKET.IO BACKEND CONNECTION
# =========================================================

sio = socketio.Client(
    reconnection=True,
    reconnection_delay=3,
    reconnection_delay_max=15
)

def emit_safe(event, data):
    if sio.connected:
        try:
            sio.emit(event, data)
        except Exception as exc:
            logging.warning("Socket emit failed (%s): %s", event, exc)

@sio.event
def connect():
    logging.info("Connected to backend: http://%s:%s", BACKEND_HOST, BACKEND_PORT)
    sio.emit("pi:connect", {
        "secret": BACKEND_SECRET,
        "deviceId": DEVICE_ID
    })
    # Synchronize initial door states with the website
    emit_safe("pi:entrance_servo_state", {"state": "UNLOCKED" if bank_unlocked else "LOCKED"})
    emit_safe("pi:vault_servo_state", {"state": "UNLOCKED" if vault_unlocked else "LOCKED"})

@sio.event
def disconnect():
    logging.warning("Disconnected from backend")

def start_socket_client():
    url = f"http://{BACKEND_HOST}:{BACKEND_PORT}"
    while True:
        if not sio.connected:
            try:
                sio.connect(
                    url,
                    headers={"x-device-type": "pi"},
                    wait_timeout=5
                )
                sio.wait()
            except Exception as exc:
                logging.warning("Backend connection failed: %s", exc)
                time.sleep(3)
        else:
            time.sleep(2)


# =========================================================
# 6. SYSTEM VARIABLES
# =========================================================

bank_unlocked = False
vault_unlocked = False

bank_unlock_time = 0.0
vault_unlock_time = 0.0

last_rfid_uid = None
last_rfid_time = 0.0

temperature = None
humidity = None
distance = None

acc_x = 0.0
acc_y = 0.0
acc_z = 1.0
vault_movement = False

last_dht_read = 0.0
last_adxl_read = 0.0
last_ultrasonic_emit = 0.0
last_heartbeat_emit = 0.0
last_dashboard = 0.0
program_start_time = time.time()
last_pir_state = None
mq2_status = False
last_mq2_state = None
last_mq2_read = 0.0
pir_ready = False
pir_motion_state = "WARMING_UP"

access_message = "Waiting for RFID card"


# =========================================================
# 7. SERVO CONTROL
# =========================================================

def move_servo(pwm, duty):
    """Move servo to a position, then stop sending pulses."""
    pwm.ChangeDutyCycle(duty)
    time.sleep(0.7)
    pwm.ChangeDutyCycle(0)
    time.sleep(0.1)


def unlock_bank_servo():
    global bank_unlocked, bank_unlock_time
    logging.info("Unlocking bank entrance servo")
    move_servo(bank_pwm, BANK_UNLOCK_POSITION)
    bank_unlocked = True
    bank_unlock_time = time.time()
    emit_safe("pi:entrance_servo_state", {"state": "UNLOCKED"})


def lock_bank_servo():
    global bank_unlocked
    logging.info("Locking bank entrance servo")
    move_servo(bank_pwm, BANK_LOCK_POSITION)
    bank_unlocked = False
    emit_safe("pi:entrance_servo_state", {"state": "LOCKED"})


def unlock_vault_servo():
    global vault_unlocked, vault_unlock_time
    logging.info("Vault gate opened from website")
    move_servo(vault_pwm, VAULT_UNLOCK_POSITION)
    vault_unlocked = True
    vault_unlock_time = time.time()
    emit_safe("pi:vault_servo_state", {"state": "UNLOCKED"})


def lock_vault_servo():
    global vault_unlocked
    logging.info("Vault gate locked from website")
    move_servo(vault_pwm, VAULT_LOCK_POSITION)
    vault_unlocked = False
    emit_safe("pi:vault_servo_state", {"state": "LOCKED"})


def automatic_locking():
    now = time.time()
    # Bank entrance auto-locks after AUTO_LOCK_SECONDS (5s)
    if bank_unlocked and now - bank_unlock_time >= AUTO_LOCK_SECONDS:
        lock_bank_servo()


# Commands from the website / backend
@sio.on("cmd:entrance_servo")
def on_entrance_command(data):
    command = data.get("command", "").upper()
    logging.info("Website entrance servo command: %s", command)

    if command == "UNLOCK":
        unlock_bank_servo()
    elif command == "LOCK":
        lock_bank_servo()


@sio.on("cmd:vault_servo")
def on_vault_command(data):
    command = data.get("command", "").upper()
    logging.info("Website vault servo command: %s", command)

    if command == "UNLOCK":
        unlock_vault_servo()
    elif command == "LOCK":
        lock_vault_servo()


# =========================================================
# 8. HC-SR04 ULTRASONIC SENSOR
# =========================================================

def read_ultrasonic():
    GPIO.output(TRIG, GPIO.LOW)
    time.sleep(0.0002)

    GPIO.output(TRIG, GPIO.HIGH)
    time.sleep(0.00001)
    GPIO.output(TRIG, GPIO.LOW)

    timeout = time.monotonic() + 0.04

    while GPIO.input(ECHO) == 0:
        if time.monotonic() > timeout:
            return None

    pulse_start = time.monotonic()
    timeout = pulse_start + 0.04

    while GPIO.input(ECHO) == 1:
        if time.monotonic() > timeout:
            return None

    pulse_end = time.monotonic()
    return round((pulse_end - pulse_start) * 17150, 2)


# =========================================================
# 9. DHT11 TEMPERATURE AND HUMIDITY
# =========================================================

def read_dht11():
    global temperature, humidity

    if dht is None:
        return

    try:
        t = dht.temperature
        h = dht.humidity

        if t is not None and h is not None:
            temperature = float(t)
            humidity = float(h)

            emit_safe("pi:dht11", {
                "temperature": temperature,
                "humidity": humidity
            })

    except RuntimeError:
        # DHT11 occasionally returns a timing/checksum error.
        pass
    except Exception as exc:
        logging.warning("DHT11 read error: %s", exc)


# =========================================================
# 10. ADXL345 ACCELEROMETER
# =========================================================

def read_adxl345():
    global acc_x, acc_y, acc_z, vault_movement

    if bus is None:
        return

    try:
        data = bus.read_i2c_block_data(ADXL_ADDRESS, 0x32, 6)

        x_raw = struct.unpack("<h", bytes(data[0:2]))[0]
        y_raw = struct.unpack("<h", bytes(data[2:4]))[0]
        z_raw = struct.unpack("<h", bytes(data[4:6]))[0]

        # ADXL345 full-resolution scale: approximately 3.9 mg/LSB.
        acc_x = round(x_raw * 0.0039, 2)
        acc_y = round(y_raw * 0.0039, 2)
        acc_z = round(z_raw * 0.0039, 2)

        magnitude = math.sqrt(acc_x**2 + acc_y**2 + acc_z**2)
        vault_movement = abs(magnitude - 1.0) > ACCEL_MOVEMENT_THRESHOLD

    except Exception as exc:
        logging.warning("ADXL345 read error: %s", exc)


# =========================================================
# 11. PIR MOTION SENSOR
# =========================================================

def read_pir():
    """
    Read PIR state and send updates when the state changes.
    HC-SR501 modules need a stabilization period after power-on.
    """
    global last_pir_state, pir_ready, pir_motion_state

    if time.time() - program_start_time < PIR_WARMUP_SECONDS:
        pir_motion_state = "WARMING_UP"
        return

    pir_ready = True
    current_state = GPIO.input(PIR_PIN)

    if current_state != last_pir_state:
        last_pir_state = current_state

        if current_state:
            pir_motion_state = "MOTION_DETECTED"
            logging.info("PIR: Motion detected")
            emit_safe("pi:pir", {"state": "MOTION_DETECTED"})
        else:
            pir_motion_state = "NO_MOTION"
            logging.info("PIR: No motion")
            emit_safe("pi:pir", {"state": "NO_MOTION"})


# =========================================================
# 12. MQ-2 SMOKE/GAS SENSOR (DIGITAL DO ONLY)
# =========================================================

def read_mq2():
    """Read MQ-2 comparator output and send state to the backend.

    DO is a digital threshold signal; it does not provide a real gas
    concentration or analog ADC value.
    """
    global mq2_status, last_mq2_state, last_mq2_read

    now = time.time()
    if now - last_mq2_read < 0.5:
        return
    last_mq2_read = now

    digital_value = GPIO.input(MQ2_PIN)
    mq2_status = (digital_value == MQ2_ALARM_LEVEL)

    # Send only when the digital detection state changes.
    if mq2_status != last_mq2_state:
        last_mq2_state = mq2_status
        digital_state = "DETECTED" if mq2_status else "NORMAL"
        logging.info("MQ-2: %s (DO=%s)", digital_state, digital_value)
        emit_safe("pi:mq2", {"digitalState": digital_state})


# =========================================================
# 13. RFID CARD PROCESSING
# =========================================================

def process_rfid():
    global access_message, last_rfid_uid, last_rfid_time

    if reader is None:
        return

    try:
        uid = reader.read_id_no_block()

        if uid is None:
            return

        uid = str(uid).strip()

        # Prevent repeated reads of the same card for 3 seconds.
        if uid == last_rfid_uid and time.time() - last_rfid_time < 3:
            return

        last_rfid_uid = uid
        last_rfid_time = time.time()

        logging.info("RFID card detected: %s", uid)
        emit_safe("pi:rfid_scan", {"uid": uid})

        if uid in AUTHORIZED_UIDS:
            access_message = f"AUTHORIZED CARD: {uid} (Branch Gate Open)"
            logging.info("Access granted: Opening Bank Branch gate only")
            unlock_bank_servo()
        else:
            access_message = f"UNAUTHORIZED CARD: {uid}"
            logging.warning("Access denied")

    except Exception as exc:
        logging.warning("RFID read error: %s", exc)
        access_message = f"RFID ERROR: {exc}"


# =========================================================
# 14. SENSOR DATA TRANSMISSION
# =========================================================

def update_sensors():
    global distance
    global last_dht_read, last_adxl_read, last_ultrasonic_emit, last_heartbeat_emit

    now = time.time()

    # Periodic heartbeat to keep website connection alive
    if now - last_heartbeat_emit >= 5.0:
        emit_safe("pi:heartbeat", {"timestamp": now})
        last_heartbeat_emit = now

    # PIR and MQ-2: check digital inputs.
    read_pir()
    read_mq2()

    # DHT11: read every 2 seconds.
    if now - last_dht_read >= 2.0:
        read_dht11()
        last_dht_read = now

    # ADXL345: read every 0.2 seconds.
    if now - last_adxl_read >= 0.2:
        read_adxl345()
        last_adxl_read = now

    # HC-SR04: read and send approximately every 0.5 seconds.
    if now - last_ultrasonic_emit >= 0.5:
        distance = read_ultrasonic()

        if distance is not None:
            emit_safe("pi:ultrasonic", {"distanceCm": distance})

        last_ultrasonic_emit = now

    # Accelerometer update to the website.
    emit_safe("pi:adxl335", {
        "x": acc_x,
        "y": acc_y,
        "z": acc_z,
        "movementState": "POSSIBLE_TAMPERING" if vault_movement else "STABLE"
    })


# =========================================================
# 15. LED CONTROL
# =========================================================

def update_leds():
    # GPIO26: branch-side alert (ultrasonic, gas/smoke, or temperature).
    branch_alert = (
        (distance is not None and 0 < distance < 30)
        or mq2_status
        or (temperature is not None and temperature > 45)
    )

    # GPIO27: vault-side alert (PIR motion or ADXL345 movement).
    vault_alert = (
        pir_motion_state == "MOTION_DETECTED"
        or vault_movement
    )

    GPIO.output(BRANCH_LED, GPIO.HIGH if branch_alert else GPIO.LOW)
    GPIO.output(VAULT_LED, GPIO.HIGH if vault_alert else GPIO.LOW)


# =========================================================
# 16. TERMINAL STATUS DISPLAY
# =========================================================

def display_dashboard():
    print("\033[2J\033[H", end="")
    print("=" * 58)
    print("          BANKGUARD - RASPBERRY PI CONTROLLER")
    print("=" * 58)
    print("Backend          :", f"http://{BACKEND_HOST}:{BACKEND_PORT}")
    print("Socket           :", "CONNECTED" if sio.connected else "DISCONNECTED")
    print("-" * 58)

    print("Temperature      :", f"{temperature} C" if temperature is not None else "--")
    print("Humidity         :", f"{humidity} %" if humidity is not None else "--")
    print("Ultrasonic       :", f"{distance} cm" if distance is not None else "No echo")
    print("PIR motion       :", pir_motion_state)
    print("MQ-2 gas/smoke   :", "DETECTED" if mq2_status else "NORMAL")
    print(f"ADXL345 X        : {acc_x} g")
    print(f"ADXL345 Y        : {acc_y} g")
    print(f"ADXL345 Z        : {acc_z} g")
    print("Vault movement   :", "DETECTED" if vault_movement else "STABLE")

    print("-" * 58)
    print("Entrance servo   :", "UNLOCKED" if bank_unlocked else "LOCKED")
    print("Vault servo      :", "UNLOCKED (VAULT GATE OPEN)" if vault_unlocked else "LOCKED")
    print("RFID status      :", access_message)
    print("=" * 58)
    print("Press CTRL+C to stop")


# =========================================================
# 17. MAIN PROGRAM
# =========================================================

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

    try:
        # Start with both servos in the locked position.
        lock_bank_servo()
        lock_vault_servo()

        # Connect to the backend in a background thread.
        socket_thread = threading.Thread(
            target=start_socket_client,
            daemon=True
        )
        socket_thread.start()

        print("Starting BankGuard sensors and RFID access control...")
        print("MQ-2 uses digital DO output only (no gas concentration reading).")
        print(f"PIR sensor stabilization: {PIR_WARMUP_SECONDS} seconds")
        time.sleep(1)

        while True:
            update_sensors()
            process_rfid()
            automatic_locking()
            update_leds()
            display_dashboard()
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\nStopping BankGuard...")

    finally:
        try:
            bank_pwm.stop()
            vault_pwm.stop()

            GPIO.output(BRANCH_LED, GPIO.LOW)
            GPIO.output(VAULT_LED, GPIO.LOW)

            if dht is not None:
                dht.exit()

            if reader is not None:
                reader.READER.Close_MFRC522()

            if bus is not None:
                bus.close()

            if sio.connected:
                sio.disconnect()

        except Exception as exc:
            logging.warning("Cleanup warning: %s", exc)

        GPIO.cleanup()
        print("BankGuard stopped safely.")
