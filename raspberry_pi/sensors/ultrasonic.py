import time

class SensorReadError(Exception):
    pass

class UltrasonicSensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.trig = config.get('trigger_pin')
        self.echo = config.get('echo_pin')
        self._gpio = None

        if self.enabled and self.trig != "TODO" and self.echo != "TODO":
            try:
                import RPi.GPIO as GPIO
                self._gpio = GPIO
                self._gpio.setmode(GPIO.BCM)
                self._gpio.setup(int(self.trig), GPIO.OUT)
                self._gpio.setup(int(self.echo), GPIO.IN)
                self._gpio.output(int(self.trig), False)
            except Exception:
                pass

    def read(self):
        if not self.enabled or self.trig == "TODO" or self.echo == "TODO" or not self._gpio:
            raise SensorReadError("Ultrasonic sensor pins are not configured.")

        try:
            # Trigger pulse
            self._gpio.output(int(self.trig), True)
            time.sleep(0.00001)
            self._gpio.output(int(self.trig), False)

            pulse_start = time.time()
            pulse_end = time.time()

            timeout = time.time() + 0.05
            while self._gpio.input(int(self.echo)) == 0:
                pulse_start = time.time()
                if pulse_start > timeout:
                    raise SensorReadError("Ultrasonic sensor echo timeout (low).")

            timeout = time.time() + 0.05
            while self._gpio.input(int(self.echo)) == 1:
                pulse_end = time.time()
                if pulse_end > timeout:
                    raise SensorReadError("Ultrasonic sensor echo timeout (high).")

            pulse_duration = pulse_end - pulse_start
            distance = round(pulse_duration * 17150, 1)  # speed of sound = 343m/s -> 17150 cm/s
            return {"distanceCm": distance}
        except Exception as e:
            raise SensorReadError(f"Ultrasonic read error: {e}")

    def cleanup(self):
        pass

