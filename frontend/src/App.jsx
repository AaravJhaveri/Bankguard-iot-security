import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SensorProvider } from './context/SensorContext';

import Navbar from './components/Navbar/Navbar';
import Sidebar from './components/Sidebar/Sidebar';

import Login from './pages/Login/Login';
import Overview from './pages/Overview/Overview';
import BankBranch from './pages/BankBranch/BankBranch';
import VaultMonitoring from './pages/VaultMonitoring/VaultMonitoring';
import EmployeeManagement from './pages/EmployeeManagement/EmployeeManagement';
import AccessControl from './pages/AccessControl/AccessControl';
import AlertsNotifications from './pages/AlertsNotifications/AlertsNotifications';
import EventLogs from './pages/EventLogs/EventLogs';
import SensorHealth from './pages/SensorHealth/SensorHealth';
import Settings from './pages/Settings/Settings';

import './styles/theme.css';

// Guard for authenticated routes
const ProtectedLayout = ({ children, managerOnly = false }) => {
  const { isAuthenticated, isManager, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg)' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
          Verifying security credentials...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (managerOnly && !isManager) {
    return <Navigate to="/overview" replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, backgroundColor: 'var(--color-bg)', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SensorProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/overview"
              element={
                <ProtectedLayout>
                  <Overview />
                </ProtectedLayout>
              }
            />

            <Route
              path="/bank-branch"
              element={
                <ProtectedLayout>
                  <BankBranch />
                </ProtectedLayout>
              }
            />

            <Route
              path="/vault"
              element={
                <ProtectedLayout>
                  <VaultMonitoring />
                </ProtectedLayout>
              }
            />

            <Route
              path="/employees"
              element={
                <ProtectedLayout managerOnly={true}>
                  <EmployeeManagement />
                </ProtectedLayout>
              }
            />

            <Route
              path="/access-control"
              element={
                <ProtectedLayout>
                  <AccessControl />
                </ProtectedLayout>
              }
            />

            <Route
              path="/alerts"
              element={
                <ProtectedLayout>
                  <AlertsNotifications />
                </ProtectedLayout>
              }
            />

            <Route
              path="/event-logs"
              element={
                <ProtectedLayout>
                  <EventLogs />
                </ProtectedLayout>
              }
            />

            <Route
              path="/sensor-health"
              element={
                <ProtectedLayout>
                  <SensorHealth />
                </ProtectedLayout>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedLayout managerOnly={true}>
                  <Settings />
                </ProtectedLayout>
              }
            />

            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </SensorProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
