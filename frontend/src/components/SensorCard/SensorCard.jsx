import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export default function SensorCard({ title, value, unit = '', status = 'ONLINE', lastUpdate, icon, subValue, warning = false }) {
  const getStatusColor = (s) => {
    switch (s) {
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

  const statusStyle = getStatusColor(status);

  return (
    <div
      style={{
        ...styles.card,
        borderLeft: `4px solid ${statusStyle.border}`,
        backgroundColor: warning ? '#fff7ed' : 'var(--color-surface)',
      }}
    >
      <div style={styles.header}>
        <div style={styles.titleWrap}>
          {icon && <span style={styles.icon}>{icon}</span>}
          <span style={styles.title}>{title}</span>
        </div>
        <span
          style={{
            ...styles.badge,
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
          }}
        >
          {status}
        </span>
      </div>

      <div style={styles.valueWrap}>
        <span style={styles.value}>
          {value !== null && value !== undefined ? value : '—'}
        </span>
        {unit && <span style={styles.unit}>{unit}</span>}
      </div>

      {subValue && <div style={styles.subValue}>{subValue}</div>}

      <div style={styles.footer}>
        {lastUpdate ? (
          <span>Updated {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true })}</span>
        ) : (
          <span>No updates received</span>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  icon: {
    fontSize: '16px',
  },
  title: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  badge: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '10px',
    letterSpacing: '0.2px',
  },
  valueWrap: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    margin: '4px 0',
  },
  value: {
    fontSize: '26px',
    fontWeight: '700',
    color: 'var(--color-text)',
  },
  unit: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--color-text-muted)',
  },
  subValue: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  footer: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginTop: '8px',
    borderTop: '1px dashed var(--color-border)',
    paddingTop: '6px',
  },
};

