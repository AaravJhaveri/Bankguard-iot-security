require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const sensorState = require('./services/sensorState');
const { setAlertIo } = require('./services/alertService');
const { setEventIo } = require('./services/eventService');
const { loadSettings } = require('./services/thresholdCheck');
const { setupPiSocket } = require('./socket/piHandler');
const { setupClientSocket } = require('./socket/clientHandler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Attach io to services that emit broadcasts
sensorState.setIo(io);
setAlertIo(io);
setEventIo(io);

// Express Middleware
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// Mount API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/events'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/vault', require('./routes/vault')(io));
app.use('/api/actuators', require('./routes/actuators')(io));
app.use('/api/sensors', require('./routes/sensors'));
app.use('/api/system', require('./routes/system'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'BankGuard Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO Connection multiplexing
io.on('connection', (socket) => {
  // Check if connection is from Raspberry Pi or frontend client
  const isPi = socket.handshake.query?.role === 'pi' || socket.handshake.headers['x-device-type'] === 'pi';

  if (isPi) {
    setupPiSocket(io, socket);
  } else {
    // Also listen for pi:connect in case Raspberry Pi connects as default client
    setupPiSocket(io, socket);
    setupClientSocket(io, socket);
  }
});

const PORT = process.env.PORT || 5000;

// Connect DB & start listening
connectDB().then(async () => {
  await loadSettings();
  server.listen(PORT, () => {
    console.log(`[BankGuard Backend] Server running on port ${PORT}`);
    console.log(`[BankGuard Backend] Accepting frontend connections from ${process.env.FRONTEND_ORIGIN || 'http://localhost:5173'}`);
  });
});

module.exports = { app, server, io };
