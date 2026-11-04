class SensorReadError(Exception):
    pass

class RFIDRC522Sensor:
    def __init__(self, config):
        self.enabled = config.get('enabled', False)
        self.reader = None

        if self.enabled:
            try:
                from mfrc522 import SimpleMFRC522
                self.reader = SimpleMFRC522()
            except Exception:
                pass

    def read_no_block(self):
        if not self.enabled or not self.reader:
            return None

        try:
            # Check if card is present without blocking execution
            card_id, text = self.reader.read_no_block()
            if card_id:
                # Return UID formatted as hex string
                return {"uid": hex(card_id).upper().replace('0X', '')}
            return None
        except Exception as e:
            raise SensorReadError(f"RFID reader error: {e}")

    def cleanup(self):
        pass

