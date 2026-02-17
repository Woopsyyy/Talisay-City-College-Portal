import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ChatBot from './components/ChatBot';
import GlobalLoader from './components/GlobalLoader';
import CampfireLoader from './components/loaders/CampfireLoader';
import PageSkeleton from './components/loaders/PageSkeleton';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import './App.css';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Home = lazy(() => import('./pages/Home'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const VerifyOtp = lazy(() => import('./pages/VerifyOtp'));
const ResetPasswordForm = lazy(() => import('./pages/ResetPasswordForm'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const NonTeachingDashboard = lazy(() => import('./pages/NonTeachingDashboard'));

const AppRoutes = () => {
  const location = useLocation();
  const showSkeleton =
    location.pathname.startsWith('/home') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/teachers') ||
    location.pathname.startsWith('/nt');
  const skeletonVariant =
    location.pathname.startsWith('/admin') ? 'dashboard' :
    location.pathname.startsWith('/teachers') ? 'dashboard' :
    location.pathname.startsWith('/nt') ? 'dashboard' :
    location.pathname.startsWith('/home') ? 'dashboard' :
    'page';
  const fallback = showSkeleton ? <PageSkeleton variant={skeletonVariant} /> : <CampfireLoader />;

  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/home/*" element={<Home />} />
        <Route path="/admin/dashboard/*" element={<AdminDashboard />} />
        <Route path="/teachers/*" element={<TeacherDashboard />} />
        <Route path="/nt/dashboard/*" element={<NonTeachingDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <LoadingProvider>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <AppRoutes />
            <ChatBot />
            <GlobalLoader />
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </LoadingProvider>
  );
}

export default App;
