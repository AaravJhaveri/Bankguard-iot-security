"""
BankGuard - Raspberry Pi Hardware Controller & Web Bridge
Integrated with BankGuard Backend via WebSockets (Socket.IO)
"""

import time
import math
import struct
import os
import sys
import logging
import threading
import RPi.GPIO as GPIO
import socketio

import board
import adafruit_dht
import smbus
from mfrc522 import SimpleMFRC522

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("BankGuard-Pi")

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
ACCEL_MOVEMENT_THRESHOLD = 0.35

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

ADXL_ADDRESS = 0x53

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

# DHT11
try:
    dht = adafruit_dht.DHT11(board.D4)
except Exception as e:
    logger.warning(f"DHT11 init warning: {e}")
    dht = None

# ADXL345 I2C
try:
    bus = smbus.SMBus(1)
    bus.write_byte_data(ADXL_ADDRESS, 0x2D, 0x08)
except Exception as e:
    logger.warning(f"ADXL345 I2C init warning: {e}")
    bus = None

# RFID
try:
    reader = SimpleMFRC522()
except Exception as e:
    logger.warning(f"RC522 RFID init warning: {e}")
    reader = None

# Socket.IO Client
sio = socketio.Client(reconnection=True, reconnection_delay=3, reconnection_delay_max=15)

# ==================================================
# 4. SYSTEM VARIABLES
# ==================================================

bank_unlocked = False
vault_unlocked = False

bank_lock_time = 0
vault_lock_time = 0

last_rfid_time = 0
last_rfid_uid = None

temperature = None
humidity = None
distance = None

pir_status = False
mq2_status = False

acc_x = 0.0
acc_y = 0.0
acc_z = 1.0

vault_movement = False

last_dht_read = 0
last_adxl_read = 0
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
# 6. SENSOR READERS
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

def read_dht():
    global temperature, humidity
    if not dht:
        return
    try:
        t = dht.temperature
        h = dht.humidity
        if t is not None and h is not None:
            temperature = t
            humidity = h
            emit_safe('pi:dht11', {'temperature': float(temperature), 'humidity': float(humidity)})
    except RuntimeError:
        pass
    except Exception:
        pass

def read_adxl():
    global acc_x, acc_y, acc_z
    if not bus:
        return
    try:
        data = bus.read_i2c_block_data(ADXL_ADDRESS, 0x32, 6)
        x = struct.unpack('<h', bytes(data[0:2]))[0]
        y = struct.unpack('<h', bytes(data[2:4]))[0]
        z = struct.unpack('<h', bytes(data[4:6]))[0]

        acc_x = round(x * 0.0039, 2)
        acc_y = round(y * 0.0039, 2)
        acc_z = round(z * 0.0039, 2)
    except Exception:
        pass

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

        uid = str(uid)
        if uid == last_rfid_uid and time.time() - last_rfid_time < 3:
            return

        last_rfid_uid = uid
        last_rfid_time = time.time()

        # Emit scan event to website
        emit_safe('pi:rfid_scan', {'uid': uid})

        if uid in MANAGER_UIDS:
            # Manager scan: unlocks bank entrance. Vault must be opened manually from website.
            access_message = f"MANAGER AUTHORIZED ({uid}) - BANK ACCESS (Use Website for Vault)"
            unlock_bank()
        elif uid in BANK_AUTHORIZED_UIDS:
            # Employee scan: unlocks bank entrance
            access_message = f"EMPLOYEE AUTHORIZED ({uid}) - BANK ACCESS"
            unlock_bank()
        else:
            access_message = f"UNAUTHORIZED CARD ({uid})"
            alert_signal()

    except Exception as e:
        access_message = f"RFID ERROR: {e}"

# ==================================================
# 9. SENSOR MONITORING & DISPATCH
# ==================================================

