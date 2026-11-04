const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'RFID_SCAN',
        'DOOR_EVENT',
        'ACCESS_ATTEMPT',
        'VAULT_ACCESS',
        'ENVIRONMENTAL',
        'MOTION',
        'SERVO_COMMAND',
        'SYSTEM',
        'SENSOR_STATUS',
        'MONITORING_MODE',
      ],
    },
    description: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    employeeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'HIGH', 'CRITICAL'],
      default: 'INFO',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

eventLogSchema.index({ timestamp: -1, category: 1 });

module.exports = mongoose.model('EventLog', eventLogSchema);

