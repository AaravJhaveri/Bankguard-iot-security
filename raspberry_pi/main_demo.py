"""
BankGuard - Raspberry Pi Demonstration Controller & Web Bridge
Simulates stable DHT11 (Temp: ~22°C, Humidity: ~11%) & ADXL345 (Stable: 0.0g, 0.0g, 1.0g)
while keeping real RFID (MFRC522), Ultrasonic (HC-SR04), PIR (12), MQ-2 (14), Servos (18, 13) and LEDs (17, 27, 26).
"""

import time
import math
import random
import os
import sys
import logging
import threading
import RPi.GPIO as GPIO
import socketio

from mfrc522 import SimpleMFRC522

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("BankGuard-Pi-Demo")

# ==================================================
# 1. CONFIGURATION
# ==================================================

BACKEND_HOST = "10.1.69.226"   # Laptop IP on local network
BACKEND_PORT = 5000
BACKEND_SECRET = "bankguard_pi_secret_token_12345"
DEVICE_ID = "bankguard_pi_01"

BANK_AUTHORIZED_UIDS = {
    "288527357674"
}

MANAGER_UIDS = {
    "811100484108"
}

MQ2_ALARM_LEVEL = 0
ULTRASONIC_ALERT_DISTANCE = 30.0

BANK_LOCK_POSITION = 2.5
BANK_UNLOCK_POSITION = 7.5

VAULT_LOCK_POSITION = 2.5
VAULT_UNLOCK_POSITION = 7.5

AUTO_LOCK_SECONDS = 5

# ==================================================
# 2. GPIO PIN CONFIGURATION
# ==================================================

TRIG = 23
ECHO = 24

PIR = 12
MQ2 = 14

BANK_SERVO = 18
VAULT_SERVO = 13

GREEN_LED = 17
RED_LED = 27
YELLOW_LED = 26

BUZZER = 6

# ==================================================
# 3. INITIALIZATION
# ==================================================

GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

GPIO.setup(TRIG, GPIO.OUT)
GPIO.setup(ECHO, GPIO.IN)

GPIO.setup(PIR, GPIO.IN)
GPIO.setup(MQ2, GPIO.IN)

for pin in [GREEN_LED, RED_LED, YELLOW_LED, BUZZER]:
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, GPIO.LOW)

GPIO.setup(BANK_SERVO, GPIO.OUT)
GPIO.setup(VAULT_SERVO, GPIO.OUT)

bank_pwm = GPIO.PWM(BANK_SERVO, 50)
vault_pwm = GPIO.PWM(VAULT_SERVO, 50)

bank_pwm.start(0)
vault_pwm.start(0)

# Real RFID Hardware
try:
    reader = SimpleMFRC522()
except Exception as e:
    logger.warning(f"RC522 RFID init warning: {e}")
    reader = None

# Socket.IO Client
sio = socketio.Client(reconnection=True, reconnection_delay=3, reconnection_delay_max=15)

# ==================================================
# 4. SYSTEM VARIABLES (WITH DEMO VALUES)
# ==================================================

bank_unlocked = False
vault_unlocked = False

bank_lock_time = 0

last_rfid_time = 0
last_rfid_uid = None

# Stable demonstration environmental readings
temperature = 22.0
humidity = 11.0
distance = None

pir_status = False
mq2_status = False

# Stable accelerometer readings (Z ~ 1.0g under normal gravity)
acc_x = 0.0
acc_y = 0.0
acc_z = 1.0
vault_movement = False

last_stream_time = 0
alert_message = "SYSTEM NORMAL"
access_message = "Waiting for RFID card"

# ==================================================
# 5. ACTUATOR & SERVO FUNCTIONS
# ==================================================

def move_servo(pwm, position):
    pwm.ChangeDutyCycle(position)
    time.sleep(0.5)
    pwm.ChangeDutyCycle(0)

def unlock_bank():
    global bank_unlocked, bank_lock_time
    move_servo(bank_pwm, BANK_UNLOCK_POSITION)
    bank_unlocked = True
    bank_lock_time = time.time()
    GPIO.output(GREEN_LED, GPIO.HIGH)
    GPIO.output(RED_LED, GPIO.LOW)
    emit_safe('pi:entrance_servo_state', {'state': 'UNLOCKED'})

def lock_bank():
    global bank_unlocked
    move_servo(bank_pwm, BANK_LOCK_POSITION)
    bank_unlocked = False
    GPIO.output(GREEN_LED, GPIO.LOW)
    GPIO.output(RED_LED, GPIO.HIGH)
    emit_safe('pi:entrance_servo_state', {'state': 'LOCKED'})

