const sensorState = require('../services/sensorState');
const { createAlert } = require('../services/alertService');
const { createEvent } = require('../services/eventService');
const { hasActiveWindow, consumeWindow, openWindow } = require('../services/authorizationWindow');
const { checkDht11, checkMq2, checkAdxl335, getCachedSettings } = require('../services/thresholdCheck');
const User = require('../models/User');

function setupPiSocket(io, socket) {
  let authenticated = false;
  const expectedSecret = process.env.PI_SOCKET_SECRET || 'bankguard_pi_secret_token_12345';

  socket.on('pi:connect', async (data) => {
    if (data && data.secret === expectedSecret) {
      authenticated = true;
      sensorState.setPiConnected(true);
      console.log(`[Socket] Raspberry Pi authenticated successfully (${data.deviceId || 'pi'})`);
      
      await createEvent({
        category: 'SYSTEM',
        description: `Raspberry Pi controller connected (${data.deviceId || 'pi'}).`,
        source: 'RASPBERRY_PI',
        severity: 'INFO',
      });

      socket.emit('pi:connect_ack', { success: true, timestamp: new Date().toISOString() });
    } else {
      console.warn('[Socket] Raspberry Pi authentication failed: Invalid secret.');
      socket.emit('pi:connect_ack', { success: false, message: 'Invalid credentials.' });
      socket.disconnect();
    }
  });

  socket.on('pi:heartbeat', () => {
    if (!authenticated) return;
    sensorState.updatePiHeartbeat();
  });

  socket.on('pi:dht11', async (data) => {
    if (!authenticated) return;
    const { temperature, humidity } = data || {};
    sensorState.updateSensor('dht11', { temperature, humidity, status: 'ONLINE' });
    await checkDht11(temperature, humidity);
  });

  socket.on('pi:mq2', async (data) => {
    if (!authenticated) return;
    const { rawAdc, digitalState } = data || {};
    const settings = getCachedSettings();
    const isDetected = digitalState === 'DETECTED' || (rawAdc != null && rawAdc >= (settings.MQ2_ADC_THRESHOLD || 300));
    sensorState.updateSensor('mq2', {
      rawAdc: rawAdc != null ? rawAdc : (isDetected ? 750 : 150),
      detectionState: isDetected ? 'DETECTED' : 'NORMAL',
      status: 'ONLINE',
    });
    const currentTemp = sensorState.getState().dht11.temperature;
    await checkMq2(isDetected ? 750 : 150, currentTemp);
  });

  socket.on('pi:pir', async (data) => {
    if (!authenticated) return;
    const { state } = data || {};
    sensorState.updateSensor('pir', { state, status: 'ONLINE' });

    if (state === 'MOTION_DETECTED') {
      const currentState = sensorState.getState();
      const isVaultClosed = currentState.vaultReed.state === 'CLOSED';
      const hasWindow = hasActiveWindow('VAULT');

      if (isVaultClosed && !hasWindow) {
        await createAlert({
          type: 'VAULT_PIR_MOTION',
          severity: 'HIGH',
          description: 'Motion detected inside vault while vault is secured and unauthorized.',
          source: 'PIR',
        });
        await createEvent({
          category: 'MOTION',
          description: 'PIR Motion detected inside closed vault.',
          source: 'PIR',
          severity: 'HIGH',
        });
      }
    }
  });

  socket.on('pi:adxl335', async (data) => {
    if (!authenticated) return;
    const { x, y, z } = data || {};
    const baseline = sensorState.getState().adxl335.baseline || { x: 0, y: 0, z: 1 };
    const settings = getCachedSettings();
    const delta = Math.sqrt(
      Math.pow((x || 0) - baseline.x, 2) + Math.pow((y || 0) - baseline.y, 2) + Math.pow((z || 0) - baseline.z, 2)
    );
    const isTamper = delta >= (settings.ADXL335_TAMPER_DELTA || 0.3);

    sensorState.updateSensor('adxl335', {
      x,
      y,
      z,
      movementState: isTamper ? 'POSSIBLE_TAMPERING' : delta > 0.1 ? 'MOVEMENT_DETECTED' : 'STABLE',
      status: 'ONLINE',
    });

    await checkAdxl335(x, y, z, baseline);
  });

  socket.on('pi:reed_entrance', async (data) => {
    if (!authenticated) return;
    const { state } = data || {};
    const oldState = sensorState.getState().entranceReed.state;
    sensorState.updateSensor('entranceReed', { state, lastChange: new Date().toISOString(), status: 'ONLINE' });

    if (oldState !== state) {
      await createEvent({
        category: 'DOOR_EVENT',
        description: `Main entrance door transitioned to ${state}.`,
        source: 'ENTRANCE_REED',
        severity: 'INFO',
      });
    }
  });

  socket.on('pi:reed_vault', async (data) => {
    if (!authenticated) return;
    const { state } = data || {};
    const oldState = sensorState.getState().vaultReed.state;
    sensorState.updateSensor('vaultReed', { state, lastChange: new Date().toISOString(), status: 'ONLINE' });

    if (oldState !== state) {
      const activeWindow = hasActiveWindow('VAULT');
      if (state === 'OPEN' && !activeWindow) {
        await createAlert({
          type: 'VAULT_UNAUTHORIZED_OPEN',
          severity: 'CRITICAL',
          description: 'CRITICAL: Vault physical door opened without prior manager authorization!',
          source: 'VAULT_REED',
        });
      }

      await createEvent({
        category: 'DOOR_EVENT',
        description: `Vault door transitioned to ${state}.`,
        source: 'VAULT_REED',
        severity: state === 'OPEN' && !activeWindow ? 'CRITICAL' : 'INFO',
      });
    }
  });

  socket.on('pi:ultrasonic', async (data) => {
    if (!authenticated) return;
    const { distanceCm } = data || {};
    const settings = getCachedSettings();
    const threshold = settings.ULTRASONIC_DISTANCE_CM || 100;
    const passageDetected = distanceCm != null && distanceCm > 0 && distanceCm <= threshold;

    let detectionState = 'CLEAR';
    if (passageDetected) {
      const windowData = consumeWindow('ENTRANCE');
      if (windowData) {
        detectionState = 'AUTHORIZED_PASSAGE';
        await createEvent({
          category: 'ACCESS_ATTEMPT',
          description: `Authorized passage detected at entrance by employee ${windowData.employeeId}.`,
          source: 'ULTRASONIC',
          employeeRef: windowData.employeeRef,
          severity: 'INFO',
          metadata: { distanceCm },
        });
      } else {
        detectionState = 'SUSPECTED_UNAUTHORIZED_ENTRY';
        await createAlert({
          type: 'SUSPECTED_UNAUTHORIZED_ENTRY',
          severity: 'HIGH',
          description: `Unexpected passage detected at main entrance (${distanceCm} cm) without prior authorization!`,
          source: 'ULTRASONIC',
          relatedReadings: { distanceCm, threshold },
        });
        await createEvent({
          category: 'ACCESS_ATTEMPT',
          description: `Suspected unauthorized passage detected at main entrance (${distanceCm} cm).`,
          source: 'ULTRASONIC',
          severity: 'HIGH',
          metadata: { distanceCm },
        });
      }
    }

    sensorState.updateSensor('ultrasonic', {
      distanceCm,
      detectionState,
      status: 'ONLINE',
    });
  });

  socket.on('pi:rfid_scan', async (data) => {
    if (!authenticated) return;
    const { uid } = data || {};
    sensorState.updateSensor('rfid', { lastScan: { uid, timestamp: new Date().toISOString() }, status: 'ONLINE' });

    let matchedUser = null;
    const strUid = uid ? String(uid).trim() : null;
    if (strUid) {
      matchedUser = await User.findOne({ rfidUid: strUid, isActive: true });
      // If not in database, also check known demonstration UIDs
      if (!matchedUser) {
        if (strUid === '811100484108') {
          matchedUser = { _id: null, name: 'Branch Manager', employeeId: 'MGR001', role: 'MANAGER' };
        } else if (strUid === '288527357674') {
          matchedUser = { _id: null, name: 'Demo Employee', employeeId: 'EMP001', role: 'EMPLOYEE' };
        }
      }
    }

    if (matchedUser) {
      // Grant authorized passage window so ultrasonic passage does not trigger unauthorized alarm
      openWindow('ENTRANCE', matchedUser.employeeId, matchedUser._id, 60000);
    }

    const isAuthorized = !!matchedUser;
    const userName = isAuthorized ? matchedUser.name : 'Unknown Card';
    const userRole = isAuthorized ? matchedUser.role : null;

    await createEvent({
      category: 'RFID_SCAN',
      description: isAuthorized
        ? `Authorized person entered: ${userName} (${userRole}, ID: ${matchedUser.employeeId || 'DEMO'})`
        : `Unauthorized personnel enter attempted with RFID UID: ${uid}`,
      source: 'RC522_RFID',
      employeeRef: matchedUser && matchedUser._id ? matchedUser._id : null,
      severity: isAuthorized ? 'INFO' : 'WARNING',
      metadata: { uid, role: userRole, authorized: isAuthorized },
    });

    // Notify connected frontend clients of RFID scan event
    io.emit('pi:rfid_scan', {
      uid,
      authorized: isAuthorized,
      user: isAuthorized ? { name: matchedUser.name, employeeId: matchedUser.employeeId, role: matchedUser.role } : null
    });
  });

  socket.on('pi:sensor_error', async (data) => {
    if (!authenticated) return;
    const { sensor, error } = data || {};
    if (sensor && sensorState.getState()[sensor]) {
      sensorState.updateSensor(sensor, { status: 'ERROR' });
    }
    await createAlert({
      type: 'SENSOR_OFFLINE',
      severity: 'WARNING',
      description: `Hardware sensor reported an error: ${sensor} (${error || 'Unknown error'})`,
      source: sensor || 'PI_DRIVER',
      relatedReadings: { error },
    });
  });

  socket.on('disconnect', async () => {
    if (authenticated) {
      console.warn('[Socket] Raspberry Pi connection lost.');
      sensorState.setPiConnected(false);
      await createAlert({
        type: 'PI_DISCONNECTED',
        severity: 'HIGH',
        description: 'Raspberry Pi controller disconnected from server.',
        source: 'RASPBERRY_PI',
      });
      await createEvent({
        category: 'SYSTEM',
        description: 'Raspberry Pi connection lost.',
        source: 'SERVER',
        severity: 'HIGH',
      });
    }
  });
}

module.exports = { setupPiSocket };

