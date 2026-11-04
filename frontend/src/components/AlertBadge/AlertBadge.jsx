import React from 'react';

export default function AlertBadge({ severity }) {
  const getStyles = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return { bg: '#fee2e2', text: '#991b1b', border: '#f87171' };
      case 'HIGH':
        return { bg: '#ffedd5', text: '#9a3412', border: '#fb923c' };
      case 'WARNING':
        return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
      case 'INFO':
      default:
        return { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' };
    }
  };

  const style = getStyles(severity);

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        display: 'inline-block',
      }}
    >
      {severity}
    </span>
  );
}

