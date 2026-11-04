import time

class ServoActuator:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.pin = config.get('pin')
        self.lock_angle = config.get('lock_angle', 0)
        self.unlock_angle = config.get('unlock_angle', 90)
        self._pwm = None

        if self.enabled and self.pin != "TODO":
            try:
                import RPi.GPIO as GPIO
                GPIO.setmode(GPIO.BCM)
                GPIO.setup(int(self.pin), GPIO.OUT)
                self._pwm = GPIO.PWM(int(self.pin), 50)  # 50 Hz PWM
                self._pwm.start(0)
            except Exception:
                pass

    def _angle_to_duty(self, angle):
        return 2.5 + (angle / 18.0)

    def lock(self):
        if self._pwm:
            duty = self._angle_to_duty(self.lock_angle)
            self._pwm.ChangeDutyCycle(duty)
            time.sleep(0.3)
            self._pwm.ChangeDutyCycle(0)
            return True
        return False

    def unlock(self):
        if self._pwm:
            duty = self._angle_to_duty(self.unlock_angle)
            self._pwm.ChangeDutyCycle(duty)
            time.sleep(0.3)
            self._pwm.ChangeDutyCycle(0)
            return True
        return False

    def cleanup(self):
        if self._pwm:
            self._pwm.stop()

