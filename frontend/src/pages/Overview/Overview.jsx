import React, { useState, useEffect } from 'react';
import { useSensor } from '../../context/SensorContext';
import SensorCard from '../../components/SensorCard/SensorCard';
import AlertBadge from '../../components/AlertBadge/AlertBadge';
import api from '../../api/client';
import { Link } from 'react-router-dom';

export default function Overview() {
  const { sensorState, piConnected, activeAlerts, recentEvents, monitoringMode } = useSensor();
  const [employeeCount, setEmployeeCount] = useState(0);
  const [entriesToday, setEntriesToday] = useState(0);

  useEffect(() => {
    // Fetch stats
    api
      .get('/users')
      .then((res) => setEmployeeCount(res.data.length))
      .catch(() => {});

    api
      .get('/events?category=ACCESS_ATTEMPT&limit=100')
      .then((res) => {
        const today = new Date().toISOString().split('T')[0];
        const count = res.data.data.filter((e) => e.timestamp.startsWith(today)).length;
        setEntriesToday(count);
      })
      .catch(() => {});
  }, []);

  // Compute Overall System State: NORMAL, WARNING, CRITICAL, or UNKNOWN
  const computeSystemState = () => {
    if (!piConnected) {
      return { state: 'WARNING', label: 'DEGRADED (PI DISCONNECTED)', color: '#d97706', bg: '#fef3c7' };
    }
    const hasCritical = activeAlerts.some((a) => a.severity === 'CRITICAL');
    if (hasCritical) {
      return { state: 'CRITICAL', label: 'CRITICAL ALERT ACTIVE', color: '#dc2626', bg: '#fee2e2' };
    }
    const hasHighOrWarn = activeAlerts.some((a) => a.severity === 'HIGH' || a.severity === 'WARNING');
    if (hasHighOrWarn) {
      return { state: 'WARNING', label: 'WARNING CONDITIONS DETECTED', color: '#d97706', bg: '#fef3c7' };
    }
    if (monitoringMode === 'MAINTENANCE') {
      return { state: 'WARNING', label: 'SYSTEM IN MAINTENANCE MODE', color: '#d97706', bg: '#fef3c7' };
    }
    return { state: 'NORMAL', label: 'ALL SYSTEMS SECURE & OPERATIONAL', color: '#16a34a', bg: '#dcfce7' };
  };

  const sysStatus = computeSystemState();

  return (
    <div style={styles.container}>
      {/* Top System Status Banner */}
      <div style={{ ...styles.statusBanner, backgroundColor: sysStatus.bg, border: `1px solid ${sysStatus.color}` }}>
        <div style={styles.statusLeft}>
          <span style={{ fontSize: '22px' }}>{sysStatus.state === 'NORMAL' ? '🛡️' : '⚠️'}</span>
          <div>
            <div style={{ ...styles.statusLabel, color: sysStatus.color }}>{sysStatus.label}</div>
            <div style={styles.statusSub}>
              Monitoring Mode: <strong>{monitoringMode}</strong> | Pi Controller: <strong>{piConnected ? 'ONLINE' : 'OFFLINE'}</strong>
            </div>
          </div>
        </div>
        <div style={styles.statusRight}>
          <span style={styles.clockSub}>Real-time updates active via WebSockets</span>
        </div>
      </div>

      {/* Grid of 9 Summary Cards */}
      <div style={styles.grid}>
        <SensorCard
          title="Registered Personnel"
          value={employeeCount}
          unit="Staff"
          status="ONLINE"
          icon="👥"
          subValue="Branch authorized accounts"
        />

        <SensorCard
          title="Entries Today"
          value={entriesToday}
          unit="Passages"
          status="ONLINE"
          icon="🚪"
          subValue="Branch entrance checkpoints"
        />

        <SensorCard
          title="Main Entrance Door"
          value={sensorState.entranceReed.state}
          status={sensorState.entranceReed.status}
          lastUpdate={sensorState.entranceReed.lastUpdate}
          icon="🚪"
          warning={sensorState.entranceReed.state === 'OPEN'}
        />

        <SensorCard
          title="Vault Security Door"
          value={sensorState.vaultReed.state}
          status={sensorState.vaultReed.status}
          lastUpdate={sensorState.vaultReed.lastUpdate}
          icon="🔒"
          warning={sensorState.vaultReed.state === 'OPEN'}
        />

        <SensorCard
          title="Vault Temperature"
          value={sensorState.dht11.temperature}
          unit="°C"
          status={sensorState.dht11.status}
          lastUpdate={sensorState.dht11.lastUpdate}
          icon="🌡️"
          warning={sensorState.dht11.temperature > 35}
        />

        <SensorCard
          title="Vault Humidity"
          value={sensorState.dht11.humidity}
          unit="%RH"
          status={sensorState.dht11.status}
          lastUpdate={sensorState.dht11.lastUpdate}
          icon="💧"
          warning={sensorState.dht11.humidity > 80}
        />

        <SensorCard
          title="Smoke & Combustible Gas"
          value={sensorState.mq2.detectionState}
          status={sensorState.mq2.status}
          lastUpdate={sensorState.mq2.lastUpdate}
          icon="💨"
          subValue={sensorState.mq2.rawAdc !== null ? `Raw ADC: ${sensorState.mq2.rawAdc}` : 'Awaiting reading'}
          warning={sensorState.mq2.detectionState === 'DETECTED'}
        />

        <SensorCard
          title="Active System Alerts"
          value={activeAlerts.length}
          status={activeAlerts.length > 0 ? 'ERROR' : 'ONLINE'}
          icon="🚨"
          subValue="Pending acknowledge/resolve"
          warning={activeAlerts.length > 0}
        />

        <SensorCard
          title="Raspberry Pi Controller"
          value={piConnected ? 'CONNECTED' : 'DISCONNECTED'}
          status={piConnected ? 'ONLINE' : 'OFFLINE'}
          icon="🍓"
          subValue="Local Ethernet connection"
        />
      </div>

      {/* Two-Column Lower Section: Active Alerts & Recent Events */}
      <div style={styles.lowerGrid}>
        {/* Active Alerts Panel */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}>Active Alerts ({activeAlerts.length})</div>
            <Link to="/alerts" style={styles.panelLink}>View All</Link>
          </div>
          <div style={styles.panelBody}>
            {activeAlerts.length === 0 ? (
              <div style={styles.emptyText}>No active alerts. All branch zones report secure.</div>
            ) : (
              <div style={styles.list}>
                {activeAlerts.slice(0, 5).map((a) => (
                  <div key={a.alertId || a._id} style={styles.alertRow}>
                    <AlertBadge severity={a.severity} />
                    <div style={styles.alertDetails}>
                      <div style={styles.alertDesc}>{a.description}</div>
                      <div style={styles.alertTime}>{new Date(a.createdAt || a.timestamp).toLocaleTimeString()} · Source: {a.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Events Log */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}>Live Security Activity Feed</div>
            <Link to="/event-logs" style={styles.panelLink}>Full Log</Link>
          </div>
          <div style={styles.panelBody}>
            {recentEvents.length === 0 ? (
              <div style={styles.emptyText}>Listening for real-time security events...</div>
            ) : (
              <div style={styles.list}>
                {recentEvents.slice(0, 7).map((e, idx) => (
                  <div key={e.eventId || idx} style={styles.eventRow}>
                    <span style={styles.eventCategory}>{e.category}</span>
                    <div style={styles.eventDesc}>{e.description}</div>
                    <span style={styles.eventTime}>{new Date(e.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
  statusBanner: {
    padding: '16px 20px',
    borderRadius: 'var(--radius)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  statusLabel: {
    fontSize: '16px',
    fontWeight: '800',
    letterSpacing: '0.4px',
  },
  statusSub: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  statusRight: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  clockSub: {
    fontStyle: 'italic',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  lowerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '20px',
  },
  panel: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '10px',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  panelLink: {
    fontSize: '12px',
    color: 'var(--color-primary-light)',
    fontWeight: '600',
  },
  panelBody: {
    minHeight: '180px',
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    padding: '20px 0',
    textAlign: 'center',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  alertRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: '#fff7ed',
  },
  alertDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  alertDesc: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#1f2937',
  },
  alertTime: {
    fontSize: '11px',
    color: '#6b7280',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    borderBottom: '1px dashed #f1f5f9',
    paddingBottom: '8px',
  },
  eventCategory: {
    fontSize: '10px',
    fontWeight: '700',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  eventDesc: {
    flex: 1,
    color: 'var(--color-text)',
  },
  eventTime: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
};

