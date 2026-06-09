import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div className="navbar-brand">
          WORK<span>LOG</span>
        </div>
        {isAdmin && (
          <div style={navStyles.links}>
            <button
              style={{
                ...navStyles.link,
                ...(location.pathname === '/admin' ? navStyles.linkActive : {}),
              }}
              onClick={() => navigate('/admin')}
            >
              Dashboard
            </button>
            <button
              style={{
                ...navStyles.link,
                ...(location.pathname === '/admin/logs' ? navStyles.linkActive : {}),
              }}
              onClick={() => navigate('/admin/logs')}
            >
              All Logs
            </button>
          </div>
        )}
      </div>
      <div className="navbar-right">
        <div className="nav-user">
          <strong>{user?.displayName || user?.username}</strong>
        </div>
        <span className={`nav-badge ${user?.role}`}>{user?.role}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

const navStyles = {
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: 'var(--radius)',
    transition: 'color 0.15s ease, background 0.15s ease',
  },
  linkActive: {
    color: 'var(--text-primary)',
    background: 'var(--bg-card)',
  },
};