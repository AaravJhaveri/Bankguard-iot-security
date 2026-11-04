const jwt = require('jsonwebtoken');
const sensorState = require('../services/sensorState');

function setupClientSocket(io, socket) {
  // Frontend client connects
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'bankguard_super_secure_jwt_secret_key_2026_xyz'
      );
      socket.user = decoded;
    } catch (err) {
      // Allow connection but with unauthenticated status
      socket.user = null;
    }
  }

  // Send initial state snapshot upon connection
  socket.emit('sensor:update', sensorState.getState());
  socket.emit('pi:status', {
    connected: sensorState.getState().piConnected,
    lastSeen: sensorState.getState().piLastSeen,
  });
  socket.emit('system:monitoring_mode', {
    mode: sensorState.getState().monitoringMode,
  });
}

module.exports = { setupClientSocket };

