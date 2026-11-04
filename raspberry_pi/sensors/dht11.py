import logging

logger = logging.getLogger(__name__)

class SensorReadError(Exception):
    pass

class DHT11Sensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.pin = config.get('pin')
        self._sensor = None
        if self.enabled and self.pin != "TODO":
            try:
                import Adafruit_DHT
                self._sensor = Adafruit_DHT.DHT11
            except ImportError:
                logger.warning("Adafruit_DHT library not found. DHT11 running in uninitialized mode.")

    def read(self):
        if not self.enabled or self.pin == "TODO" or not self._sensor:
            raise SensorReadError("DHT11 is not configured or driver unavailable.")
        try:
            import Adafruit_DHT
            humidity, temperature = Adafruit_DHT.read_retry(self._sensor, int(self.pin))
            if humidity is None or temperature is None:
                raise SensorReadError("Failed to retrieve valid reading from DHT11.")
            return {
                "temperature": round(float(temperature), 1),
                "humidity": round(float(humidity), 1)
            }
        except Exception as e:
            raise SensorReadError(f"DHT11 read exception: {e}")

    def cleanup(self):
        pass

