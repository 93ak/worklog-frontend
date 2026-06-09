// ─────────────────────────────────────────────────────────────────────────────
// AllLogsPage.jsx — Paginated feed of every employee's log submissions
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../utils/api';

// ── Date/time helpers ─────────────────────────────────────────────────────────

function formatFullDate(dateStr) {
  // dateStr is YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatEditedAt(isoStr) {
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function wasEdited(log) {
  return new Date(log.updatedAt) - new Date(log.createdAt) > 2000;
}

// ── Log Card ──────────────────────────────────────────────────────────────────

function LogCard({ log, onEmployeeClick }) {
  const user = log.userId;
  const name = user?.displayName || user?.username || 'Unknown';
  const edited = wasEdited(log);

  return (
    <div style={cardStyles.card}>
      {/* Card header: avatar + name + date/time */}
      <div style={cardStyles.header}>
        <div style={cardStyles.left}>
          <div
            style={cardStyles.avatar}
            onClick={() => onEmployeeClick(user?._id)}
            title="View analytics"
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={cardStyles.identity}>
            <div style={cardStyles.nameRow}>
              <span
                style={cardStyles.name}
                onClick={() => onEmployeeClick(user?._id)}
              >
                {name}
              </span>
              {user?.role === 'admin' && (
                <span style={cardStyles.rolePill}>admin</span>
              )}
            </div>
            <span style={cardStyles.username} className="mono">
              @{user?.username}
            </span>
          </div>
        </div>

        {/* Date + time block */}
        <div style={cardStyles.dateBlock}>
          <span style={cardStyles.dateMain}>{formatFullDate(log.date)}</span>
          <span style={cardStyles.dateTime} className="mono">
            Submitted at {formatTime(log.createdAt)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={cardStyles.divider} />

      {/* Log content */}
      <p style={cardStyles.content}>{log.content}</p>

      {/* Footer: edited indicator */}
      <div style={cardStyles.footer}>
        {edited ? (
          <span style={cardStyles.editedBadge}>
            ✎ Edited · {formatEditedAt(log.updatedAt)}
          </span>
        ) : (
          <span style={cardStyles.originalBadge}>
            ✓ Original — not edited
          </span>
        )}
      </div>
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
    transition: 'border-color 0.15s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
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
    transition: 'background 0.15s',
  },
  identity: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'color 0.1s',
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
  username: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  dateBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  dateMain: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  dateTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  divider: {
    height: 1,
    background: 'var(--border)',
  },
  content: {
    fontSize: '13px',
    lineHeight: '1.8',
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    margin: 0,
    padding: '2px 0',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    paddingTop: 4,
  },
  editedBadge: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--accent)',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent-border)',
    borderRadius: 99,
    padding: '3px 10px',
  },
  originalBadge: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
};

// ── Pagination controls ───────────────────────────────────────────────────────

function Pagination({ pagination, onPage }) {
  const { page, totalPages, total, limit, hasNext, hasPrev } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div style={pgStyles.wrap}>
      <span style={pgStyles.info} className="mono">
        Showing {from}–{to} of {total} logs
      </span>
      <div style={pgStyles.controls}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPage(page - 1)}
          disabled={!hasPrev}
        >
          ← Previous
        </button>
        <span style={pgStyles.pageNum} className="mono">
          Page {page} of {totalPages}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPage(page + 1)}
          disabled={!hasNext}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

const pgStyles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 0 4px',
    flexWrap: 'wrap',
    gap: 12,
  },
  info: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  pageNum: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    minWidth: 80,
    textAlign: 'center',
  },
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AllLogsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async (p) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.getAllLogs(p, 30);
      setData(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  function handlePage(p) {
    setPage(p);
  }

  function handleEmployeeClick(userId) {
    if (userId) navigate(`/admin/employee/${userId}`);
  }

  return (
    <>
      {/* Page header */}
      <div style={pageStyles.topRow}>
        <div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/admin')}
            style={{ marginBottom: 12 }}
          >
            ← Back to dashboard
          </button>
          <h1 style={pageStyles.title}>All Logs</h1>
          <p style={pageStyles.subtitle} className="mono">
            Every submission across the team · newest first
          </p>
        </div>
        {data?.pagination && (
          <div style={pageStyles.totalPill} className="mono">
            {data.pagination.total} total entries
          </div>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {loading ? (
        <div className="loading-center" style={{ padding: '60px 0' }}>
          <div className="spinner" />
          <span>Loading logs…</span>
        </div>
      ) : data?.logs?.length === 0 ? (
        <div className="empty-state" style={{ padding: '60px 0' }}>
          <div className="empty-icon">📭</div>
          <p>No logs have been submitted yet.</p>
        </div>
      ) : (
        <>
          {/* Top pagination */}
          {data?.pagination && (
            <Pagination pagination={data.pagination} onPage={handlePage} />
          )}

          {/* Log cards */}
          <div style={pageStyles.feed}>
            {data.logs.map((log) => (
              <LogCard
                key={log._id}
                log={log}
                onEmployeeClick={handleEmployeeClick}
              />
            ))}
          </div>

          {/* Bottom pagination */}
          {data?.pagination && (
            <Pagination pagination={data.pagination} onPage={handlePage} />
          )}
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
    marginBottom: 8,
    gap: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 6px 0',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: 0,
  },
  totalPill: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 99,
    padding: '6px 14px',
    alignSelf: 'flex-start',
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginTop: 16,
  },
};
