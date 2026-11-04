import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function LiveChart({ title, data = [], dataKey, color = '#2563eb', unit = '', minVal, maxVal }) {
  const [filter, setFilter] = useState('live');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>{title}</div>
        <div style={styles.filterGroup}>
          {['live', '1h', '24h', '7d'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.filterBtn,
                backgroundColor: filter === f ? 'var(--color-primary)' : '#f1f5f9',
                color: filter === f ? '#ffffff' : '#475569',
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.chartWrap}>
        {data.length === 0 ? (
          <div style={styles.empty}>Waiting for live sensor data stream...</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                domain={[minVal !== undefined ? minVal : 'auto', maxVal !== undefined ? maxVal : 'auto']}
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(val) => [`${val} ${unit}`, title]}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-border)',
    padding: '16px',
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--color-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  filterGroup: {
    display: 'flex',
    gap: '4px',
  },
  filterBtn: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  chartWrap: {
    height: '180px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
};

