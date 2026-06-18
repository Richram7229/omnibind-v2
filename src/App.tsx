import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Base placeholders for routes to avoid errors before creating them
const Login = React.lazy(() => import('./pages/Auth/Login'));
const Register = React.lazy(() => import('./pages/Auth/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Staking = React.lazy(() => import('./pages/Staking'));
const Network = React.lazy(() => import('./pages/Network'));
const Wallet = React.lazy(() => import('./pages/Wallet'));
const History = React.lazy(() => import('./pages/History'));
const Settings = React.lazy(() => import('./pages/Settings'));
const AdminPanel = React.lazy(() => import('./pages/Admin'));

function ReferralTracker() {
  const [params] = useSearchParams();
  const ref = params.get('ref');
  
  useEffect(() => {
    if (ref && ref !== 'undefined' && ref !== 'null') {
      localStorage.setItem('sponsor', ref);
    }
  }, [ref]);

  return null;
}

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, userData, loading, logout } = useAuth() as any;

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!userData) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" /></div>;
  
  if (userData.accountStatus === 'frozen') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-2">Account Frozen</h1>
        <p className="text-gray-400 mb-6">Your account has been suspended by the administrator. Please contact support.</p>
        <button onClick={logout} className="px-6 py-2 bg-navy-800 text-white rounded hover:bg-navy-700 transition">Logout</button>
      </div>
    );
  }

  if (requireAdmin && userData.role !== 'admin' && userData.role !== 'master_admin') return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ReferralTracker />
          <React.Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500" /></div>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="staking" element={<Staking />} />
                <Route path="network" element={<Network />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="history" element={<History />} />
                <Route path="settings" element={<Settings />} />
                <Route path="admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
              </Route>
            </Routes>
          </React.Suspense>
          <Toaster 
            position="top-right" 
            toastOptions={{ 
              className: '!bg-navy-800 !text-white !border !border-navy-700',
              success: { iconTheme: { primary: '#d4af37', secondary: '#121e3f' } }
            }} 
          />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
