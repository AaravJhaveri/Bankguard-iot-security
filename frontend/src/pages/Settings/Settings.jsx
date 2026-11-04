import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useSensor } from '../../context/SensorContext';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import toast from 'react-hot-toast';

export default function Settings() {
  const { monitoringMode, piConnected, piLastSeen } = useSensor();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalModeChange, setModalModeChange] = useState(false);
  const [inputValues, setInputValues] = useState({});

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/system/settings');
      setSettings(res.data);
      const initialInputs = {};
      res.data.forEach((s) => {
        initialInputs[s.key] = s.value;
      });
      setInputValues(initialInputs);
    } catch (err) {
      toast.error('Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSetting = async (key) => {
    try {
      const val = inputValues[key];
      const parsedVal = isNaN(Number(val)) ? val : Number(val);
      await api.put(`/system/settings/${key}`, { value: parsedVal });
      toast.success(`Setting ${key} updated.`);
      fetchSettings();
    } catch (err) {
      toast.error('Failed to update setting.');
    }
  };

  const handleToggleMonitoringMode = async () => {
    try {
      const targetMode = monitoringMode === 'ON' ? 'MAINTENANCE' : 'ON';
      await api.put('/system/monitoring-mode', { mode: targetMode, confirmed: true });
      toast.success(`Monitoring mode changed to ${targetMode}`);
      setModalModeChange(false);
    } catch (err) {
      toast.error('Failed to update monitoring mode.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>System Configuration & Security Thresholds</h2>
          <p style={styles.subTitle}>Manager controls for alert triggers, maintenance state, and sensor thresholds.</p>
        </div>
      </div>

      {/* Monitoring Mode Control Panel */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>Master Monitoring Mode Control</div>
          <span
            style={{
              ...styles.modeBadge,
              backgroundColor: monitoringMode === 'ON' ? '#dcfce7' : '#fef3c7',
              color: monitoringMode === 'ON' ? '#166534' : '#92400e',
            }}
          >
            CURRENT MODE: {monitoringMode}
          </span>
        </div>

        <div style={styles.modeBody}>
          <p style={styles.modeDesc}>
            Switching into <strong>MAINTENANCE MODE</strong> suppresses audible branch buzzers and marks the system state as DEGRADED on central dashboards for authorized technician inspections.
          </p>
          <button
            onClick={() => setModalModeChange(true)}
            style={{
              ...styles.modeBtn,
              backgroundColor: monitoringMode === 'ON' ? '#d97706' : 'var(--color-normal)',
            }}
          >
            {monitoringMode === 'ON' ? 'Switch to Maintenance Mode' : 'Restore Active Monitoring (ON)'}
          </button>
        </div>
      </div>

      {/* Thresholds Table */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>Environmental & Physical Security Thresholds</div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Configuration Key</th>
                <th style={styles.th}>Current Value</th>
                <th style={styles.th}>Edit Parameter</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={styles.emptyTd}>Loading configuration keys...</td>
                </tr>
              ) : settings.length === 0 ? (
                <tr>
                  <td colSpan={4} style={styles.emptyTd}>No system thresholds found. Run database seed script.</td>
                </tr>
              ) : (
                settings.map((s) => (
                  <tr key={s.key} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: '700' }}>{s.key}</td>
                    <td style={styles.td}>{JSON.stringify(s.value)}</td>
                    <td style={styles.td}>
                      <input
                        type="text"
                        value={inputValues[s.key] !== undefined ? inputValues[s.key] : s.value}
                        onChange={(e) =>
                          setInputValues({
                            ...inputValues,
                            [s.key]: e.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleSaveSetting(s.key)}
                        style={styles.saveBtn}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diagnostic Connection Summary */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardTitle}>Controller Network Diagnostics</div>
        </div>
        <div style={styles.diagList}>
          <div style={styles.diagItem}>
            <span>Raspberry Pi Status:</span>
            <strong>{piConnected ? 'ONLINE (Continuous Socket.IO Connection)' : 'DISCONNECTED'}</strong>
          </div>
          <div style={styles.diagItem}>
            <span>Last Heartbeat Received:</span>
            <strong>{piLastSeen ? new Date(piLastSeen).toLocaleString() : 'Never'}</strong>
          </div>
          <div style={styles.diagItem}>
            <span>Target Backend URL:</span>
            <code>http://127.0.0.1:5000</code>
          </div>
        </div>
      </div>

      {/* Mode Change Confirmation */}
      <ConfirmModal
        isOpen={modalModeChange}
        title="Confirm Monitoring Mode Change"
        message={`Are you sure you want to switch the master monitoring state to ${
          monitoringMode === 'ON' ? 'MAINTENANCE' : 'ON'
        }?`}
        onConfirm={handleToggleMonitoringMode}
        onCancel={() => setModalModeChange(false)}
        danger={monitoringMode === 'ON'}
      />
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
  card: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: '12px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  modeBadge: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  modeBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  modeDesc: {
    fontSize: '13px',
    color: 'var(--color-text)',
    maxWidth: '650px',
    lineHeight: '1.4',
  },
  modeBtn: {
    padding: '10px 18px',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '700',
  },
  tableWrap: {
    overflowX: 'auto',
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
    padding: '10px 14px',
    borderBottom: '1px solid var(--color-border)',
    backgroundColor: '#f8fafc',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--color-text)',
  },
  emptyTd: {
    textAlign: 'center',
    padding: '24px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  input: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid var(--color-border)',
    fontSize: '13px',
    width: '120px',
  },
  saveBtn: {
    padding: '6px 12px',
    backgroundColor: 'var(--color-primary-light)',
    color: '#ffffff',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  diagList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '13px',
  },
  diagItem: {
    display: 'flex',
    gap: '12px',
    color: 'var(--color-text)',
  },
};

