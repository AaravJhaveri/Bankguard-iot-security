const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const sensorState = require('../services/sensorState');
const EventLog = require('../models/EventLog');

// GET /api/sensors/live - Current in-memory live status
router.get('/live', authMiddleware, (req, res) => {
  return res.json(sensorState.getState());
});

// GET /api/sensors/health - Formatted status for Sensor Health dashboard
router.get('/health', authMiddleware, (req, res) => {
  const s = sensorState.getState();
  const healthList = [
    { id: 'rfid', name: 'RC522 RFID Reader', zone: 'Bank Branch', status: s.rfid.status, lastUpdate: s.rfid.lastUpdate, details: s.rfid.lastScan ? `Last UID: ${s.rfid.lastScan.uid}` : 'No scans yet' },
    { id: 'entranceReed', name: 'Entrance Reed Switch', zone: 'Bank Branch', status: s.entranceReed.status, lastUpdate: s.entranceReed.lastUpdate, state: s.entranceReed.state },
    { id: 'ultrasonic', name: 'Entrance Ultrasonic Sensor', zone: 'Bank Branch', status: s.ultrasonic.status, lastUpdate: s.ultrasonic.lastUpdate, details: s.ultrasonic.distanceCm ? `${s.ultrasonic.distanceCm} cm` : 'N/A' },
    { id: 'entranceServo', name: 'Entrance Servo Lock', zone: 'Bank Branch', status: s.entranceServo.lastCommand ? 'ONLINE' : 'UNKNOWN', lastUpdate: s.entranceServo.lastUpdate, state: s.entranceServo.lastCommand || 'N/A' },
    { id: 'dht11', name: 'DHT11 Temp & Humidity', zone: 'Vault', status: s.dht11.status, lastUpdate: s.dht11.lastUpdate, details: s.dht11.temperature != null ? `${s.dht11.temperature}°C / ${s.dht11.humidity}%RH` : 'N/A' },
    { id: 'mq2', name: 'MQ-2 Smoke/Gas Sensor', zone: 'Vault', status: s.mq2.status, lastUpdate: s.mq2.lastUpdate, details: s.mq2.rawAdc != null ? `ADC: ${s.mq2.rawAdc}` : 'N/A' },
    { id: 'pir', name: 'PIR Motion Sensor', zone: 'Vault', status: s.pir.status, lastUpdate: s.pir.lastUpdate, state: s.pir.state },
    { id: 'adxl335', name: 'ADXL335 Accelerometer', zone: 'Vault', status: s.adxl335.status, lastUpdate: s.adxl335.lastUpdate, details: s.adxl335.movementState },
    { id: 'vaultReed', name: 'Vault Reed Switch', zone: 'Vault', status: s.vaultReed.status, lastUpdate: s.vaultReed.lastUpdate, state: s.vaultReed.state },
    { id: 'vaultServo', name: 'Vault Servo Lock', zone: 'Vault', status: s.vaultServo.lastCommand ? 'ONLINE' : 'UNKNOWN', lastUpdate: s.vaultServo.lastUpdate, state: s.vaultServo.lastCommand || 'N/A' },
    { id: 'raspberryPi', name: 'Raspberry Pi Controller', zone: 'System', status: s.piConnected ? 'ONLINE' : 'OFFLINE', lastUpdate: s.piLastSeen, details: s.piConnected ? 'Active Connection' : 'Disconnected' },
  ];

  return res.json(healthList);
});

// GET /api/sensors/:sensorId/history - Event logs related to this sensor
router.get('/:sensorId/history', authMiddleware, async (req, res) => {
  try {
    const { sensorId } = req.params;
    const events = await EventLog.find({ source: { $regex: sensorId, $options: 'i' } })
      .sort({ timestamp: -1 })
      .limit(50);
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve sensor history.' });
  }
});

module.exports = router;

