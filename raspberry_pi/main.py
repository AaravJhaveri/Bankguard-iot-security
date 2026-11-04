import asyncio
import yaml
import logging
import signal
import sys
from datetime import datetime

from communication.socket_client import BankGuardSocketClient
from sensors.dht11 import DHT11Sensor, SensorReadError
from sensors.mq2 import MQ2Sensor
from sensors.pir import PIRSensor
from sensors.reed_switch import ReedSwitchSensor
from sensors.ultrasonic import UltrasonicSensor
from sensors.adxl335 import ADXL335Sensor
from sensors.rfid_rc522 import RFIDRC522Sensor
from actuators.servo import ServoActuator
from actuators.buzzer import BuzzerActuator
from actuators.led import LEDActuator

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger("BankGuard-Pi")

def load_config():
    try:
        with open('config.yaml', 'r') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        logger.warning("config.yaml not found. Falling back to config.example.yaml")
        with open('config.example.yaml', 'r') as f:
            return yaml.safe_load(f)

async def main():
    config = load_config()
    b_conf = config.get('backend', {})
    s_conf = config.get('sensors', {})
    a_conf = config.get('actuators', {})

    client = BankGuardSocketClient(
        host=b_conf.get('host', '127.0.0.1'),
        port=b_conf.get('port', 5000),
        secret=b_conf.get('secret', 'bankguard_pi_secret_token_12345'),
        device_id=b_conf.get('device_id', 'bankguard_pi_01'),
        reconnect_delay_s=b_conf.get('reconnect_delay_s', 5)
    )

    # Instantiate sensors
    dht11 = DHT11Sensor(s_conf.get('dht11', {}))
    mq2 = MQ2Sensor(s_conf.get('mq2', {}))
    pir = PIRSensor(s_conf.get('pir', {}))
    reed_entrance = ReedSwitchSensor(s_conf.get('reed_entrance', {}))
    reed_vault = ReedSwitchSensor(s_conf.get('reed_vault', {}))
    ultrasonic = UltrasonicSensor(s_conf.get('ultrasonic', {}))
    adxl335 = ADXL335Sensor(s_conf.get('adxl335', {}))
    rfid = RFIDRC522Sensor(s_conf.get('rfid_rc522', {}))

    # Instantiate actuators
    entrance_servo = ServoActuator(a_conf.get('entrance_servo', {}))
    vault_servo = ServoActuator(a_conf.get('vault_servo', {}))
    buzzer = BuzzerActuator(a_conf.get('buzzer', {}))
    led_green = LEDActuator(a_conf.get('status_led_green', {}))
    led_red = LEDActuator(a_conf.get('status_led_red', {}))

    # Register Actuator Command Handlers
    def handle_entrance_servo(data):
        cmd = data.get('command')
        logger.info(f"Received Entrance Servo Command: {cmd}")
        if cmd == 'UNLOCK':
            entrance_servo.unlock()
        else:
            entrance_servo.lock()

    def handle_vault_servo(data):
        cmd = data.get('command')
        logger.info(f"Received Vault Servo Command: {cmd}")
        if cmd == 'UNLOCK':
            vault_servo.unlock()
        else:
            vault_servo.lock()

    client.on_command('cmd:entrance_servo', handle_entrance_servo)
    client.on_command('cmd:vault_servo', handle_vault_servo)

    await client.connect()

    # Heartbeat task
    async def heartbeat_loop():
        while True:
            await client.emit('pi:heartbeat', {'timestamp': datetime.utcnow().isoformat()})
            await asyncio.sleep(10)

    # Periodic sensor tasks
    async def dht11_loop():
        interval = s_conf.get('dht11', {}).get('poll_interval_s', 10)
        while True:
            try:
                data = dht11.read()
                await client.emit('pi:dht11', {
                    'temperature': data['temperature'],
                    'humidity': data['humidity'],
                    'timestamp': datetime.utcnow().isoformat()
                })
            except SensorReadError as e:
                logger.debug(f"DHT11: {e}")
            await asyncio.sleep(interval)

    async def mq2_loop():
        interval = s_conf.get('mq2', {}).get('poll_interval_s', 2)
        while True:
            try:
                data = mq2.read()
                await client.emit('pi:mq2', {
                    'rawAdc': data['rawAdc'],
                    'timestamp': datetime.utcnow().isoformat()
                })
            except SensorReadError as e:
                logger.debug(f"MQ2: {e}")
            await asyncio.sleep(interval)

    async def reed_entrance_loop():
        last_state = None
        while True:
            try:
                data = reed_entrance.read()
                if data['state'] != last_state:
                    last_state = data['state']
                    await client.emit('pi:reed_entrance', {
                        'state': data['state'],
                        'timestamp': datetime.utcnow().isoformat()
                    })
            except SensorReadError:
                pass
            await asyncio.sleep(0.5)

    async def reed_vault_loop():
        last_state = None
        while True:
            try:
                data = reed_vault.read()
                if data['state'] != last_state:
                    last_state = data['state']
                    await client.emit('pi:reed_vault', {
                        'state': data['state'],
                        'timestamp': datetime.utcnow().isoformat()
                    })
            except SensorReadError:
                pass
            await asyncio.sleep(0.5)

    async def pir_loop():
        last_state = None
        while True:
            try:
                data = pir.read()
                if data['state'] != last_state:
                    last_state = data['state']
                    await client.emit('pi:pir', {
                        'state': data['state'],
                        'timestamp': datetime.utcnow().isoformat()
                    })
            except SensorReadError:
                pass
            await asyncio.sleep(0.5)

    async def ultrasonic_loop():
        interval = s_conf.get('ultrasonic', {}).get('poll_interval_s', 1)
        while True:
            try:
                data = ultrasonic.read()
                await client.emit('pi:ultrasonic', {
                    'distanceCm': data['distanceCm'],
                    'timestamp': datetime.utcnow().isoformat()
                })
            except SensorReadError:
                pass
            await asyncio.sleep(interval)

    async def adxl335_loop():
        interval = s_conf.get('adxl335', {}).get('poll_interval_s', 0.5)
        while True:
            try:
                data = adxl335.read()
                await client.emit('pi:adxl335', {
                    'x': data['x'],
                    'y': data['y'],
                    'z': data['z'],
                    'timestamp': datetime.utcnow().isoformat()
                })
            except SensorReadError:
                pass
            await asyncio.sleep(interval)

    async def rfid_loop():
        last_scan = None
        while True:
            try:
                card = rfid.read_no_block()
                if card and card.get('uid') != last_scan:
                    last_scan = card.get('uid')
                    await client.emit('pi:rfid_scan', {
                        'uid': last_scan,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    # Reset last_scan after short delay so same card can be presented again
                    await asyncio.sleep(2)
                    last_scan = None
            except SensorReadError:
                pass
            await asyncio.sleep(0.2)

    logger.info("BankGuard Raspberry Pi polling loops started.")
    await asyncio.gather(
        heartbeat_loop(),
        dht11_loop(),
        mq2_loop(),
        reed_entrance_loop(),
        reed_vault_loop(),
        pir_loop(),
        ultrasonic_loop(),
        adxl335_loop(),
        rfid_loop()
    )

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("BankGuard Pi client terminated by operator.")

