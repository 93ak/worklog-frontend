// ─────────────────────────────────────────────────────────────────────────────
// AdminDashboard.jsx — Team overview with date range, drill-down, analytics
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import { useDateRange } from '../context/DateRangeContext';
import { useFilter } from '../hooks/useFilter';
import { formatRangeLabel, todayStr } from '../utils/dateRange';
import DateRangePicker from '../components/DateRangePicker';
import SearchFilter from '../components/SearchFilter';
import DayDrillDown from '../components/DayDrillDown';
import EmployeeAnalyticsModal from '../components/EmployeeAnalyticsModal';
import MyLogPanel from '../components/MyLogPanel';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { range } = useDateRange();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Drill-down: selected date for day detail panel
  const [drillDate, setDrillDate] = useState(null);

  // Analytics modal
  const [analyticsId, setAnalyticsId] = useState(null);

  // Log preview modal: { emp, log | null, date }
  const [logPreview, setLogPreview] = useState(null);

  // ── Fetch overview whenever date range changes ─────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getOverview({ start: range.start, end: range.end });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load overview');
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // ── Employee list + filter ─────────────────────────────────────────────────
  const employees = data?.employees || [];
  const { search, setSearch, status, setStatus, filtered, counts } = useFilter(employees);

  const submittedCount = counts.submitted;
  const submittedPct = employees.length
    ? Math.round((submittedCount / employees.length) * 100)
    : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleEmployeeClick(emp) {
    try {
      const date = isSingleDay ? range.start : range.end;
      const res = await adminAPI.getDayDrillDown(date);
      const submitted = res.submitted.find((s) => s._id === emp._id);
      setLogPreview({
        emp,
        log: submitted?.log || null,
        date,
      });
    } catch {
      // fallback: just show no log
      setLogPreview({ emp, log: null, date: range.end });
    }
  }

  function handleDrillClose() {
    setDrillDate(null);
  }

  const isSingleDay = range.start === range.end;
  const rangeLabel = formatRangeLabel(range.start, range.end);

  return (
    <>
      {/* Log preview modal */}
      {logPreview && (
        <LogPreviewModal
          emp={logPreview.emp}
          log={logPreview.log}
          date={logPreview.date}
          onClose={() => setLogPreview(null)}
          onAnalytics={(id) => { setLogPreview(null); setAnalyticsId(id); }}
          onProfile={(id) => { setLogPreview(null); navigate(`/admin/employee/${id}`); }}
        />
      )}

      {/* Analytics modal */}
      {analyticsId && (
        <EmployeeAnalyticsModal
          employeeId={analyticsId}
          onClose={() => setAnalyticsId(null)}
        />
      )}

      {/* Page header with date range picker */}
      <div style={styles.pageTop}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Team Overview</h1>
          <p className="mono">{rangeLabel} — Submission status</p>
        </div>
        <DateRangePicker />
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: 16 }}>{error}</div>}

      {/* Summary cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryNum}>{employees.length}</span>
          <span style={styles.summaryLabel}>Total employees</span>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: 'rgba(61,214,140,0.3)' }}>
          <span style={{ ...styles.summaryNum, color: 'var(--green)' }}>{submittedCount}</span>
          <span style={styles.summaryLabel}>Submitted</span>
        </div>
        <div style={{ ...styles.summaryCard, borderColor: 'rgba(247,111,111,0.3)' }}>
          <span style={{ ...styles.summaryNum, color: 'var(--red)' }}>{counts.missing}</span>
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

      {/* Main layout: table + optional drill-down panel + my log panel */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Employee table */}
        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="card-title">Employees</div>
              <div className="card-subtitle">
                {isSingleDay
                  ? 'Click a row to view their log · Use See Profile or Analytics for more'
                  : `Showing any submission within ${rangeLabel}`}
              </div>
            </div>
            <SearchFilter
              search={search}
              onSearch={setSearch}
              status={status}
              onStatus={setStatus}
              counts={counts}
            />
          </div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
              <span>Loading team data…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>No employees found for this filter.</p>
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
                      onClick={() => handleEmployeeClick(emp)}
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
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/employee/${emp._id}`);
                            }}
                          >
                            See Profile
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnalyticsId(emp._id);
                            }}
                          >
                            Analytics
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Today drill-down shortcut — only when single day selected */}
          {isSingleDay && !loading && (
            <div style={styles.drillShortcut}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setDrillDate(range.start)}
                style={{ fontSize: '12px', color: 'var(--accent)' }}
              >
                📅 View {range.start === todayStr() ? "today's" : rangeLabel} submission detail
              </button>
            </div>
          )}
        </div>

        {/* Day drill-down panel */}
        {drillDate && (
          <DayDrillDown
            date={drillDate}
            onClose={handleDrillClose}
            onEmployeeClick={(id) => {
              handleDrillClose();
              setAnalyticsId(id);
            }}
          />
        )}

        {/* Admin's own log panel */}
        <MyLogPanel />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LogPreviewModal — shows a single employee's log for a specific date
// ─────────────────────────────────────────────────────────────────────────────

function LogPreviewModal({ emp, log, date, onClose, onAnalytics, onProfile }) {
  const name = emp.displayName || emp.username;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={modalStyles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={modalStyles.box}>
        {/* Header */}
        <div style={modalStyles.header}>
          <div style={modalStyles.empRow}>
            <div style={modalStyles.avatar}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={modalStyles.name}>{name}</div>
              <div style={modalStyles.sub} className="mono">
                @{emp.username} · {date}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onProfile(emp._id)}
            >
              See Profile
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onAnalytics(emp._id)}
            >
              📊 Analytics
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              style={{ fontSize: 20, lineHeight: 1, padding: '4px 8px' }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={modalStyles.divider} />

        {/* Log content */}
        {log ? (
          <div style={modalStyles.logWrap}>
            <div style={modalStyles.logMeta}>
              <span className="badge badge-green">
                <span className="status-dot green" />
                Submitted
              </span>
              <span style={modalStyles.timestamp} className="mono">
                {new Date(log.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <p style={modalStyles.logContent}>{log.content}</p>
          </div>
        ) : (
          <div style={modalStyles.empty}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>📭</span>
            <p style={modalStyles.emptyText}>No log submitted for this date.</p>
            <span className="badge badge-red">
              <span className="status-dot red" />
              Missing
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(2px)',
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  box: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow)',
    width: '100%',
    maxWidth: 480,
    padding: 24,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  empRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  sub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: 'var(--border)',
    margin: '0 0 20px 0',
  },
  logWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  logMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  timestamp: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  logContent: {
    fontSize: '13px',
    lineHeight: '1.75',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    margin: 0,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: '32px 0',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    margin: 0,
  },
};

const styles = {
  pageTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
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
  drillShortcut: {
    borderTop: '1px solid var(--border)',
    padding: '12px 0 0 0',
    marginTop: 16,
    textAlign: 'center',
  },
};