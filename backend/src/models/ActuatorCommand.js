const mongoose = require('mongoose');

const actuatorCommandSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    target: {
      type: String,
      enum: ['ENTRANCE_SERVO', 'VAULT_SERVO', 'BUZZER', 'LED'],
      required: true,
    },
    command: {
      type: String,
      enum: ['LOCK', 'UNLOCK', 'ON', 'OFF'],
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    result: {
      type: String,
      enum: ['SENT', 'FAILED', 'UNKNOWN', 'SUCCESS'],
      default: 'SENT',
    },
    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

actuatorCommandSchema.index({ timestamp: -1 });

module.exports = mongoose.model('ActuatorCommand', actuatorCommandSchema);

