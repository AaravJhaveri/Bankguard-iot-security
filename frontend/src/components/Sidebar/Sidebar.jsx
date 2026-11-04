import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { isManager } = useAuth();

  const navItems = [
    { path: '/overview', label: 'Overview', icon: '📊' },
    { path: '/bank-branch', label: 'Bank Branch', icon: '🏢' },
    { path: '/vault', label: 'Vault Monitoring', icon: '🔒' },
    ...(isManager ? [{ path: '/employees', label: 'Employee Mgmt', icon: '👥' }] : []),
    { path: '/access-control', label: 'Access Control', icon: '🔑' },
    { path: '/alerts', label: 'Alerts & Actions', icon: '🚨' },
    { path: '/event-logs', label: 'Event Logs', icon: '📜' },
    { path: '/sensor-health', label: 'Sensor Health', icon: '🩺' },
    ...(isManager ? [{ path: '/settings', label: 'Settings', icon: '⚙️' }] : []),
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.navSection}>
        <div style={styles.sectionHeader}>NAVIGATION</div>
        <nav style={styles.nav}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                ...styles.link,
                backgroundColor: isActive ? '#2b4d7e' : 'transparent',
                fontWeight: isActive ? '600' : '400',
                borderLeft: isActive ? '4px solid #60a5fa' : '4px solid transparent',
              })}
            >
              <span style={styles.icon}>{item.icon}</span>
              <span style={styles.label}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div style={styles.footer}>
        <div style={styles.modeText}>Mode: Local Operation</div>
        <div style={styles.versionText}>BankGuard v1.0.0 (SOC)</div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '240px',
    backgroundColor: 'var(--color-sidebar-bg)',
    color: 'var(--color-sidebar-text)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 'calc(100vh - 64px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
  },
  navSection: {
    padding: '16px 0',
  },
  sectionHeader: {
    padding: '0 20px 10px',
    fontSize: '11px',
    letterSpacing: '1px',
    color: '#94a3b8',
    fontWeight: '700',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '11px 20px',
    color: '#e2e8f0',
    fontSize: '14px',
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  icon: {
    fontSize: '16px',
  },
  label: {
    letterSpacing: '0.2px',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '11px',
    color: '#94a3b8',
  },
  modeText: {
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: '2px',
  },
  versionText: {
    opacity: 0.8,
  },
};

