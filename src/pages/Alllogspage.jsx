// ─────────────────────────────────────────────────────────────────────────────
// AllLogsPage.jsx — Paginated feed of every log, with date filter
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
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

// ── Log Card ──────────────────────────────────────────────────────────────────
function LogCard({ log, onProfileClick }) {
  const user = log.userId;
  const name = user?.displayName || user?.username || 'Unknown';
  const edited = wasEdited(log);

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <div style={cardStyles.left}>
          <div style={cardStyles.avatar} onClick={() => onProfileClick(user?._id)} title="View profile">
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={cardStyles.identity}>
            <div style={cardStyles.nameRow}>
              <span style={cardStyles.name} onClick={() => onProfileClick(user?._id)}>
                {name}
              </span>
              {user?.role === 'admin' && (
                <span style={cardStyles.rolePill}>admin</span>
              )}
            </div>
            <span style={cardStyles.username} className="mono">@{user?.username}</span>
          </div>
        </div>
        <div style={cardStyles.dateBlock}>
          <span style={cardStyles.dateMain}>{formatFullDate(log.date)}</span>
          <span style={cardStyles.dateTime} className="mono">
            Submitted at {formatTime(log.createdAt)}
          </span>
        </div>
      </div>

      <div style={cardStyles.divider} />

      <p style={cardStyles.content}>{log.content}</p>

      {edited && (
        <div style={cardStyles.footer}>
          <span style={cardStyles.editedBadge}>
            ✎ Edited · {formatEditedAt(log.updatedAt)}
          </span>
        </div>
      )}
    </div>
  );
}

const cardStyles = {
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  left: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: 'pointer',
  },
  identity: { display: 'flex', flexDirection: 'column', gap: 3 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8 },
  name: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
  rolePill: {
    fontSize: '9px',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    padding: '2px 6px',
    borderRadius: 99,
    background: 'var(--accent-dim)',
    color: 'var(--accent)',
    border: '1px solid var(--accent-border)',
  },
  username: { fontSize: '12px', color: 'var(--text-muted)' },
  dateBlock: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  dateMain: { fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.01em' },
  dateTime: { fontSize: '11px', color: 'var(--text-muted)' },
  divider: { height: 1, background: 'var(--border)' },
  content: { fontSize: '13px', lineHeight: '1.8', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 },
  footer: { paddingTop: 2 },
  editedBadge: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent)',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    borderRadius: 99,
    padding: '3px 10px',
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
        {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total} logs`}
      </span>
      <div style={pgStyles.controls}>
        <button className="btn btn-secondary btn-sm" onClick={() => onPage(page - 1)} disabled={!hasPrev}>
          ← Previous
        </button>
        <span style={pgStyles.pageNum} className="mono">Page {page} of {totalPages || 1}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => onPage(page + 1)} disabled={!hasNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

const pgStyles = {
  wrap: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 4px', flexWrap: 'wrap', gap: 12 },
  info: { fontSize: '12px', color: 'var(--text-muted)' },
  controls: { display: 'flex', alignItems: 'center', gap: 10 },
  pageNum: { fontSize: '12px', color: 'var(--text-secondary)', minWidth: 80, textAlign: 'center' },
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AllLogsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetchLogs = useCallback(async (p, date) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getAllLogs(p, 30, date || null);
      setData(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, dateFilter);
  }, [page, dateFilter, fetchLogs]);

  function handleDateChange(e) {
    setDateFilter(e.target.value);
    setPage(1);
  }

  function clearDate() {
    setDateFilter('');
    setPage(1);
  }

  return (
    <>
      <div style={pageStyles.topRow}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')} style={{ marginBottom: 12 }}>
            ← Back to dashboard
          </button>
          <h1 style={pageStyles.title}>All Logs</h1>
          <p style={pageStyles.subtitle} className="mono">
            Every submission across the team · newest first
          </p>
        </div>
        {data?.pagination && (
          <div style={pageStyles.totalPill} className="mono">
            {data.pagination.total} {dateFilter ? 'matching' : 'total'} entries
          </div>
        )}
      </div>

      {/* Date filter */}
      <div style={pageStyles.filterRow}>
        <div style={pageStyles.filterLabel} className="mono">Filter by date</div>
        <div style={pageStyles.filterInputWrap}>
          <input
            type="date"
            value={dateFilter}
            max={today}
            onChange={handleDateChange}
            style={pageStyles.dateInput}
          />
          {dateFilter && (
            <button className="btn btn-ghost btn-sm" onClick={clearDate}>
              × Clear
            </button>
          )}
        </div>
        {dateFilter && (
          <span style={pageStyles.filterActive} className="mono">
            Showing: {new Date(...dateFilter.split('-').map((n,i)=>i===1?+n-1:+n)).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
          </span>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div className="loading-center" style={{ padding: '60px 0' }}>
          <div className="spinner" /><span>Loading logs…</span>
        </div>
      ) : data?.logs?.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <div className="empty-icon">📭</div>
          <p>{dateFilter ? 'No logs submitted on this date.' : 'No logs have been submitted yet.'}</p>
          {dateFilter && <button className="btn btn-secondary btn-sm" onClick={clearDate}>Clear filter</button>}
        </div>
      ) : (
        <>
          {data?.pagination && <Pagination pagination={data.pagination} onPage={(p) => setPage(p)} />}
          <div style={pageStyles.feed}>
            {data.logs.map((log) => (
              <LogCard
                key={log._id}
                log={log}
                onProfileClick={(uid) => uid && navigate(`/admin/employee/${uid}`)}
              />
            ))}
          </div>
          {data?.pagination && <Pagination pagination={data.pagination} onPage={(p) => setPage(p)} />}
        </>
      )}
    </>
  );
}

const pageStyles = {
  topRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 16,
    flexWrap: 'wrap',
  },
  title: { fontSize: '28px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '12px', color: 'var(--text-muted)', margin: 0 },
  totalPill: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 99,
    padding: '6px 14px',
    alignSelf: 'flex-start',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    flexWrap: 'wrap',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 16px',
  },
  filterLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    whiteSpace: 'nowrap',
  },
  filterInputWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  dateInput: {
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: '13px',
    padding: '6px 10px',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
    colorScheme: 'dark',
  },
  filterActive: {
    fontSize: '12px',
    color: 'var(--accent)',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    borderRadius: 99,
    padding: '3px 10px',
  },
  feed: { display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 },
};