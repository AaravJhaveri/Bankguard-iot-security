const SystemSetting = require('../models/SystemSetting');
const { createAlert } = require('./alertService');

const cachedSettings = {
  DHT11_TEMP_WARN: 35,
  DHT11_TEMP_CRITICAL: 45,
  DHT11_HUMIDITY_WARN: 80,
  MQ2_ADC_THRESHOLD: 300,
  FIRE_CONFIRM_PERIOD_MS: 10000,
  ULTRASONIC_DISTANCE_CM: 100,
  AUTH_WINDOW_DURATION_MS: 30000,
  ADXL335_TAMPER_DELTA: 0.3,
  SENSOR_STALE_MS: 30000,
  SENSOR_OFFLINE_MS: 60000,
};

let possibleFireTimer = null;

async function loadSettings() {
  try {
    const settings = await SystemSetting.find({});
    settings.forEach((s) => {
      cachedSettings[s.key] = s.value;
    });
  } catch (err) {
    console.error('[Threshold] Error loading settings:', err.message);
  }
}

function updateCachedSetting(key, value) {
  cachedSettings[key] = value;
}

function getCachedSettings() {
  return { ...cachedSettings };
}

async function checkDht11(temperature, humidity) {
  if (temperature != null) {
    if (temperature >= cachedSettings.DHT11_TEMP_CRITICAL) {
      await createAlert({
        type: 'TEMP_HIGH_CRITICAL',
        severity: 'WARNING',
        description: `Elevated temperature reached in bank/vault: ${temperature}°C`,
        source: 'DHT11',
        relatedReadings: { temperature, criticalThreshold: cachedSettings.DHT11_TEMP_CRITICAL },
      });
    } else if (temperature >= cachedSettings.DHT11_TEMP_WARN) {
      await createAlert({
        type: 'TEMP_HIGH_WARNING',
        severity: 'WARNING',
        description: `Elevated temperature detected in bank/vault: ${temperature}°C`,
        source: 'DHT11',
        relatedReadings: { temperature, warnThreshold: cachedSettings.DHT11_TEMP_WARN },
      });
    }
  }

  if (humidity != null && humidity >= cachedSettings.DHT11_HUMIDITY_WARN) {
    await createAlert({
      type: 'HUMIDITY_HIGH',
      severity: 'WARNING',
      description: `High relative humidity in bank/vault: ${humidity}%RH`,
      source: 'DHT11',
      relatedReadings: { humidity, threshold: cachedSettings.DHT11_HUMIDITY_WARN },
    });
  }
}

async function checkMq2(rawAdc, currentTemp) {
  if (rawAdc != null && rawAdc >= cachedSettings.MQ2_ADC_THRESHOLD) {
    await createAlert({
      type: 'SMOKE_GAS_DETECTED',
      severity: 'WARNING',
      description: `Smoke or combustible gas detected by MQ-2 sensor.`,
      source: 'MQ-2',
      relatedReadings: { rawAdc, threshold: cachedSettings.MQ2_ADC_THRESHOLD },
    });

    // Check possible fire condition: high temp AND smoke
    if (currentTemp != null && currentTemp >= cachedSettings.DHT11_TEMP_CRITICAL) {
      if (!possibleFireTimer) {
        possibleFireTimer = setTimeout(async () => {
          await createAlert({
            type: 'POSSIBLE_FIRE',
            severity: 'CRITICAL',
            description: `CRITICAL: POSSIBLE FIRE CONDITION DETECTED IN VAULT (Temp ${currentTemp}°C, Smoke Active)`,
            source: 'SYSTEM_FIRE_LOGIC',
            relatedReadings: { temperature: currentTemp, smokeAdc: rawAdc },
          });
          possibleFireTimer = null;
        }, cachedSettings.FIRE_CONFIRM_PERIOD_MS || 5000);
      }
    } else {
      if (possibleFireTimer) {
        clearTimeout(possibleFireTimer);
        possibleFireTimer = null;
      }
    }
  }
}

async function checkAdxl335(x, y, z, baseline = { x: 0, y: 0, z: 1 }) {
  if (x == null || y == null || z == null) return;
  const delta = Math.sqrt(
    Math.pow(x - baseline.x, 2) + Math.pow(y - baseline.y, 2) + Math.pow(z - baseline.z, 2)
  );

  if (delta >= cachedSettings.ADXL335_TAMPER_DELTA) {
    await createAlert({
      type: 'VAULT_TAMPER_SUSPECTED',
      severity: 'CRITICAL',
      description: `CRITICAL: Vault physical tamper or vibration detected: Delta ${delta.toFixed(2)}g`,
      source: 'ADXL345',
      relatedReadings: { x, y, z, baseline, delta },
    });
  }
}

module.exports = {
  loadSettings,
  updateCachedSetting,
  getCachedSettings,
  checkDht11,
  checkMq2,
  checkAdxl335,
};

