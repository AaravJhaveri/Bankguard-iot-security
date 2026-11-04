const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireManager } = require('../middleware/roleCheck');
const sensorState = require('../services/sensorState');
const ActuatorCommand = require('../models/ActuatorCommand');
const { createEvent } = require('../services/eventService');
const { openWindow } = require('../services/authorizationWindow');

module.exports = (io) => {
  // POST /api/actuators/entrance/unlock
  router.post('/entrance/unlock', authMiddleware, requireManager, async (req, res) => {
    try {
      const command = await ActuatorCommand.create({
        target: 'ENTRANCE_SERVO',
        command: 'UNLOCK',
        issuedBy: req.user.id,
        result: 'SENT',
        note: req.body.note || 'Manager unlocked entrance.',
      });

      openWindow('ENTRANCE', req.user.employeeId, req.user.id, 30000);

      sensorState.updateSensor('entranceServo', {
        lastCommand: 'UNLOCK',
        commandResult: 'SENT',
      });

      if (io) {
        io.emit('cmd:entrance_servo', { command: 'UNLOCK', commandId: command._id });
      }

      await createEvent({
        category: 'SERVO_COMMAND',
        description: `Manager ${req.user.name} issued ENTRANCE UNLOCK.`,
        source: 'ENTRANCE_ACTUATOR',
        employeeRef: req.user.id,
        severity: 'INFO',
      });

      return res.json({ success: true, message: 'Entrance unlock command dispatched.', commandId: command._id });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to dispatch entrance unlock command.' });
    }
  });

  // POST /api/actuators/entrance/lock
  router.post('/entrance/lock', authMiddleware, requireManager, async (req, res) => {
    try {
      const command = await ActuatorCommand.create({
        target: 'ENTRANCE_SERVO',
        command: 'LOCK',
        issuedBy: req.user.id,
        result: 'SENT',
        note: req.body.note || 'Manager locked entrance.',
      });

      sensorState.updateSensor('entranceServo', {
        lastCommand: 'LOCK',
        commandResult: 'SENT',
      });

      if (io) {
        io.emit('cmd:entrance_servo', { command: 'LOCK', commandId: command._id });
      }

      await createEvent({
        category: 'SERVO_COMMAND',
        description: `Manager ${req.user.name} issued ENTRANCE LOCK.`,
        source: 'ENTRANCE_ACTUATOR',
        employeeRef: req.user.id,
        severity: 'INFO',
      });

      return res.json({ success: true, message: 'Entrance lock command dispatched.', commandId: command._id });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to dispatch entrance lock command.' });
    }
  });

  // GET /api/actuators/history
  router.get('/history', authMiddleware, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const commands = await ActuatorCommand.find({})
        .populate('issuedBy', 'name employeeId')
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await ActuatorCommand.countDocuments({});

      return res.json({
        data: commands,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch actuator history.' });
    }
  });

  return router;
};

