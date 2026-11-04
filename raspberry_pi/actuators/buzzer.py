import time

class BuzzerActuator:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.pin = config.get('pin')
        self._gpio = None

        if self.enabled and self.pin != "TODO":
            try:
                import RPi.GPIO as GPIO
                self._gpio = GPIO
                self._gpio.setmode(GPIO.BCM)
                self._gpio.setup(int(self.pin), GPIO.OUT)
                self._gpio.output(int(self.pin), False)
            except Exception:
                pass

    def beep(self, duration_s=0.2):
        if self._gpio and self.pin != "TODO":
            self._gpio.output(int(self.pin), True)
            time.sleep(duration_s)
            self._gpio.output(int(self.pin), False)

    def on(self):
        if self._gpio and self.pin != "TODO":
            self._gpio.output(int(self.pin), True)

    def off(self):
        if self._gpio and self.pin != "TODO":
            self._gpio.output(int(self.pin), False)

    def cleanup(self):
        if self._gpio and self.pin != "TODO":
            self._gpio.output(int(self.pin), False)

