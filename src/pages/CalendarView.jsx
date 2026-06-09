// ─────────────────────────────────────────────────────────────────────────────
// CalendarView.jsx — Employee profile page: calendar + paginated log feed
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';
import EmployeeAnalyticsModal from '../components/EmployeeAnalyticsModal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatEditedAt(isoStr) {
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function wasEdited(log) {
  return new Date(log.updatedAt) - new Date(log.createdAt) > 2000;
}

// ── Small log card for the feed ───────────────────────────────────────────────
function LogEntry({ log }) {
  const edited = wasEdited(log);
  return (
    <div style={entryStyles.card}>
      <div style={entryStyles.dateRow}>
        <span style={entryStyles.dateMain}>{formatFullDate(log.date)}</span>
        <span style={entryStyles.time} className="mono">
          {formatTime(log.createdAt)}
        </span>
      </div>
      <div style={entryStyles.divider} />
      <p style={entryStyles.content}>{log.content}</p>
      {edited && (
        <div style={entryStyles.editedBadge}>
          ✎ Edited · {formatEditedAt(log.updatedAt)}
        </div>
      )}
    </div>
  );
}

const entryStyles = {
  card: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  dateMain: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  time: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
  },
  content: {
    fontSize: '13px',
    lineHeight: '1.75',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    margin: 0,
  },
  editedBadge: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent)',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    borderRadius: 99,
    padding: '3px 10px',
    alignSelf: 'flex-start',
  },
};

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ pagination, onPage }) {
  const { page, totalPages, total, limit, hasNext, hasPrev } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div style={pgStyles.wrap}>
      <span style={pgStyles.info} className="mono">
        {total === 0 ? 'No entries' : `${from}–${to} of ${total}`}
      </span>
      <div style={pgStyles.controls}>
        <button className="btn btn-secondary btn-sm" onClick={() => onPage(page - 1)} disabled={!hasPrev}>
          ← Prev
        </button>
        <span style={pgStyles.pageNum} className="mono">
          {page} / {totalPages || 1}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={() => onPage(page + 1)} disabled={!hasNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

const pgStyles = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  info: { fontSize: '11px', color: 'var(--text-muted)' },
  controls: { display: 'flex', alignItems: 'center', gap: 8 },
  pageNum: { fontSize: '11px', color: 'var(--text-secondary)', minWidth: 40, textAlign: 'center' },
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CalendarView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // All log dates for calendar highlighting (no limit)
  const [allLogDates, setAllLogDates] = useState(new Set());
  const [employee, setEmployee] = useState(null);

  // Selected day filter from calendar click
  const [selectedDate, setSelectedDate] = useState(null);

  // Paginated log feed
  const [feedData, setFeedData] = useState(null);
  const [feedPage, setFeedPage] = useState(1);
  const [feedLoading, setFeedLoading] = useState(true);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Fetch ALL log dates once (for calendar dots)
  useEffect(() => {
    adminAPI.getUserLogs(id)
      .then((res) => {
        setEmployee(res.employee);
        setAllLogDates(new Set(res.logs.map((l) => l.date)));
      })
      .catch((err) => setError(err.message));
  }, [id]);

  // Fetch paginated feed whenever page or selectedDate changes
  const fetchFeed = useCallback(async (page, date) => {
    setFeedLoading(true);
    try {
      const res = await adminAPI.getUserLogsPaged(id, page, 20, date || null);
      setFeedData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setFeedLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFeed(feedPage, selectedDate);
  }, [feedPage, selectedDate, fetchFeed]);

  function handleDayClick(day) {
    if (!day) return;
    const dateStr = toDateStr(calYear, calMonth, day);
    if (dateStr > today) return;
    if (selectedDate === dateStr) {
      // clicking same day deselects
      setSelectedDate(null);
    } else {
      setSelectedDate(dateStr);
    }
    setFeedPage(1);
  }

  function clearDateFilter() {
    setSelectedDate(null);
    setFeedPage(1);
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }

  const cells = buildCalendarGrid(calYear, calMonth);
  const name = employee ? (employee.displayName || employee.username) : '…';

  return (
    <>
      {showAnalytics && (
        <EmployeeAnalyticsModal
          employeeId={id}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: 16 }}>
        ← Back to dashboard
      </button>

      {/* Profile header */}
      <div style={pageStyles.profileHeader}>
        <div style={pageStyles.profileLeft}>
          <div style={pageStyles.bigAvatar}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={pageStyles.profileName}>{name}</h1>
            <div style={pageStyles.profileMeta} className="mono">
              {employee?.username && `@${employee.username}`}
              {employee?.role && ` · ${employee.role}`}
            </div>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAnalytics(true)}>
          📊 Analytics
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Two-column layout */}
      <div style={pageStyles.layout}>
        {/* Left: calendar */}
        <div className="card" style={{ width: 380, flexShrink: 0 }}>
          <div style={pageStyles.monthNav}>
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
            <span style={pageStyles.monthLabel}>{MONTHS[calMonth]} {calYear}</span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
          </div>

          <div style={pageStyles.calGrid}>
            {DAYS.map((d) => (
              <div key={d} style={pageStyles.dayHeader}>{d}</div>
            ))}
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const dateStr = toDateStr(calYear, calMonth, day);
              const hasLog = allLogDates.has(dateStr);
              const isToday = dateStr === today;
              const isSelected = selectedDate === dateStr;
              const isFuture = dateStr > today;

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  style={{
                    ...pageStyles.cell,
                    ...(hasLog ? pageStyles.cellLogged : {}),
                    ...(isToday ? pageStyles.cellToday : {}),
                    ...(isSelected ? pageStyles.cellSelected : {}),
                    ...(isFuture ? pageStyles.cellFuture : {}),
                    cursor: isFuture ? 'default' : 'pointer',
                  }}
                  title={hasLog ? 'Click to filter to this day' : isFuture ? '' : 'No log'}
                >
                  <span style={pageStyles.cellNum}>{day}</span>
                  {hasLog && <span style={pageStyles.cellDot} />}
                </div>
              );
            })}
          </div>

          <div style={pageStyles.legend}>
            <span style={pageStyles.legendItem}>
              <span style={{ ...pageStyles.legendDot, background: 'var(--green)' }} /> Submitted
            </span>
            <span style={pageStyles.legendItem}>
              <span style={{ ...pageStyles.legendDot, background: 'var(--accent)', borderRadius: 2 }} /> Today
            </span>
          </div>
        </div>

        {/* Right: log feed */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Feed header */}
          <div style={pageStyles.feedHeader}>
            <div>
              <div style={pageStyles.feedTitle}>
                {selectedDate ? `Logs for ${formatFullDate(selectedDate)}` : 'All Logs'}
              </div>
              <div style={pageStyles.feedSub} className="mono">
                {selectedDate ? 'Showing selected day only' : 'Newest first · click a calendar day to filter'}
              </div>
            </div>
            {selectedDate && (
              <button className="btn btn-ghost btn-sm" onClick={clearDateFilter}>
                × Clear filter
              </button>
            )}
          </div>

          {feedLoading ? (
            <div className="loading-center" style={{ padding: '40px 0' }}>
              <div className="spinner" /><span>Loading…</span>
            </div>
          ) : feedData?.logs?.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-icon">📭</div>
              <p>{selectedDate ? 'No log submitted for this date.' : 'No logs yet.'}</p>
            </div>
          ) : (
            <>
              {feedData?.pagination && (
                <Pagination pagination={feedData.pagination} onPage={(p) => setFeedPage(p)} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {feedData.logs.map((log) => (
                  <LogEntry key={log._id} log={log} />
                ))}
              </div>
              {feedData?.pagination && (
                <Pagination pagination={feedData.pagination} onPage={(p) => setFeedPage(p)} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

const pageStyles = {
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 16,
    flexWrap: 'wrap',
  },
  profileLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  bigAvatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '20px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileName: {
    fontSize: '24px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 4px 0',
    letterSpacing: '-0.01em',
  },
  profileMeta: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  layout: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
  },
  monthNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  calGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 4,
  },
  dayHeader: {
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    paddingBottom: 8,
  },
  cell: {
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    background: 'var(--bg)',
    border: '1px solid transparent',
    position: 'relative',
    transition: 'all 0.1s ease',
    gap: 2,
  },
  cellLogged: {
    background: 'var(--green-dim)',
    border: '1px solid rgba(61,214,140,0.25)',
  },
  cellToday: {
    border: '1px solid var(--accent)',
    background: 'var(--accent-dim)',
  },
  cellSelected: {
    border: '1px solid var(--blue, #60a5fa)',
    background: 'rgba(96,165,250,0.1)',
  },
  cellFuture: { opacity: 0.3 },
  cellNum: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
  cellDot: {
    width: 4,
    height: 4,
    borderRadius: '50%',
    background: 'var(--green)',
  },
  legend: {
    display: 'flex',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid var(--border)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  feedHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  feedTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  feedSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
};