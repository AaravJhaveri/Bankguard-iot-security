import React from 'react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, danger = false }) {
  if (!isOpen) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={{ fontSize: '20px' }}>{danger ? '⚠️' : 'ℹ️'}</span>
          <h3 style={styles.title}>{title}</h3>
        </div>
        <div style={styles.body}>
          <p style={styles.message}>{message}</p>
        </div>
        <div style={styles.footer}>
          <button onClick={onCancel} style={styles.cancelBtn}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...styles.confirmBtn,
              backgroundColor: danger ? 'var(--color-critical)' : 'var(--color-primary-light)',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '420px',
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: 'var(--color-text)',
  },
  body: {},
  message: {
    fontSize: '14px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.5',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '8px',
  },
  cancelBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '13px',
    fontWeight: '600',
    border: '1px solid #cbd5e1',
  },
  confirmBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '600',
  },
};

