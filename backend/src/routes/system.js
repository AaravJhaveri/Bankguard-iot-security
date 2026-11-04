const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireManager } = require('../middleware/roleCheck');
const SystemSetting = require('../models/SystemSetting');
const sensorState = require('../services/sensorState');
const { updateCachedSetting, getCachedSettings } = require('../services/thresholdCheck');
const { createEvent } = require('../services/eventService');

// GET /api/system/status
router.get('/status', authMiddleware, (req, res) => {
  const state = sensorState.getState();
  return res.json({
    monitoringMode: state.monitoringMode,
    piConnected: state.piConnected,
    piLastSeen: state.piLastSeen,
    timestamp: new Date().toISOString(),
  });
});

// PUT /api/system/monitoring-mode - Manager only
router.put('/monitoring-mode', authMiddleware, requireManager, async (req, res) => {
  try {
    const { mode, confirmed } = req.body;
    if (!['ON', 'MAINTENANCE'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be ON or MAINTENANCE.' });
    }
    if (!confirmed) {
      return res.status(400).json({ error: 'Explicit user confirmation is required to change monitoring mode.' });
    }

    sensorState.setMonitoringMode(mode);

    await createEvent({
      category: 'MONITORING_MODE',
      description: `Manager ${req.user.name} switched monitoring mode to ${mode}.`,
      source: 'SETTINGS_PORTAL',
      employeeRef: req.user.id,
      severity: mode === 'MAINTENANCE' ? 'WARNING' : 'INFO',
    });

    return res.json({ success: true, mode });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update monitoring mode.' });
  }
});

// GET /api/system/settings - List all settings
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await SystemSetting.find({}).sort({ key: 1 });
    return res.json(settings);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// PUT /api/system/settings/:key - Manager updates a threshold setting
router.put('/settings/:key', authMiddleware, requireManager, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required.' });
    }

    const updated = await SystemSetting.findOneAndUpdate(
      { key },
      { value, updatedBy: req.user.id, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    updateCachedSetting(key, value);

    await createEvent({
      category: 'SYSTEM',
      description: `Setting "${key}" updated to: ${JSON.stringify(value)} by ${req.user.name}.`,
      source: 'SETTINGS_PORTAL',
      employeeRef: req.user.id,
      severity: 'INFO',
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update setting.' });
  }
});

module.exports = router;