def unlock_vault():
    global vault_unlocked
    move_servo(vault_pwm, VAULT_UNLOCK_POSITION)
    vault_unlocked = True
    GPIO.output(YELLOW_LED, GPIO.HIGH)
    emit_safe('pi:vault_servo_state', {'state': 'UNLOCKED'})

def lock_vault():
    global vault_unlocked
    move_servo(vault_pwm, VAULT_LOCK_POSITION)
    vault_unlocked = False
    GPIO.output(YELLOW_LED, GPIO.LOW)
    emit_safe('pi:vault_servo_state', {'state': 'LOCKED'})

def alert_signal():
    GPIO.output(RED_LED, GPIO.HIGH)

def normal_signal():
    if not bank_unlocked:
        GPIO.output(RED_LED, GPIO.LOW)

# ==================================================
# 6. ULTRASONIC & LIVE SENSORS
# ==================================================

def read_ultrasonic():
    GPIO.output(TRIG, False)
    time.sleep(0.0002)

    GPIO.output(TRIG, True)
    time.sleep(0.00001)
    GPIO.output(TRIG, False)

    timeout = time.monotonic() + 0.03
    while GPIO.input(ECHO) == 0:
        if time.monotonic() > timeout:
            return None

    start = time.monotonic()
    timeout = start + 0.03
    while GPIO.input(ECHO) == 1:
        if time.monotonic() > timeout:
            return None

    stop = time.monotonic()
    return round((stop - start) * 17150, 2)

# ==================================================
# 7. SOCKET.IO COMMUNICATION BRIDGE
# ==================================================

def emit_safe(event, data):
    if sio.connected:
        try:
            sio.emit(event, data)
        except Exception:
            pass

@sio.event
def connect():
    logger.info(f"[Socket] Connected to Backend at http://{BACKEND_HOST}:{BACKEND_PORT}")
    sio.emit('pi:connect', {
        'secret': BACKEND_SECRET,
        'deviceId': DEVICE_ID
    })

@sio.event
def disconnect():
    logger.warning("[Socket] Disconnected from Backend.")

@sio.on('cmd:entrance_servo')
def on_entrance_cmd(data):
    cmd = data.get('command')
    logger.info(f"[Web Command] Entrance Servo: {cmd}")
    if cmd == 'UNLOCK':
        unlock_bank()
    else:
        lock_bank()

@sio.on('cmd:vault_servo')
def on_vault_cmd(data):
    cmd = data.get('command')
    logger.info(f"[Web Command] Vault Servo: {cmd}")
    if cmd == 'UNLOCK':
        unlock_vault()
    else:
        lock_vault()

def start_socket_client():
    url = f"http://{BACKEND_HOST}:{BACKEND_PORT}"
    while True:
        if not sio.connected:
            try:
                sio.connect(url, headers={'x-device-type': 'pi'}, wait_timeout=5)
                sio.wait()
            except Exception:
                time.sleep(3)
        else:
            time.sleep(2)

# ==================================================
# 8. RFID PROCESSOR
# ==================================================

def process_rfid():
    global access_message, last_rfid_time, last_rfid_uid
    if not reader:
        return

    try:
        uid = reader.read_id_no_block()
        if uid is None:
            return

        uid = str(uid).strip()
        if uid == last_rfid_uid and time.time() - last_rfid_time < 3:
            return

        last_rfid_uid = uid
        last_rfid_time = time.time()

        # Emit scan event to website
        emit_safe('pi:rfid_scan', {'uid': uid})

        if uid in MANAGER_UIDS:
            access_message = f"Authorized Person Entered: Branch Manager ({uid})"
            unlock_bank()
        elif uid in BANK_AUTHORIZED_UIDS:
            access_message = f"Authorized Person Entered: Demo Employee ({uid})"
            unlock_bank()
        else:
            access_message = f"Unauthorized Person Attempted: ({uid})"
            alert_signal()

    except Exception as e:
        access_message = f"RFID ERROR: {e}"

# ==================================================
# 9. SENSOR MONITORING & DISPATCH (DEMO VALUES INCLUDED)
# ==================================================

