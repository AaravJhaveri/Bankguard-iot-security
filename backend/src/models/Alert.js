const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      default: uuidv4,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'TEMP_HIGH_WARNING',
        'TEMP_HIGH_CRITICAL',
        'HUMIDITY_HIGH',
        'SMOKE_GAS_DETECTED',
        'POSSIBLE_FIRE',
        'VAULT_PIR_MOTION',
        'VAULT_TAMPER_SUSPECTED',
        'VAULT_UNAUTHORIZED_OPEN',
        'FAILED_AUTH_ATTEMPT',
        'VAULT_UNLOCK_DENIED',
        'SENSOR_OFFLINE',
        'PI_DISCONNECTED',
        'SUSPECTED_UNAUTHORIZED_ENTRY',
      ],
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'HIGH', 'CRITICAL'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    relatedReadings: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'ACTIVE',
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

alertSchema.index({ status: 1, severity: 1 });
alertSchema.index({ type: 1, source: 1, status: 1 });

module.exports = mongoose.model('Alert', alertSchema);

