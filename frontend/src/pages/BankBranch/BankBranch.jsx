import React, { useState, useEffect } from 'react';
import { useSensor } from '../../context/SensorContext';
import { useAuth } from '../../context/AuthContext';
import SensorCard from '../../components/SensorCard/SensorCard';
import StatusIndicator from '../../components/StatusIndicator/StatusIndicator';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function BankBranch() {
  const { sensorState } = useSensor();
  const { isManager } = useAuth();

  const [doorEvents, setDoorEvents] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [modalAction, setModalAction] = useState(null); // 'LOCK' | 'UNLOCK' | null

  useEffect(() => {
    // Fetch last door transitions
    api
      .get('/events?category=DOOR_EVENT&source=ENTRANCE_REED&limit=10')
      .then((res) => setDoorEvents(res.data.data))
      .catch(() => {});

    // Fetch access logs
    api
      .get('/events?category=ACCESS_ATTEMPT&limit=15')
      .then((res) => setAccessLogs(res.data.data))
      .catch(() => {});
  }, []);

  const handleServoCommand = async (cmd) => {
    try {
      if (cmd === 'UNLOCK') {
        await api.post('/actuators/entrance/unlock');
        toast.success('Entrance unlock command transmitted to Pi.');
      } else {
        await api.post('/actuators/entrance/lock');
        toast.success('Entrance lock command transmitted to Pi.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to execute entrance command.');
    } finally {
      setModalAction(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Notice Banner regarding RFID limitation */}
      <div style={styles.disclaimerBanner}>
        <span style={{ fontSize: '20px' }}>ℹ️</span>
        <div>
          <div style={styles.disclaimerTitle}>RFID Access & Identity Verification Protocol</div>
          <div style={styles.disclaimerText}>
            Because physical cards in this test deployment share a common demonstration UID, the RFID reader detects card presence to prompt credentials. Final identification is always confirmed via individual account credentials on the security console.
          </div>
        </div>
      </div>

      {/* Main Sensor Cards Row */}
      <div style={styles.grid}>
        <SensorCard
          title="Main Entrance Reed Switch"
          value={sensorState.entranceReed.state}
          status={sensorState.entranceReed.status}
          lastUpdate={sensorState.entranceReed.lastUpdate}
          icon="🚪"
          warning={sensorState.entranceReed.state === 'OPEN'}
        />

        <SensorCard
          title="Ultrasonic Passage Detector"
          value={sensorState.ultrasonic.distanceCm}
          unit="cm"
          status={sensorState.ultrasonic.status}
          lastUpdate={sensorState.ultrasonic.lastUpdate}
          icon="📡"
          subValue={`Detection State: ${sensorState.ultrasonic.detectionState}`}
          warning={sensorState.ultrasonic.detectionState === 'SUSPECTED_UNAUTHORIZED_ENTRY'}
        />

        <SensorCard
          title="RC522 RFID Scanner"
          value={sensorState.rfid.lastScan ? sensorState.rfid.lastScan.uid : 'NO SCAN'}
          status={sensorState.rfid.status}
          lastUpdate={sensorState.rfid.lastUpdate}
          icon="💳"
          subValue="Branch entrance checkpoint"
        />

        <div style={styles.controlCard}>
          <div style={styles.controlHeader}>
            <span style={styles.controlTitle}>ENTRANCE SERVO ACTUATOR</span>
            <span style={styles.badge}>{sensorState.entranceServo.lastCommand || 'IDLE'}</span>
          </div>

          <div style={styles.controlStatus}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Physical Reed Feedback: <StatusIndicator state={sensorState.entranceReed.state} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Last command: {sensorState.entranceServo.lastCommand || 'None'} ({sensorState.entranceServo.commandResult})
            </div>
          </div>

          {isManager ? (
            <div style={styles.buttonGroup}>
              <button
                onClick={() => setModalAction('UNLOCK')}
                style={{ ...styles.btn, backgroundColor: 'var(--color-primary-light)' }}
              >
                Unlock Door
              </button>
              <button
                onClick={() => setModalAction('LOCK')}
                style={{ ...styles.btn, backgroundColor: '#475569' }}
              >
                Lock Door
              </button>
            </div>
          ) : (
            <div style={styles.restrictedNote}>Actuator commands restricted to Branch Managers.</div>
          )}
        </div>
      </div>

      {/* Tables Section */}
      <div style={styles.tablesRow}>
        {/* Door Transitions */}
        <div style={styles.tablePanel}>
          <div style={styles.panelTitle}>Recent Entrance Door State Transitions</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Timestamp (IST)</th>
                <th style={styles.th}>State</th>
                <th style={styles.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              {doorEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} style={styles.emptyTd}>No recorded door events yet.</td>
                </tr>
              ) : (
                doorEvents.map((e, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={styles.td}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                    <td style={styles.td}><StatusIndicator state={e.description.includes('OPEN') ? 'OPEN' : 'CLOSED'} /></td>
                    <td style={styles.td}>{e.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Employee Access History */}
        <div style={styles.tablePanel}>
          <div style={styles.panelTitle}>Entrance Passage & Access Log</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Event Summary</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={styles.emptyTd}>No access attempts logged.</td>
                </tr>
              ) : (
                accessLogs.map((log, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={styles.td}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td style={styles.td}><span style={styles.sourceBadge}>{log.source}</span></td>
                    <td style={styles.td}>{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!modalAction}
        title={`Confirm Entrance ${modalAction}`}
        message={`Are you sure you want to execute an ${modalAction} command on the main entrance servo?`}
        onConfirm={() => handleServoCommand(modalAction)}
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
  disclaimerBanner: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  disclaimerTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e40af',
  },
  disclaimerText: {
    fontSize: '12px',
    color: '#1e3a8a',
    marginTop: '4px',
    lineHeight: '1.4',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  controlCard: {
    padding: '16px',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px',
  },
  controlHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    letterSpacing: '0.4px',
  },
  badge: {
    fontSize: '10px',
    fontWeight: '700',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: '8px',
  },
  controlStatus: {
    margin: '10px 0',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  btn: {
    flex: 1,
    padding: '8px',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
  },
  restrictedNote: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  tablesRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '20px',
  },
  tablePanel: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    padding: '20px',
    boxShadow: 'var(--shadow)',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text)',
    textTransform: 'uppercase',
    marginBottom: '14px',
    letterSpacing: '0.3px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    padding: '8px 10px',
    borderBottom: '1px solid var(--color-border)',
  },
  tr: {
    borderBottom: '1px solid #f8fafc',
  },
  td: {
    padding: '10px',
    fontSize: '13px',
    color: 'var(--color-text)',
  },
  emptyTd: {
    textAlign: 'center',
    padding: '20px',
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  sourceBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
  },
};

