import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Home from './pages/Home';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOtp from './pages/VerifyOtp';
import ResetPasswordForm from './pages/ResetPasswordForm';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import NonTeachingDashboard from './pages/NonTeachingDashboard';
import ChatBot from './components/ChatBot';
import GlobalLoader from './components/GlobalLoader';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import './App.css';

function App() {
  return (
    <LoadingProvider>
      <AuthProvider>
        <ThemeProvider>
          <Router>
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
            <ChatBot />
            <GlobalLoader />
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </LoadingProvider>
  );
}

export default App;
