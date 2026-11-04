class SensorReadError(Exception):
    pass

class MQ2Sensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.channel = config.get('adc_channel', 0)
        self.spi = None

        if self.enabled:
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
        if not self.spi:
            raise SensorReadError("SPI interface not available for MQ-2 ADC reading.")

        try:
            # Read MCP3008 ADC channel
            adc = self.spi.xfer2([1, (8 + int(self.channel)) << 4, 0])
            raw_adc = ((adc[1] & 3) << 8) + adc[2]
            return {"rawAdc": int(raw_adc)}
        except Exception as e:
            raise SensorReadError(f"MQ-2 read error: {e}")

    def cleanup(self):
        if self.spi:
            self.spi.close()

