import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSensor } from '../../context/SensorContext';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { piConnected, activeAlerts } = useSensor();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time in Asia/Kolkata (IST = UTC+5:30)
      const options = {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };
      setTimeStr(new Intl.DateTimeFormat('en-IN', options).format(now) + ' IST');
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.logoBadge}>🛡️</div>
        <div>
          <div style={styles.title}>BANKGUARD</div>
          <div style={styles.subtitle}>Branch Security Operations Center</div>
        </div>
      </div>

      <div style={styles.center}>
        <span style={styles.clockIcon}>🕒</span>
        <span style={styles.clockText}>{timeStr}</span>
      </div>

      <div style={styles.right}>
        {/* Pi status indicator */}
        <div style={styles.piBadge}>
          <span
            style={{
              ...styles.dot,
              backgroundColor: piConnected ? 'var(--color-normal)' : 'var(--color-critical)',
            }}
          />
          <span style={styles.piText}>Pi: {piConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>

        {/* Alerts Pill */}
        <Link to="/alerts" style={styles.alertPill}>
          <span>🔔</span>
          <span style={styles.alertCount}>{activeAlerts.length}</span>
        </Link>

        {/* User Badge */}
        <div style={styles.userBadge}>
          <span style={styles.userName}>{user?.name}</span>
          <span
            style={{
              ...styles.roleChip,
              backgroundColor: user?.role === 'MANAGER' ? '#dbeafe' : '#f3f4f6',
              color: user?.role === 'MANAGER' ? '#1e40af' : '#4b5563',
            }}
          >
            {user?.role}
          </span>
        </div>

        <button onClick={logout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '64px',
    backgroundColor: 'var(--color-topbar-bg)',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: 'var(--shadow)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoBadge: {
    fontSize: '24px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    color: 'var(--color-primary)',
  },
  subtitle: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#f8fafc',
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid var(--color-border)',
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--color-text)',
  },
  clockIcon: {
    fontSize: '14px',
  },
  clockText: {
    letterSpacing: '0.2px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  piBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '16px',
    backgroundColor: '#f1f5f9',
    fontSize: '12px',
    fontWeight: '600',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  piText: {
    color: 'var(--color-text)',
  },
  alertPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '700',
  },
  alertCount: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '10px',
    padding: '1px 6px',
    fontSize: '11px',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderLeft: '1px solid var(--color-border)',
    paddingLeft: '14px',
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--color-text)',
  },
  roleChip: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'background 0.15s',
  },
};

