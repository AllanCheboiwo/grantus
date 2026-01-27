import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Grants from './pages/Grants';
import GrantDetail from './pages/GrantDetail';
import GrantForm from './pages/GrantForm';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import ClientForm from './pages/ClientForm';
import Applications from './pages/Applications';
import ApplicationDetail from './pages/ApplicationDetail';
import Users from './pages/Users';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalApplications from './pages/portal/PortalApplications';
import PortalApplicationDetail from './pages/portal/PortalApplicationDetail';
import PortalSubscription from './pages/portal/PortalSubscription';
import PortalGrants from './pages/portal/PortalGrants';
import PortalGrantDetail from './pages/portal/PortalGrantDetail';
import PortalSavedGrants from './pages/portal/PortalSavedGrants';
import PortalProfile from './pages/portal/PortalProfile';
import AcceptInvite from './pages/AcceptInvite';
import Signup from './pages/Signup';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect client users to portal
  if (user?.role === 'client') {
    return <Navigate to="/portal" replace />;
  }
  
  return <>{children}</>;
}

function ClientRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect staff/admin users to main app
  if (user?.role !== 'client') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const { user, isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />
      
      {/* Staff/Admin Routes */}
      <Route
        path="/"
        element={
          <StaffRoute>
            <Layout />
          </StaffRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="grants" element={<Grants />} />
        <Route path="grants/new" element={<GrantForm />} />
        <Route path="grants/:id" element={<GrantDetail />} />
        <Route path="grants/:id/edit" element={<GrantForm />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/new" element={<ClientForm />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="clients/:id/edit" element={<ClientForm />} />
        <Route path="applications" element={<Applications />} />
        <Route path="applications/:id" element={<ApplicationDetail />} />
        <Route path="users" element={<Users />} />
      </Route>
      
      {/* Client Portal Routes */}
      <Route
        path="/portal"
        element={
          <ClientRoute>
            <PortalLayout />
          </ClientRoute>
        }
      >
        <Route index element={<PortalDashboard />} />
        <Route path="applications" element={<PortalApplications />} />
        <Route path="applications/:id" element={<PortalApplicationDetail />} />
        <Route path="subscription" element={<PortalSubscription />} />
        <Route path="grants" element={<PortalGrants />} />
        <Route path="grants/:id" element={<PortalGrantDetail />} />
        <Route path="saved" element={<PortalSavedGrants />} />
        <Route path="profile" element={<PortalProfile />} />
      </Route>
      
      {/* Catch-all redirect */}
      <Route 
        path="*" 
        element={
          isAuthenticated 
            ? <Navigate to={user?.role === 'client' ? '/portal' : '/'} replace />
            : <Navigate to="/login" replace />
        } 
      />
    </Routes>
  );
}

export default App;