def update_sensors():
    global distance, pir_status, mq2_status, vault_movement, alert_message
    global last_dht_read, last_adxl_read, last_stream_time

    pir_val = GPIO.input(PIR)
    pir_status = bool(pir_val)

    mq2_val = GPIO.input(MQ2)
    mq2_status = (mq2_val == MQ2_ALARM_LEVEL)

    distance = read_ultrasonic()

    if time.time() - last_dht_read >= 2.0:
        read_dht()
        last_dht_read = time.time()

    if time.time() - last_adxl_read >= 0.2:
        read_adxl()
        last_adxl_read = time.time()

    magnitude = math.sqrt(acc_x ** 2 + acc_y ** 2 + acc_z ** 2)
    vault_movement = (abs(magnitude - 1.0) > ACCEL_MOVEMENT_THRESHOLD)

    # Periodic continuous stream to backend website (every 0.5s)
    if time.time() - last_stream_time >= 0.5:
        emit_safe('pi:heartbeat', {'timestamp': time.time()})
        emit_safe('pi:pir', {'state': 'MOTION_DETECTED' if pir_status else 'NO_MOTION'})
        emit_safe('pi:mq2', {'rawAdc': 750 if mq2_status else 150, 'digitalState': 'DETECTED' if mq2_status else 'NORMAL'})
        if distance is not None:
            emit_safe('pi:ultrasonic', {'distanceCm': distance})
        emit_safe('pi:adxl335', {
            'x': acc_x,
            'y': acc_y,
            'z': acc_z,
            'movementState': 'POSSIBLE_TAMPERING' if vault_movement else 'STABLE'
        })
        last_stream_time = time.time()

    # Alerts
    alerts = []
    if mq2_status:
        alerts.append("SMOKE/GAS ALERT")
    if pir_status:
        alerts.append("MOTION DETECTED")
    if vault_movement:
        alerts.append("VAULT MOVEMENT DETECTED")

    if alerts:
        alert_message = " | ".join(alerts)
        alert_signal()
    else:
        alert_message = "SYSTEM NORMAL"
        normal_signal()

def automatic_locking():
    # Only bank entrance auto-locks after AUTO_LOCK_SECONDS
    if bank_unlocked and (time.time() - bank_lock_time >= AUTO_LOCK_SECONDS):
        lock_bank()
    # Vault does NOT auto-lock; it is manually controlled from the website (Request Unlock / Secure Vault)

def display_dashboard():
    os.system("clear")
    print("=" * 65)
    print("      IOT BANKGUARD SYSTEM - PI CONTROLLER & WEB BRIDGE")
    print("=" * 65)
    print(f"Backend Server    : http://{BACKEND_HOST}:{BACKEND_PORT}")
    print(f"Socket Status     : {'CONNECTED' if sio.connected else 'DISCONNECTED / RETRYING'}")
    print("-" * 65)
    print("Temperature       :", f"{temperature} C" if temperature is not None else "--")
    print("Humidity          :", f"{humidity} %" if humidity is not None else "--")
    print("MQ2 Gas Alert     :", "YES (GAS DETECTED)" if mq2_status else "NO (NORMAL)")
    print("PIR Motion        :", "DETECTED" if pir_status else "NO MOTION")
    print("Ultrasonic        :", f"{distance} cm" if distance is not None else "NO ECHO")
    print(f"ADXL345 (X, Y, Z) : ({acc_x}g, {acc_y}g, {acc_z}g)")
    print("Vault Movement    :", "DETECTED" if vault_movement else "NORMAL")
    print("-" * 65)
    print("Bank Entrance Door:", "UNLOCKED" if bank_unlocked else "LOCKED")
    print("Vault Door        :", "UNLOCKED" if vault_unlocked else "LOCKED")
    print("Last RFID Event   :", access_message)
    print("System Alert      :", alert_message)
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

        print("Starting Bank Security System with Web Bridge...")
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
            if dht:
                dht.exit()
            if reader:
                reader.READER.Close_MFRC522()
        except Exception:
            pass
        GPIO.cleanup()
        print("BankGuard stopped safely.")
