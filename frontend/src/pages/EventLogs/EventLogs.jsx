import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import AlertBadge from '../../components/AlertBadge/AlertBadge';
import toast from 'react-hot-toast';

export default function EventLogs() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let url = `/events?page=${page}&limit=25`;
      if (categoryFilter) url += `&category=${categoryFilter}`;
      if (severityFilter) url += `&severity=${severityFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const res = await api.get(url);
      setEvents(res.data.data);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error('Failed to load system audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, categoryFilter, severityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleExportCsv = async () => {
    try {
      let url = '/events/export?';
      if (categoryFilter) url += `category=${categoryFilter}&`;
      if (severityFilter) url += `severity=${severityFilter}&`;
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `bankguard_audit_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Event logs exported to CSV.');
    } catch (err) {
      toast.error('Failed to download CSV audit export.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>System Audit Event Logs</h2>
          <p style={styles.subTitle}>Immutable chronological ledger of physical door transitions, alerts, sensor anomalies, and staff logins.</p>
        </div>
        <button onClick={handleExportCsv} style={styles.exportBtn}>
          📥 Export CSV Audit File
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div style={styles.filterBar}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <input
            type="text"
            placeholder="Search log descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>Search</button>
        </form>

        <div style={styles.selectGroup}>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={styles.select}
          >
            <option value="">All Categories</option>
            <option value="RFID_SCAN">RFID SCAN</option>
            <option value="ACCESS_ATTEMPT">ACCESS_ATTEMPT</option>
            <option value="MOTION">MOTION</option>
            <option value="SERVO_COMMAND">SERVO_COMMAND</option>
            <option value="ENVIRONMENTAL">ENVIRONMENTAL</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            style={styles.select}
          >
            <option value="">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      {/* Event Logs Table */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Timestamp (IST)</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Severity</th>
              <th style={styles.th}>Source</th>
              <th style={styles.th}>Log Description</th>
              <th style={styles.th}>Staff Ref</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>Loading audit ledger...</td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyTd}>No recorded events matching query.</td>
              </tr>
            ) : (
              events.map((evt) => (
                <tr key={evt._id || evt.eventId} style={styles.tr}>
                  <td style={{ ...styles.td, fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {new Date(evt.timestamp).toLocaleString()}
                  </td>
                  <td style={styles.td}>
                    <span style={styles.catChip}>{evt.category}</span>
                  </td>
                  <td style={styles.td}>
                    <AlertBadge severity={evt.severity} />
                  </td>
                  <td style={{ ...styles.td, fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {evt.source}
                  </td>
                  <td style={styles.td}>{evt.description}</td>
                  <td style={{ ...styles.td, fontSize: '12px' }}>
                    {evt.employeeRef ? `${evt.employeeRef.name} (${evt.employeeRef.employeeId})` : '—'}
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
    cursor: 'pointer',
    boxShadow: 'var(--shadow)',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  searchForm: {
    display: 'flex',
    gap: '6px',
    flex: 1,
    minWidth: '260px',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontSize: '13px',
  },
  searchBtn: {
    padding: '8px 14px',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
  },
  selectGroup: {
    display: 'flex',
    gap: '8px',
  },
  select: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    fontSize: '13px',
    backgroundColor: '#ffffff',
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
  catChip: {
    fontSize: '10px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
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

