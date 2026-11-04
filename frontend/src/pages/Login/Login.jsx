import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId || !password) {
      setErrorMsg('Please enter both employee ID and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      await login(employeeId, password);
      navigate('/overview');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.shieldIcon}>🛡️</div>
          <h1 style={styles.title}>BANKGUARD</h1>
          <p style={styles.subtitle}>Security Operations Center — Login Portal</p>
        </div>

        {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Employee ID</label>
            <input
              type="text"
              placeholder="e.g. MGR001 or EMP001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
              style={styles.input}
              disabled={loading}
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter account password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleBtn}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Authenticating...' : 'Sign In to Security Console'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.note}>
            <strong>Restricted Access:</strong> Authorized bank personnel only. All access attempts and login events are permanently recorded in the immutable audit log.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg)',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    textAlign: 'center',
  },
  shieldIcon: {
    fontSize: '36px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '800',
    letterSpacing: '1px',
    color: 'var(--color-primary)',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #f87171',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  passwordWrapper: {
    display: 'flex',
    position: 'relative',
    alignItems: 'center',
  },
  passwordInput: {
    width: '100%',
    padding: '10px 14px',
    paddingRight: '60px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontSize: '14px',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  toggleBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--color-primary-light)',
    cursor: 'pointer',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '12px',
    borderRadius: '6px',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '700',
    letterSpacing: '0.3px',
    transition: 'background 0.2s',
  },
  footer: {
    borderTop: '1px solid var(--color-border)',
    paddingTop: '16px',
    textAlign: 'center',
  },
  note: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.5',
  },
};

