/**
 * In-Memory live sensor state store.
 * Holds real-time data received continuously from the Raspberry Pi.
 * Raw sensor readings are NEVER written directly to MongoDB.
 */

let ioInstance = null;

const state = {
  piConnected: false,
  piLastSeen: null,
  monitoringMode: 'ON',

  dht11: {
    temperature: null,
    humidity: null,
    status: 'OFFLINE', // ONLINE | OFFLINE | STALE | ERROR | NOT_CONFIGURED
    lastUpdate: null,
  },
  mq2: {
    rawAdc: null,
    detectionState: 'UNKNOWN', // NORMAL | DETECTED | UNKNOWN | ERROR
    status: 'OFFLINE',
    lastUpdate: null,
  },
  pir: {
    state: 'UNKNOWN', // MOTION_DETECTED | NO_MOTION | UNKNOWN | OFFLINE
    status: 'OFFLINE',
    lastUpdate: null,
  },
  adxl335: {
    x: null,
    y: null,
    z: null,
    movementState: 'UNKNOWN', // STABLE | MOVEMENT_DETECTED | POSSIBLE_TAMPERING | UNKNOWN
    baseline: { x: 0, y: 0, z: 1 },
    status: 'OFFLINE',
    lastUpdate: null,
  },
  entranceReed: {
    state: 'UNKNOWN', // OPEN | CLOSED | UNKNOWN
    lastChange: null,
    status: 'OFFLINE',
    lastUpdate: null,
  },
  vaultReed: {
    state: 'UNKNOWN', // OPEN | CLOSED | UNKNOWN
    lastChange: null,
    status: 'OFFLINE',
    lastUpdate: null,
  },
  ultrasonic: {
    distanceCm: null,
    detectionState: 'UNKNOWN', // CLEAR | AUTHORIZED_PASSAGE | SUSPECTED_UNAUTHORIZED_ENTRY | UNKNOWN
    status: 'OFFLINE',
    lastUpdate: null,
  },
  rfid: {
    lastScan: null, // { uid, timestamp }
    status: 'OFFLINE',
    lastUpdate: null,
  },
  entranceServo: {
    lastCommand: null, // LOCK | UNLOCK
    commandResult: 'UNKNOWN', // SENT | FAILED | SUCCESS | UNKNOWN
    lastUpdate: null,
  },
  vaultServo: {
    lastCommand: null,
    commandResult: 'UNKNOWN',
    lastUpdate: null,
  },
};

const STALE_THRESHOLD_MS = 30000;
const OFFLINE_THRESHOLD_MS = 60000;

function setIo(io) {
  ioInstance = io;
}

function broadcastUpdate() {
  if (ioInstance) {
    ioInstance.emit('sensor:update', state);
  }
}

function getState() {
  return JSON.parse(JSON.stringify(state));
}

function setPiConnected(connected) {
  state.piConnected = connected;
  if (connected) {
    state.piLastSeen = new Date().toISOString();
  }
  if (ioInstance) {
    ioInstance.emit('pi:status', {
      connected: state.piConnected,
      lastSeen: state.piLastSeen,
    });
  }
  broadcastUpdate();
}

function updatePiHeartbeat() {
  state.piConnected = true;
  state.piLastSeen = new Date().toISOString();
  if (ioInstance) {
    ioInstance.emit('pi:status', {
      connected: state.piConnected,
      lastSeen: state.piLastSeen,
    });
  }
}

function setMonitoringMode(mode) {
  state.monitoringMode = mode;
  if (ioInstance) {
    ioInstance.emit('system:monitoring_mode', { mode });
  }
  broadcastUpdate();
}

function updateSensor(sensorKey, data) {
  if (state[sensorKey] !== undefined) {
    state[sensorKey] = {
      ...state[sensorKey],
      ...data,
      status: data.status || 'ONLINE',
      lastUpdate: new Date().toISOString(),
    };
    broadcastUpdate();
  }
}

// Periodic check for Stale / Offline sensor states
setInterval(() => {
  const now = Date.now();
  let changed = false;

  const sensorKeys = ['dht11', 'mq2', 'pir', 'adxl335', 'entranceReed', 'vaultReed', 'ultrasonic', 'rfid'];

  sensorKeys.forEach((key) => {
    const sensor = state[key];
    if (sensor && sensor.lastUpdate && sensor.status !== 'NOT_CONFIGURED' && sensor.status !== 'ERROR') {
      const diff = now - new Date(sensor.lastUpdate).getTime();
      if (diff > OFFLINE_THRESHOLD_MS && sensor.status !== 'OFFLINE') {
        sensor.status = 'OFFLINE';
        changed = true;
      } else if (diff > STALE_THRESHOLD_MS && diff <= OFFLINE_THRESHOLD_MS && sensor.status !== 'STALE') {
        sensor.status = 'STALE';
        changed = true;
      }
    }
  });

  if (state.piLastSeen) {
    const piDiff = now - new Date(state.piLastSeen).getTime();
    if (piDiff > OFFLINE_THRESHOLD_MS && state.piConnected) {
      state.piConnected = false;
      changed = true;
      if (ioInstance) {
        ioInstance.emit('pi:status', {
          connected: false,
          lastSeen: state.piLastSeen,
        });
      }
    }
  }

  if (changed) {
    broadcastUpdate();
  }
}, 10000);

module.exports = {
  setIo,
  getState,
  setPiConnected,
  updatePiHeartbeat,
  setMonitoringMode,
  updateSensor,
  broadcastUpdate,
};

