import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'submitted' | 'missing'

  const fetchOverview = useCallback(async () => {
    try {
      const res = await adminAPI.getOverview();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const employees = data?.employees || [];
  const submitted = employees.filter((e) => e.submittedToday);
  const missing = employees.filter((e) => !e.submittedToday);

  const filtered =
    filter === 'submitted' ? submitted
    : filter === 'missing' ? missing
    : employees;

  const submittedPct = employees.length
    ? Math.round((submitted.length / employees.length) * 100)
    : 0;

  return (
    <>
      <div className="page-header">
        <h1>Team Overview</h1>
        <p>
          {data?.date || new Date().toISOString().split('T')[0]} — Daily submission status
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryNum}>{employees.length}</span>
          <span style={styles.summaryLabel}>Total employees</span>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: 'rgba(61,214,140,0.3)' }}>
          <span style={{ ...styles.summaryNum, color: 'var(--green)' }}>{submitted.length}</span>
          <span style={styles.summaryLabel}>Submitted today</span>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: 'rgba(247,111,111,0.3)' }}>
          <span style={{ ...styles.summaryNum, color: 'var(--red)' }}>{missing.length}</span>
          <span style={styles.summaryLabel}>Not submitted</span>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: 'rgba(245,166,35,0.3)' }}>
          <span style={{ ...styles.summaryNum, color: 'var(--accent)' }}>{submittedPct}%</span>
          <span style={styles.summaryLabel}>Completion rate</span>
        </div>
      </div>

      {/* Progress bar */}
      {employees.length > 0 && (
        <div style={styles.progressWrap}>
          <div style={{ ...styles.progressBar, width: `${submittedPct}%` }} />
        </div>
      )}

      {/* Employee table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Employees</div>
            <div className="card-subtitle">Click a row to view their log calendar</div>
          </div>
          {/* Filter tabs */}
          <div style={styles.filterTabs}>
            {['all', 'submitted', 'missing'].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize' }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `All (${employees.length})`
                  : f === 'submitted' ? `✓ Submitted (${submitted.length})`
                  : `✗ Missing (${missing.length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-center">
            <div className="spinner" />
            <span>Loading team data…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>No employees found in this filter.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr
                    key={emp._id}
                    onClick={() => navigate(`/admin/employee/${emp._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={styles.empName}>
                        <div style={styles.avatar}>
                          {(emp.displayName || emp.username).charAt(0).toUpperCase()}
                        </div>
                        <span className="fw-500">
                          {emp.displayName || emp.username}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="mono text-secondary" style={{ fontSize: 12 }}>
                        {emp.username}
                      </span>
                    </td>
                    <td>
                      {emp.submittedToday ? (
                        <span className="badge badge-green">
                          <span className="status-dot green" />
                          Submitted
                        </span>
                      ) : (
                        <span className="badge badge-red">
                          <span className="status-dot red" />
                          Missing
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/employee/${emp._id}`);
                        }}
                      >
                        View calendar →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 16,
  },
  summaryCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  summaryNum: {
    fontFamily: 'var(--font-mono)',
    fontSize: '28px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontFamily: 'var(--font-mono)',
  },
  progressWrap: {
    height: 4,
    background: 'var(--border)',
    borderRadius: 99,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: 'var(--green)',
    borderRadius: 99,
    transition: 'width 0.6s ease',
  },
  filterTabs: {
    display: 'flex',
    gap: 8,
  },
  empName: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
