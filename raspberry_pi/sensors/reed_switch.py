class SensorReadError(Exception):
    pass

class ReedSwitchSensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.pin = config.get('pin')
        self._gpio = None

        if self.enabled and self.pin != "TODO":
            try:
                import RPi.GPIO as GPIO
                self._gpio = GPIO
                self._gpio.setmode(GPIO.BCM)
                self._gpio.setup(int(self.pin), GPIO.IN, pull_up_down=GPIO.PUD_UP)
            except Exception:
                pass

    def read(self):
        if not self.enabled or self.pin == "TODO" or not self._gpio:
            raise SensorReadError("Reed switch is not configured or GPIO unavailable.")

        try:
            val = self._gpio.input(int(self.pin))
            # Standard magnetic reed switch: HIGH when magnet separated (OPEN)
            return {"state": "OPEN" if val == 1 else "CLOSED"}
        except Exception as e:
            raise SensorReadError(f"Reed switch read error: {e}")

    def cleanup(self):
        pass

