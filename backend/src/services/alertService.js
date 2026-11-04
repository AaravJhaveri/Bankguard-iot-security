const Alert = require('../models/Alert');

let ioInstance = null;

function setAlertIo(io) {
  ioInstance = io;
}

/**
 * Creates an alert if an ACTIVE alert with the same type and source does not already exist (deduplication).
 */
async function createAlert({ type, severity, description, source, relatedReadings = null }) {
  try {
    const existing = await Alert.findOne({
      type,
      source,
      status: 'ACTIVE',
    });

    if (existing) {
      // Alert already active, avoid flooding
      return existing;
    }

    const alert = await Alert.create({
      type,
      severity,
      description,
      source,
      relatedReadings,
      status: 'ACTIVE',
    });

    if (ioInstance) {
      ioInstance.emit('alert:new', alert);
    }

    return alert;
  } catch (error) {
    console.error(`[AlertService] Failed to create alert: ${error.message}`);
    return null;
  }
}

async function acknowledgeAlert(alertId, userId) {
  const alert = await Alert.findOneAndUpdate(
    { alertId, status: 'ACTIVE' },
    {
      status: 'ACKNOWLEDGED',
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    },
    { new: true }
  ).populate('acknowledgedBy', 'name employeeId');

  if (alert && ioInstance) {
    ioInstance.emit('alert:updated', alert);
  }
  return alert;
}

async function resolveAlert(alertId, userId) {
  const alert = await Alert.findOneAndUpdate(
    { alertId, status: { $in: ['ACTIVE', 'ACKNOWLEDGED'] } },
    {
      status: 'RESOLVED',
      resolvedBy: userId,
      resolvedAt: new Date(),
    },
    { new: true }
  ).populate('resolvedBy', 'name employeeId');

  if (alert && ioInstance) {
    ioInstance.emit('alert:updated', alert);
  }
  return alert;
}

module.exports = {
  setAlertIo,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
};

