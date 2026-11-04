const express = require('express');
const router = express.Router();
const EventLog = require('../models/EventLog');
const authMiddleware = require('../middleware/auth');

// GET /api/events - Paginated, filterable event logs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 25, category, severity, search, startDate, endDate } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (search) {
      filter.description = { $regex: search, $options: 'i' };
    }
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const events = await EventLog.find(filter)
      .populate('employeeRef', 'name employeeId')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await EventLog.countDocuments(filter);

    return res.json({
      data: events,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve event logs.' });
  }
});

// GET /api/events/export - CSV export
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const { category, severity, startDate, endDate } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const events = await EventLog.find(filter)
      .populate('employeeRef', 'name employeeId')
      .sort({ timestamp: -1 })
      .limit(2000);

    let csv = 'Timestamp (UTC),Category,Severity,Source,Description,Employee Name,Employee ID\n';
    events.forEach((e) => {
      const empName = e.employeeRef ? `"${e.employeeRef.name}"` : '""';
      const empId = e.employeeRef ? `"${e.employeeRef.employeeId}"` : '""';
      const desc = `"${e.description.replace(/"/g, '""')}"`;
      csv += `${e.timestamp.toISOString()},${e.category},${e.severity},${e.source},${desc},${empName},${empId}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment(`bankguard_events_${Date.now()}.csv`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to export event logs.' });
  }
});

module.exports = router;

