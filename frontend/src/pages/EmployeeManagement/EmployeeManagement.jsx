import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formId, setFormId] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('EMPLOYEE');
  const [formPassword, setFormPassword] = useState('');
  const [formRfid, setFormRfid] = useState('');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setEmployees(res.data);
    } catch (err) {
      toast.error('Failed to load personnel list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!formName || !formId || !formPassword) {
      toast.error('Name, Employee ID, and Password are required.');
      return;
    }

    try {
      await api.post('/users', {
        name: formName,
        employeeId: formId.trim().toUpperCase(),
        email: formEmail,
        role: formRole,
        password: formPassword,
        rfidUid: formRfid || null,
      });
      toast.success(`Account for ${formName} registered.`);
      setShowAddModal(false);
      // Reset form
      setFormName('');
      setFormId('');
      setFormEmail('');
      setFormPassword('');
      setFormRfid('');
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to register employee.');
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingUser) return;
    try {
      await api.delete(`/users/${deactivatingUser._id}`);
      toast.success(`Account ${deactivatingUser.name} deactivated.`);
      setDeactivatingUser(null);
      fetchEmployees();
    } catch (err) {
      toast.error('Failed to deactivate account.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Personnel & Access Credential Management</h2>
          <p style={styles.subTitle}>Manage authorized bank branch staff, assigned cards, and role permissions.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} style={styles.addBtn}>
          + Register Employee
        </button>
      </div>

      <div style={styles.disclaimer}>
        <strong>Card Sharing Protocol Notice:</strong> As single-card demonstration units share identical RF UIDs across tags, identity authentication must occur via Employee ID credentials in the authorization portal.
      </div>

      {/* Employees Table */}
      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee ID</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>RFID UID Assignment</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>Loading personnel directory...</td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>No accounts found.</td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp._id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: '700' }}>{emp.employeeId}</td>
                  <td style={styles.td}>{emp.name}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.roleChip,
                        backgroundColor: emp.role === 'MANAGER' ? '#dbeafe' : '#f1f5f9',
                        color: emp.role === 'MANAGER' ? '#1e40af' : '#475569',
                      }}
                    >
                      {emp.role}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusChip,
                        backgroundColor: emp.isActive ? '#dcfce7' : '#fee2e2',
                        color: emp.isActive ? '#166534' : '#991b1b',
                      }}
                    >
                      {emp.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </td>
                  <td style={styles.td}>{emp.rfidUid || 'Unassigned / Shared'}</td>
                  <td style={styles.td}>
                    {emp.isActive && emp.role !== 'MANAGER' && (
                      <button
                        onClick={() => setDeactivatingUser(emp)}
                        style={styles.deactivateBtn}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div style={styles.backdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3>Register Branch Staff Account</h3>
              <button onClick={() => setShowAddModal(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateEmployee} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={styles.input}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Employee ID *</label>
                <input
                  type="text"
                  required
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  style={styles.input}
                  placeholder="e.g. EMP002"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  style={styles.input}
                  placeholder="staff@bankguard.local"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Role Permission *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  style={styles.input}
                >
                  <option value="EMPLOYEE">Employee (Branch Operations)</option>
                  <option value="MANAGER">Manager (Vault & Actuator Controls)</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Initial Password *</label>
                <input
                  type="password"
                  required
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  style={styles.input}
                  placeholder="Min 6 characters"
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Assigned RFID UID (Optional)</label>
                <input
                  type="text"
                  value={formRfid}
                  onChange={(e) => setFormRfid(e.target.value)}
                  style={styles.input}
                  placeholder="Leave blank for shared tag"
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowAddModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn}>
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate confirmation */}
      <ConfirmModal
        isOpen={!!deactivatingUser}
        title="Confirm Deactivation"
        message={`Are you sure you want to deactivate ${deactivatingUser?.name} (${deactivatingUser?.employeeId})? They will immediately lose login privileges.`}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivatingUser(null)}
        danger={true}
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
  addBtn: {
    backgroundColor: 'var(--color-primary-light)',
    color: '#ffffff',
    padding: '10px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
  },
  disclaimer: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    color: '#1e3a8a',
    borderRadius: 'var(--radius)',
    padding: '12px 16px',
    fontSize: '12px',
    lineHeight: '1.4',
  },
  tableCard: {
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
  roleChip: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  statusChip: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  deactivateBtn: {
    padding: '4px 10px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #f87171',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    width: '460px',
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius)',
    padding: '24px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: 'var(--color-text)',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontSize: '13px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
  },
  cancelBtn: {
    padding: '8px 14px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
    fontSize: '13px',
  },
  saveBtn: {
    padding: '8px 16px',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
  },
};

