const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireManager } = require('../middleware/roleCheck');
const sensorState = require('../services/sensorState');
const ActuatorCommand = require('../models/ActuatorCommand');
const { createEvent } = require('../services/eventService');
const { openWindow } = require('../services/authorizationWindow');

module.exports = (io) => {
  // GET /api/vault/status - Vault current in-memory status
  router.get('/status', authMiddleware, (req, res) => {
    const state = sensorState.getState();
    return res.json({
      vaultReed: state.vaultReed,
      vaultServo: state.vaultServo,
      pir: state.pir,
      adxl335: state.adxl335,
      dht11: state.dht11,
      mq2: state.mq2,
    });
  });

  // POST /api/vault/unlock - Manager only
  router.post('/unlock', authMiddleware, requireManager, async (req, res) => {
    try {
      const command = await ActuatorCommand.create({
        target: 'VAULT_SERVO',
        command: 'UNLOCK',
        issuedBy: req.user.id,
        result: 'SENT',
        note: req.body.note || 'Manager requested vault unlock.',
      });

      // Grant a temporary authorized window for the vault door opening
      openWindow('VAULT', req.user.employeeId, req.user.id, 60000);

      sensorState.updateSensor('vaultServo', {
        lastCommand: 'UNLOCK',
        commandResult: 'SENT',
      });

      if (io) {
        io.emit('cmd:vault_servo', { command: 'UNLOCK', commandId: command._id });
      }

      await createEvent({
        category: 'VAULT_ACCESS',
        description: `Manager ${req.user.name} (${req.user.employeeId}) authorized Vault Unlock.`,
        source: 'VAULT_CONTROL',
        employeeRef: req.user.id,
        severity: 'WARNING',
      });

      return res.json({ success: true, message: 'Vault unlock command sent to Raspberry Pi.', commandId: command._id });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to issue vault unlock command.' });
    }
  });

  // POST /api/vault/lock - Manager only
  router.post('/lock', authMiddleware, requireManager, async (req, res) => {
    try {
      const command = await ActuatorCommand.create({
        target: 'VAULT_SERVO',
        command: 'LOCK',
        issuedBy: req.user.id,
        result: 'SENT',
        note: req.body.note || 'Manager requested vault lock.',
      });

      sensorState.updateSensor('vaultServo', {
        lastCommand: 'LOCK',
        commandResult: 'SENT',
      });

      if (io) {
        io.emit('cmd:vault_servo', { command: 'LOCK', commandId: command._id });
      }

      await createEvent({
        category: 'VAULT_ACCESS',
        description: `Manager ${req.user.name} locked the Vault servo.`,
        source: 'VAULT_CONTROL',
        employeeRef: req.user.id,
        severity: 'INFO',
      });

      return res.json({ success: true, message: 'Vault lock command sent to Raspberry Pi.', commandId: command._id });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to issue vault lock command.' });
    }
  });

  return router;
};

