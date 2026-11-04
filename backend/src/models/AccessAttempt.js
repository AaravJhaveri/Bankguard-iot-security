const mongoose = require('mongoose');

const accessAttemptSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    rfidUid: {
      type: String,
      default: null,
    },
    employeeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    zone: {
      type: String,
      enum: ['ENTRANCE', 'VAULT'],
      required: true,
    },
    result: {
      type: String,
      enum: ['GRANTED', 'DENIED', 'UNKNOWN_RFID', 'WRONG_PIN'],
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

accessAttemptSchema.index({ timestamp: -1, zone: 1 });

module.exports = mongoose.model('AccessAttempt', accessAttemptSchema);

