class SensorReadError(Exception):
    pass

class ADXL335Sensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.ch_x = config.get('adc_channel_x', 1)
        self.ch_y = config.get('adc_channel_y', 2)
        self.ch_z = config.get('adc_channel_z', 3)
        self.spi = None

        if self.enabled:
            try:
                import spidev
                self.spi = spidev.SpiDev()
                self.spi.open(0, 0)
                self.spi.max_speed_hz = 1350000
            except Exception:
                pass

    def _read_channel(self, channel):
        adc = self.spi.xfer2([1, (8 + int(channel)) << 4, 0])
        return ((adc[1] & 3) << 8) + adc[2]

    def read(self):
        if not self.enabled or not self.spi:
            raise SensorReadError("ADXL335 ADC interface unavailable.")

        try:
            raw_x = self._read_channel(self.ch_x)
            raw_y = self._read_channel(self.ch_y)
            raw_z = self._read_channel(self.ch_z)

            # Approximate g-force conversion for 3.3V ADC and ADXL335 (330mV/g)
            # Center zero-g voltage is ~1.65V (approx raw ADC 512)
            gx = round((raw_x - 512) / 102.3, 2)
            gy = round((raw_y - 512) / 102.3, 2)
            gz = round((raw_z - 512) / 102.3, 2)

            return {"x": gx, "y": gy, "z": gz}
        except Exception as e:
            raise SensorReadError(f"ADXL335 read error: {e}")

    def cleanup(self):
        if self.spi:
            self.spi.close()

