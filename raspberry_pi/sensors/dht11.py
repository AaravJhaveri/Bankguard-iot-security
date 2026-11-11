import logging

logger = logging.getLogger(__name__)

class SensorReadError(Exception):
    pass

class DHT11Sensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.pin = config.get('pin')
        self._device = None
        self._legacy_sensor = None

        if self.enabled and self.pin != "TODO":
            # Attempt 1: Modern adafruit_dht + board library
            try:
                import board
                import adafruit_dht
                board_pin = getattr(board, f"D{self.pin}", None)
                if board_pin:
                    self._device = adafruit_dht.DHT11(board_pin)
                    logger.info("Initialized DHT11 using adafruit_dht driver.")
            except ImportError:
                pass
            except Exception as e:
                logger.warning(f"Could not initialize adafruit_dht: {e}")

            # Attempt 2: Fallback to legacy Adafruit_DHT
            if not self._device:
                try:
                    import Adafruit_DHT
                    self._legacy_sensor = Adafruit_DHT.DHT11
                    logger.info("Initialized DHT11 using legacy Adafruit_DHT driver.")
                except ImportError:
                    logger.warning("Neither adafruit_dht nor Adafruit_DHT library found.")

    def read(self):
        if not self.enabled or self.pin == "TODO":
            raise SensorReadError("DHT11 is disabled or pin not configured.")

        # Try adafruit_dht first
        if self._device:
            try:
                temp = self._device.temperature
                hum = self._device.humidity
                if temp is not None and hum is not None:
                    return {"temperature": round(float(temp), 1), "humidity": round(float(hum), 1)}
            except RuntimeError as e:
                # DHT reading often raises transient RuntimeError on Pi, normal to retry next loop
                raise SensorReadError(f"DHT11 transient reading error: {e}")
            except Exception as e:
                raise SensorReadError(f"DHT11 error: {e}")

        # Try legacy Adafruit_DHT
        if self._legacy_sensor:
            try:
                import Adafruit_DHT
                humidity, temperature = Adafruit_DHT.read_retry(self._legacy_sensor, int(self.pin))
                if humidity is not None and temperature is not None:
                    return {
                        "temperature": round(float(temperature), 1),
                        "humidity": round(float(humidity), 1)
                    }
                raise SensorReadError("Failed to retrieve valid reading from DHT11.")
            except Exception as e:
                raise SensorReadError(f"DHT11 read exception: {e}")

        raise SensorReadError("No operational DHT11 driver available on this platform.")

    def cleanup(self):
        if self._device:
            try:
                self._device.exit()
            except Exception:
                pass


