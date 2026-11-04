import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function SensorHealth() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/sensors/health');
      setSensors(res.data);
    } catch (err) {
      toast.error('Failed to query sensor health diagnostics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ONLINE':
        return { bg: '#dcfce7', text: '#166534', border: 'var(--color-normal)' };
      case 'STALE':
        return { bg: '#fef3c7', text: '#92400e', border: 'var(--color-warning)' };
      case 'OFFLINE':
      case 'ERROR':
        return { bg: '#fee2e2', text: '#991b1b', border: 'var(--color-critical)' };
      default:
        return { bg: '#f1f5f9', text: '#475569', border: 'var(--color-border)' };
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Hardware Sensor & Controller Diagnostics</h2>
          <p style={styles.subTitle}>Live telemetry health monitor, connection heartbeat, and driver diagnostic status.</p>
        </div>
        <button onClick={fetchHealth} style={styles.refreshBtn}>
          🔄 Refresh Diagnostics
        </button>
      </div>

      {/* Sensor Health Grid */}
      <div style={styles.grid}>
        {loading && sensors.length === 0 ? (
          <div style={styles.loading}>Probing connected hardware modules...</div>
        ) : (
          sensors.map((s) => {
            const style = getStatusStyle(s.status);
            return (
              <div
                key={s.id}
                style={{
                  ...styles.card,
                  borderLeft: `4px solid ${style.border}`,
                }}
              >
                <div style={styles.cardHeader}>
                  <div style={styles.nameWrap}>
                    <span style={styles.zoneBadge}>{s.zone}</span>
                    <h4 style={styles.name}>{s.name}</h4>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: style.bg,
                      color: style.text,
                    }}
                  >
                    {s.status}
                  </span>
                </div>

                <div style={styles.detailsRow}>
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Telemetry Feedback:</span>
                    <span style={styles.detailVal}>{s.details || s.state || 'Normal'}</span>
                  </div>
                </div>

                <div style={styles.footer}>
                  {s.lastUpdate ? (
                    <span>Last heartbeat: {formatDistanceToNow(new Date(s.lastUpdate), { addSuffix: true })}</span>
                  ) : (
                    <span>Never received heartbeat</span>
                  )}
                </div>
              </div>
            );
          })
        )}
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
  refreshBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--color-border)',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: 'var(--shadow)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    padding: '16px',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  zoneBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--color-text)',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  detailsRow: {
    margin: '12px 0 6px',
  },
  detailItem: {
    display: 'flex',
    gap: '6px',
    fontSize: '13px',
  },
  detailLabel: {
    color: 'var(--color-text-muted)',
  },
  detailVal: {
    fontWeight: '600',
    color: 'var(--color-text)',
  },
  footer: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    borderTop: '1px dashed var(--color-border)',
    paddingTop: '6px',
  },
};

