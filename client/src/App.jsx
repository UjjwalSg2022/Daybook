import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import TaskDetail from './pages/TaskDetail.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return children;
}

function FullPageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center font-mono text-ink-soft text-sm">
      Opening the ledger…
    </div>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return (
    <Navigate to={user.role === 'manager' ? '/manager' : '/employee'} replace />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route
        path="/employee"
        element={
          <Protected>
            <EmployeeDashboard />
          </Protected>
        }
      />
      <Route
        path="/manager"
        element={
          <Protected>
            <ManagerDashboard />
          </Protected>
        }
      />
      <Route
        path="/task/:id"
        element={
          <Protected>
            <TaskDetail />
          </Protected>
        }
      />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
