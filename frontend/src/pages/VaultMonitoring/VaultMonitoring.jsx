import React, { useState } from 'react';
import { useSensor } from '../../context/SensorContext';
import { useAuth } from '../../context/AuthContext';
import SensorCard from '../../components/SensorCard/SensorCard';
import StatusIndicator from '../../components/StatusIndicator/StatusIndicator';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import LiveChart from '../../components/LiveChart/LiveChart';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function VaultMonitoring() {
  const { sensorState, activeAlerts } = useSensor();
  const { isManager } = useAuth();
  const [modalAction, setModalAction] = useState(null); // 'UNLOCK' | 'LOCK' | null

  // Check if possible fire condition is active
  const fireAlert = activeAlerts.find((a) => a.type === 'POSSIBLE_FIRE');

  const handleVaultCommand = async (action) => {
    try {
      if (action === 'UNLOCK') {
        await api.post('/vault/unlock');
        toast.success('Manager Vault Unlock command sent to Pi actuator.');
      } else {
        await api.post('/vault/lock');
        toast.success('Manager Vault Lock command sent to Pi actuator.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch vault command.');
    } finally {
      setModalAction(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Critical Fire Banner if Triggered */}
      {fireAlert && (
        <div style={styles.fireBanner}>
          <div style={styles.fireLeft}>
            <span style={{ fontSize: '30px' }}>🔥</span>
            <div>
              <div style={styles.fireTitle}>CRITICAL: POSSIBLE FIRE CONDITION DETECTED IN VAULT</div>
              <div style={styles.fireSub}>
                Combined anomalous threshold exceeded: High Temperature ({sensorState.dht11.temperature}°C) & Smoke ADC ({sensorState.mq2.rawAdc}).
                Note: This system is an educational prototype and not a certified fire alarm.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sensor Cards Row */}
      <div style={styles.grid}>
        <SensorCard
          title="Vault PIR Motion Sensor"
          value={sensorState.pir.state}
          status={sensorState.pir.status}
          lastUpdate={sensorState.pir.lastUpdate}
          icon="🏃"
          warning={sensorState.pir.state === 'MOTION_DETECTED'}
        />

        <SensorCard
          title="ADXL335 Tamper Accelerometer"
          value={sensorState.adxl335.movementState}
          status={sensorState.adxl335.status}
          lastUpdate={sensorState.adxl335.lastUpdate}
          icon="📳"
          subValue={sensorState.adxl335.x !== null ? `X:${sensorState.adxl335.x} Y:${sensorState.adxl335.y} Z:${sensorState.adxl335.z}` : 'No signal'}
          warning={sensorState.adxl335.movementState === 'POSSIBLE_TAMPERING'}
        />
      </div>

      {/* Actuator & Lock Control Section */}
      <div style={styles.vaultControlPanel}>
        <div style={styles.vcHeader}>
          <div style={styles.vcTitle}>High-Security Vault Actuator & Servo Lock Control</div>
          <span style={styles.vcBadge}>Role Requirement: MANAGER</span>
        </div>

        <div style={styles.vcBody}>
          <div style={styles.vcInfo}>
            <div>
              Actuator Command State: <strong>{sensorState.vaultServo.lastCommand || 'LOCKED'}</strong> ({sensorState.vaultServo.commandResult})
            </div>
            <div style={styles.vcNotice}>
              ⚠️ Unlocking sends a PWM signal to the servo mechanism and logs a high-severity security audit event. Only certified branch managers may authorize vault disengagement.
            </div>
          </div>

          {isManager ? (
            <div style={styles.vcActions}>
              <button
                onClick={() => setModalAction('UNLOCK')}
                style={{ ...styles.vcBtn, backgroundColor: 'var(--color-critical)' }}
              >
                Request Vault Unlock
              </button>
              <button
                onClick={() => setModalAction('LOCK')}
                style={{ ...styles.vcBtn, backgroundColor: '#334155' }}
              >
                Secure / Lock Vault
              </button>
            </div>
          ) : (
            <div style={styles.vcRestricted}>
              Vault unlock controls are disabled for Employee role accounts.
            </div>
          )}
        </div>
      </div>

      {/* Live Environmental Charts */}
      <div style={styles.chartsGrid}>
        <LiveChart
          title="Vault Temperature Stream"
          data={[]}
          dataKey="temperature"
          unit="°C"
          color="#ea580c"
          minVal={15}
          maxVal={60}
        />
        <LiveChart
          title="Vault Relative Humidity Stream"
          data={[]}
          dataKey="humidity"
          unit="%RH"
          color="#2563eb"
          minVal={20}
          maxVal={100}
        />
      </div>

      <ConfirmModal
        isOpen={!!modalAction}
        title={`Authorize Vault ${modalAction}?`}
        message={`This action will command the physical vault servo to ${modalAction}. All events are recorded under your manager profile.`}
        onConfirm={() => handleVaultCommand(modalAction)}
        onCancel={() => setModalAction(null)}
        danger={modalAction === 'UNLOCK'}
      />
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  fireBanner: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
  },
  fireLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  fireTitle: {
    fontSize: '16px',
    fontWeight: '800',
    letterSpacing: '0.4px',
  },
  fireSub: {
    fontSize: '12px',
    opacity: 0.95,
    marginTop: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  vaultControlPanel: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  vcHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
  },
  vcTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-text)',
    letterSpacing: '0.3px',
  },
  vcBadge: {
    fontSize: '11px',
    fontWeight: '700',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  vcBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  vcInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
  },
  vcNotice: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    maxWidth: '560px',
    marginTop: '4px',
    lineHeight: '1.4',
  },
  vcActions: {
    display: 'flex',
    gap: '10px',
  },
  vcBtn: {
    padding: '10px 18px',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
  },
  vcRestricted: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '20px',
  },
};

