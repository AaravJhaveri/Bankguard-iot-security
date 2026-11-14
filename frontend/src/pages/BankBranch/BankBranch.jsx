import React, { useState, useEffect } from 'react';
import { useSensor } from '../../context/SensorContext';
import SensorCard from '../../components/SensorCard/SensorCard';
import StatusIndicator from '../../components/StatusIndicator/StatusIndicator';
import api from '../../api/client';

export default function BankBranch() {
  const { sensorState } = useSensor();

  const [doorEvents, setDoorEvents] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);

  useEffect(() => {
    // Fetch last RFID scans and entrance activity
    api
      .get('/events?category=RFID_SCAN&limit=10')
      .then((res) => setDoorEvents(res.data.data))
      .catch(() => {});

    // Fetch access logs
    api
      .get('/events?category=ACCESS_ATTEMPT&limit=15')
      .then((res) => setAccessLogs(res.data.data))
      .catch(() => {});
  }, []);

  return (
    <div style={styles.container}>
      {/* Notice Banner regarding RFID authorization */}
      <div style={styles.disclaimerBanner}>
        <span style={{ fontSize: '20px' }}>ℹ️</span>
        <div>
          <div style={styles.disclaimerTitle}>Branch Access Control Protocol</div>
          <div style={styles.disclaimerText}>
            Main entrance door operates strictly via RFID badge authorization. Upon presenting an authorized card to the RC522 scanner, the entrance door unlocks for 5 seconds and automatically re-locks.
          </div>
        </div>
      </div>

      {/* Main Sensor Cards Row */}
      <div style={styles.grid}>
        <SensorCard
          title="DHT11 Temperature"
          value={sensorState.dht11.temperature}
          unit="°C"
          status={sensorState.dht11.status}
          lastUpdate={sensorState.dht11.lastUpdate}
          icon="🌡️"
          warning={sensorState.dht11.temperature > 35}
        />

        <SensorCard
          title="DHT11 Humidity"
          value={sensorState.dht11.humidity}
          unit="%RH"
          status={sensorState.dht11.status}
          lastUpdate={sensorState.dht11.lastUpdate}
          icon="💧"
          warning={sensorState.dht11.humidity > 80}
        />

        <SensorCard
          title="MQ-2 Smoke / Gas Sensor"
          value={sensorState.mq2.detectionState}
          lastUpdate={sensorState.mq2.lastUpdate}
          icon="💨"
          warning={sensorState.mq2.detectionState === 'DETECTED'}
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

        <SensorCard
          title="Main Entrance Door"
          value={sensorState.entranceServo.state || sensorState.entranceServo.lastCommand || 'LOCKED'}
          lastUpdate={sensorState.entranceServo.lastUpdate}
          icon="🚪"
          subValue="RFID Authorization Only (Auto-locks in 5s)"
          warning={(sensorState.entranceServo.state || sensorState.entranceServo.lastCommand) === 'UNLOCKED'}
        />
      </div>

      {/* Tables Section */}
      <div style={styles.tablesRow}>
        {/* Door Transitions */}
        <div style={styles.tablePanel}>
          <div style={styles.panelTitle}>Recent RFID Door Access Events</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Timestamp (IST)</th>
                <th style={styles.th}>Gate Status</th>
                <th style={styles.th}>Event Summary</th>
              </tr>
            </thead>
            <tbody>
              {doorEvents.length === 0 ? (
                <tr>
                  <td colSpan={3} style={styles.emptyTd}>No recorded RFID access events yet.</td>
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

