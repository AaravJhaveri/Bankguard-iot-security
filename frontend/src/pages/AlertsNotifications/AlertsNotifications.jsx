import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSensor } from '../../context/SensorContext';
import AlertBadge from '../../components/AlertBadge/AlertBadge';
import toast from 'react-hot-toast';

export default function AlertsNotifications() {
  const { isManager } = useAuth();
  const { alerts, setAlerts } = useSensor();
  const [tab, setTab] = useState('ACTIVE'); // 'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/alerts?limit=50');
      setAlerts(res.data.data);
    } catch (err) {
      toast.error('Failed to fetch system alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (alertId) => {
    try {
      const res = await api.put(`/alerts/${alertId}/acknowledge`);
      toast.success('Alert marked as Acknowledged.');
      setAlerts((prev) => prev.map((a) => (a.alertId === alertId ? res.data : a)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to acknowledge alert.');
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const res = await api.put(`/alerts/${alertId}/resolve`);
      toast.success('Alert marked as Resolved.');
      setAlerts((prev) => prev.map((a) => (a.alertId === alertId ? res.data : a)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve alert.');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (tab === 'ALL') return true;
    return a.status === tab;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Security Incident & Environmental Alert Center</h2>
          <p style={styles.subTitle}>Deduplicated incident tracking, manager acknowledgements, and remediation status.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar}>
        {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...styles.tabBtn,
              borderBottom: tab === t ? '3px solid var(--color-primary-light)' : '3px solid transparent',
              color: tab === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: tab === t ? '700' : '500',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Severity</th>
              <th style={styles.th}>Incident Type</th>
              <th style={styles.th}>Source</th>
              <th style={styles.th}>Description & Telemetry</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Logged (IST)</th>
              {isManager && <th style={styles.th}>Manager Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && alerts.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyTd}>Loading security alerts...</td>
              </tr>
            ) : filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyTd}>No alerts found for category: {tab}</td>
              </tr>
            ) : (
              filteredAlerts.map((alert) => (
                <tr key={alert.alertId || alert._id} style={styles.tr}>
                  <td style={styles.td}>
                    <AlertBadge severity={alert.severity} />
                  </td>
                  <td style={{ ...styles.td, fontWeight: '700', fontSize: '12px' }}>{alert.type}</td>
                  <td style={styles.td}>{alert.source}</td>
                  <td style={styles.td}>
                    <div>{alert.description}</div>
                    {alert.relatedReadings && (
                      <div style={styles.telemetryTag}>
                        Telemetry: {JSON.stringify(alert.relatedReadings)}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusTag,
                        backgroundColor:
                          alert.status === 'ACTIVE'
                            ? '#fee2e2'
                            : alert.status === 'ACKNOWLEDGED'
                            ? '#fef3c7'
                            : '#dcfce7',
                        color:
                          alert.status === 'ACTIVE'
                            ? '#991b1b'
                            : alert.status === 'ACKNOWLEDGED'
                            ? '#92400e'
                            : '#166534',
                      }}
                    >
                      {alert.status}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontSize: '12px' }}>
                    {new Date(alert.createdAt || alert.timestamp).toLocaleTimeString()}
                  </td>
                  {isManager && (
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {alert.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleAcknowledge(alert.alertId)}
                            style={styles.ackBtn}
                          >
                            Acknowledge
                          </button>
                        )}
                        {alert.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleResolve(alert.alertId)}
                            style={styles.resolveBtn}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: '800',
    color: 'var(--color-primary)',
  },
  subTitle: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  tabBar: {
    display: 'flex',
    gap: '16px',
    borderBottom: '1px solid var(--color-border)',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    padding: '10px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
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
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: '#f8fafc',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 16px',
    fontSize: '13px',
    color: 'var(--color-text)',
  },
  emptyTd: {
    textAlign: 'center',
    padding: '30px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  telemetryTag: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
    fontFamily: 'monospace',
  },
  statusTag: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  ackBtn: {
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  resolveBtn: {
    padding: '4px 8px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: '1px solid #86efac',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
};

