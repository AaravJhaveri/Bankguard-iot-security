import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function AccessControl() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoneFilter, setZoneFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');

  const fetchAccessLogs = async () => {
    try {
      setLoading(true);
      let url = `/events?category=ACCESS_ATTEMPT&page=${page}&limit=20`;
      const res = await api.get(url);
      setLogs(res.data.data);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load access logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessLogs();
  }, [page]);

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/events/export?category=ACCESS_ATTEMPT', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bankguard_access_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Access audit log exported as CSV.');
    } catch (err) {
      toast.error('Failed to export CSV file.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Access Control & Checkpoint Verification</h2>
          <p style={styles.subTitle}>Audit log of RFID scans, employee credentials, and door clearance results.</p>
        </div>
        <button onClick={handleExportCsv} style={styles.exportBtn}>
          📥 Export CSV Audit Log
        </button>
      </div>

      {/* Access Attempts Table */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Timestamp (IST)</th>
              <th style={styles.th}>Source</th>
              <th style={styles.th}>Severity</th>
              <th style={styles.th}>Verification Details</th>
              <th style={styles.th}>Personnel Identity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={styles.emptyTd}>Loading access events...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={styles.emptyTd}>No recorded access entries found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id || log.eventId} style={styles.tr}>
                  <td style={styles.td}>{new Date(log.timestamp).toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={styles.sourceChip}>{log.source}</span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.sevChip,
                        backgroundColor: log.severity === 'HIGH' ? '#fee2e2' : '#dcfce7',
                        color: log.severity === 'HIGH' ? '#991b1b' : '#166534',
                      }}
                    >
                      {log.severity}
                    </span>
                  </td>
                  <td style={styles.td}>{log.description}</td>
                  <td style={styles.td}>
                    {log.employeeRef ? `${log.employeeRef.name} (${log.employeeRef.employeeId})` : 'Unidentified / Shared Tag'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div style={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={styles.pageBtn}
          >
            Previous
          </button>
          <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            style={styles.pageBtn}
          >
            Next
          </button>
        </div>
      </div>
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
  exportBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid var(--color-border)',
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-text)',
    boxShadow: 'var(--shadow)',
  },
  card: {
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
  sourceChip: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#f1f5f9',
  },
  sevChip: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderTop: '1px solid var(--color-border)',
    backgroundColor: '#f8fafc',
  },
  pageBtn: {
    padding: '6px 12px',
    backgroundColor: '#ffffff',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
};

