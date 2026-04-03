import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CalendarView from './pages/CalendarView';

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-center" style={{ height: '100vh' }}>
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-center" style={{ height: '100vh' }}>
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <LoginPage />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="employee">
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employee/:id"
            element={
              <ProtectedRoute requiredRole="admin">
                <CalendarView />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              <Navigate to={user ? (user.role === 'admin' ? '/admin' : '/dashboard') : '/login'} replace />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
