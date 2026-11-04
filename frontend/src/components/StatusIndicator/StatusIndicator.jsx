import React from 'react';

export default function StatusIndicator({ state, size = 10, label = true }) {
  const getColor = (s) => {
    switch (s) {
      case 'OPEN':
      case 'MOTION_DETECTED':
      case 'DETECTED':
      case 'POSSIBLE_TAMPERING':
        return '#dc2626'; // red alert state
      case 'CLOSED':
      case 'NO_MOTION':
      case 'NORMAL':
      case 'STABLE':
      case 'CLEAR':
        return '#16a34a'; // safe green
      case 'MOVEMENT_DETECTED':
      case 'AUTHORIZED_PASSAGE':
        return '#2563eb'; // blue info
      default:
        return '#94a3b8'; // gray unknown
    }
  };

  const color = getColor(state);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
          boxShadow: `0 0 6px ${color}88`,
        }}
      />
      {label && (
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text)' }}>
          {state || 'UNKNOWN'}
        </span>
      )}
    </div>
  );
}