def update_sensors():
    global distance, pir_status, mq2_status, vault_movement, alert_message
    global temperature, humidity, acc_x, acc_y, acc_z, last_stream_time

    # Real Hardware inputs
    pir_val = GPIO.input(PIR)
    pir_status = bool(pir_val)

    mq2_val = GPIO.input(MQ2)
    mq2_status = (mq2_val == MQ2_ALARM_LEVEL)

    distance = read_ultrasonic()

    # Demonstration values:
    # Temperature around 22°C (slight realistic jitter 21.8 - 22.2)
    temperature = round(22.0 + random.uniform(-0.2, 0.2), 1)
    # Humidity around 11% (slight realistic jitter 10.9 - 11.2)
    humidity = round(11.0 + random.uniform(-0.1, 0.2), 1)

    # Accelerometer: perfectly stable position (X=0.01, Y=0.00, Z=1.00)
    acc_x = round(0.01 + random.uniform(-0.01, 0.01), 2)
    acc_y = round(0.00 + random.uniform(-0.01, 0.01), 2)
    acc_z = round(1.00 + random.uniform(-0.01, 0.01), 2)
    vault_movement = False

    # Periodic continuous stream to backend website (every 0.5s)
    if time.time() - last_stream_time >= 0.5:
        emit_safe('pi:heartbeat', {'timestamp': time.time()})
        emit_safe('pi:dht11', {'temperature': temperature, 'humidity': humidity})
        emit_safe('pi:pir', {'state': 'MOTION_DETECTED' if pir_status else 'NO_MOTION'})
        # In MQ2: Send detection state
        emit_safe('pi:mq2', {'rawAdc': 750 if mq2_status else 150, 'digitalState': 'DETECTED' if mq2_status else 'NORMAL'})
        if distance is not None:
            emit_safe('pi:ultrasonic', {'distanceCm': distance})
        emit_safe('pi:adxl335', {
            'x': acc_x,
            'y': acc_y,
            'z': acc_z,
            'movementState': 'STABLE'
        })
        last_stream_time = time.time()

    # Alerts
    alerts = []
    if mq2_status:
        alerts.append("SMOKE/GAS ALERT")
    if pir_status:
        alerts.append("MOTION DETECTED")

    if alerts:
        alert_message = " | ".join(alerts)
        alert_signal()
    else:
        alert_message = "SYSTEM NORMAL"
        normal_signal()

def automatic_locking():
    if bank_unlocked and (time.time() - bank_lock_time >= AUTO_LOCK_SECONDS):
        lock_bank()

def display_dashboard():
    os.system("clear")
    print("=" * 65)
    print("      BANKGUARD DEMONSTRATION CONTROLLER (DEMO ACTIVE)")
    print("=" * 65)
    print(f"Backend Server    : http://{BACKEND_HOST}:{BACKEND_PORT}")
    print(f"Socket Status     : {'CONNECTED' if sio.connected else 'DISCONNECTED / RETRYING'}")
    print("-" * 65)
    print("Temperature (Demo):", f"{temperature} °C")
    print("Humidity    (Demo):", f"{humidity} %RH")
    print("MQ-2 State        :", "DETECTED" if mq2_status else "NORMAL")
    print("PIR Motion (Real) :", "DETECTED" if pir_status else "NO MOTION")
    print("Ultrasonic (Real) :", f"{distance} cm" if distance is not None else "NO ECHO")
    print(f"ADXL (Demo Stable): ({acc_x}g, {acc_y}g, {acc_z}g) [STABLE]")
    print("-" * 65)
    print("Bank Entrance Door:", "UNLOCKED" if bank_unlocked else "LOCKED")
    print("Vault Door        :", "UNLOCKED" if vault_unlocked else "LOCKED (Web Control)")
    print("Last Access Event :", access_message)
    print("System Status     :", alert_message)
    print("=" * 65)
    print("Press CTRL + C to stop.")

# ==================================================
# 10. MAIN ENTRY POINT
# ==================================================

if __name__ == '__main__':
    try:
        lock_bank()
        lock_vault()

        # Start WebSocket client in background daemon thread
        socket_thread = threading.Thread(target=start_socket_client, daemon=True)
        socket_thread.start()

        print("Starting BankGuard Demonstration Controller...")
        time.sleep(1)

        while True:
            update_sensors()
            process_rfid()
            automatic_locking()
            display_dashboard()
            time.sleep(0.2)

    except KeyboardInterrupt:
        print("\nStopping BankGuard...")
    finally:
        GPIO.output(GREEN_LED, GPIO.LOW)
        GPIO.output(RED_LED, GPIO.LOW)
        GPIO.output(YELLOW_LED, GPIO.LOW)
        GPIO.output(BUZZER, GPIO.LOW)
        try:
            bank_pwm.stop()
            vault_pwm.stop()
            if reader:
                reader.READER.Close_MFRC522()
        except Exception:
            pass
        GPIO.cleanup()
        print("BankGuard stopped safely.")

