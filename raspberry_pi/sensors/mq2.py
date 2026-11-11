class SensorReadError(Exception):
    pass

class MQ2Sensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.channel = config.get('adc_channel', None)
        self.digital_pin = config.get('pin', None)
        self.spi = None
        self._gpio = None

        if self.enabled:
            # Mode A: Digital pin reading (DO pin directly connected to Raspberry Pi GPIO)
            if self.digital_pin is not None and self.digital_pin != "TODO":
                try:
                    import RPi.GPIO as GPIO
                    self._gpio = GPIO
                    self._gpio.setmode(GPIO.BCM)
                    self._gpio.setup(int(self.digital_pin), GPIO.IN)
                except Exception:
                    pass

            # Mode B: Analog via MCP3008 ADC SPI (if adc_channel is configured)
            if self.channel is not None and self.channel != "TODO":
                try:
                    import spidev
                    self.spi = spidev.SpiDev()
                    self.spi.open(0, 0)
                    self.spi.max_speed_hz = 1350000
                except Exception:
                    pass

    def read(self):
        if not self.enabled:
            raise SensorReadError("MQ-2 sensor is disabled in config.")

        # If connected directly via digital GPIO pin
        if self._gpio and self.digital_pin is not None:
            try:
                # Most digital MQ2 modules output LOW (0) when gas is detected, HIGH (1) when clean
                val = self._gpio.input(int(self.digital_pin))
                # Map to rawAdc range for website consistency: 750 (Gas detected) vs 150 (Clean)
                raw_adc = 750 if val == 0 else 150
                return {"rawAdc": raw_adc, "digitalState": "DETECTED" if val == 0 else "NORMAL"}
            except Exception as e:
                raise SensorReadError(f"MQ-2 digital read error: {e}")

        # If connected via MCP3008 ADC SPI
        if self.spi and self.channel is not None:
            try:
                adc = self.spi.xfer2([1, (8 + int(self.channel)) << 4, 0])
                raw_adc = ((adc[1] & 3) << 8) + adc[2]
                return {"rawAdc": int(raw_adc)}
            except Exception as e:
                raise SensorReadError(f"MQ-2 ADC read error: {e}")

        raise SensorReadError("MQ-2 sensor neither configured on digital GPIO pin nor MCP3008 ADC.")

    def cleanup(self):
        if self.spi:
            self.spi.close()

