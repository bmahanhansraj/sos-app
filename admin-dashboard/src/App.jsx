import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import LiveMap from './pages/LiveMap';
import Requests from './pages/Requests';
import Partners from './pages/Partners';
import Pricing from './pages/Pricing';
import Users from './pages/Users';
import Fleets from './pages/Fleets';
import Cities from './pages/Cities';
import Team from './pages/Team';
import AuditLogs from './pages/AuditLogs';
import Notifications from './pages/Notifications';
import NotificationRules from './pages/NotificationRules';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function SuperAdminRoute({ children }) {
  const { token, isSuperAdmin } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="live-map" element={<LiveMap />} />
        <Route path="requests" element={<Requests />} />
        <Route path="partners" element={<Partners />} />
        <Route path="users" element={<Users />} />
        <Route path="fleets" element={<Fleets />} />
        <Route path="cities" element={<Cities />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="notification-rules" element={<NotificationRules />} />
        <Route path="team" element={<SuperAdminRoute><Team /></SuperAdminRoute>} />
        <Route path="audit-logs" element={<SuperAdminRoute><AuditLogs /></SuperAdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}
