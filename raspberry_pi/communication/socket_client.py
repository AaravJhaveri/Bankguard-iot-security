import socketio
import asyncio
import logging

logger = logging.getLogger(__name__)

class BankGuardSocketClient:
    def __init__(self, host="127.0.0.1", port=5000, secret="bankguard_pi_secret_token_12345", device_id="bankguard_pi_01", reconnect_delay_s=5):
        self.url = f"http://{host}:{port}"
        self.secret = secret
        self.device_id = device_id
        self.reconnect_delay_s = reconnect_delay_s
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_delay=reconnect_delay_s,
            reconnection_delay_max=30
        )
        self._setup_handlers()

    def _setup_handlers(self):
        @self.sio.event
        async def connect():
            logger.info(f"[Socket] Connected to BankGuard backend at {self.url}")
            await self.sio.emit('pi:connect', {
                'secret': self.secret,
                'deviceId': self.device_id
            })

        @self.sio.event
        async def disconnect():
            logger.warning("[Socket] Disconnected from BankGuard backend")

        @self.sio.event
        async def connect_error(data):
            logger.error(f"[Socket] Connection failed: {data}")

    def on_command(self, event_name, callback):
        """Register a handler for backend commands (e.g. cmd:vault_servo)."""
        self.sio.on(event_name, callback)

    async def connect(self):
        try:
            logger.info(f"Connecting to {self.url}...")
            await self.sio.connect(self.url, headers={'x-device-type': 'pi'})
        except Exception as e:
            logger.error(f"Initial connection error: {e}")

    async def emit(self, event, data):
        if self.sio.connected:
            try:
                await self.sio.emit(event, data)
            except Exception as e:
                logger.error(f"Failed to emit {event}: {e}")
        else:
            logger.debug(f"Cannot emit {event}: socket not connected")

    async def disconnect(self):
        if self.sio.connected:
            await self.sio.disconnect()

