class SensorReadError(Exception):
    pass

class PIRSensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.pin = config.get('pin')
        self._gpio = None

        if self.enabled and self.pin != "TODO":
            try:
                import RPi.GPIO as GPIO
                self._gpio = GPIO
                self._gpio.setmode(GPIO.BCM)
                self._gpio.setup(int(self.pin), GPIO.IN)
            except Exception:
                pass

    def read(self):
        if not self.enabled or self.pin == "TODO" or not self._gpio:
            raise SensorReadError("PIR sensor is not configured or GPIO unavailable.")

        try:
            val = self._gpio.input(int(self.pin))
            return {"state": "MOTION_DETECTED" if val == 1 else "NO_MOTION"}
        except Exception as e:
            raise SensorReadError(f"PIR read error: {e}")

    def cleanup(self):
        pass

