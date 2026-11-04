const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const authMiddleware = require('../middleware/auth');
const { requireManager } = require('../middleware/roleCheck');
const { acknowledgeAlert, resolveAlert } = require('../services/alertService');

// GET /api/alerts - Paginated alerts list
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, severity, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const alerts = await Alert.find(filter)
      .populate('acknowledgedBy', 'name employeeId')
      .populate('resolvedBy', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Alert.countDocuments(filter);

    return res.json({
      data: alerts,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve alerts.' });
  }
});

// GET /api/alerts/active - Only active alerts
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const activeAlerts = await Alert.find({ status: 'ACTIVE' }).sort({ createdAt: -1 });
    return res.json(activeAlerts);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve active alerts.' });
  }
});

// PUT /api/alerts/:id/acknowledge - Manager acknowledges an alert
router.put('/:id/acknowledge', authMiddleware, requireManager, async (req, res) => {
  try {
    const alert = await acknowledgeAlert(req.params.id, req.user.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found or already acknowledged/resolved.' });
    }
    return res.json(alert);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to acknowledge alert.' });
  }
});

// PUT /api/alerts/:id/resolve - Manager resolves an alert
router.put('/:id/resolve', authMiddleware, requireManager, async (req, res) => {
  try {
    const alert = await resolveAlert(req.params.id, req.user.id);
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }
    return res.json(alert);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to resolve alert.' });
  }
});

module.exports = router;

