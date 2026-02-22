import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import GlobalLoader from "./components/GlobalLoader";
import Loader from "./components/Loader";
import PageSkeleton from "./components/loaders/PageSkeleton";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { LoadingProvider } from "./context/LoadingContext";
import RequiredAvatarModal from "./components/common/RequiredAvatarModal";
import "./App.css";

// Lazy load pages
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Home = lazy(() => import("./pages/Home"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const NonTeachingDashboard = lazy(() => import("./pages/NonTeachingDashboard"));

const AppRoutes = () => {
  const location = useLocation();
  const showSkeleton =
    location.pathname.startsWith("/home") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/teachers") ||
    location.pathname.startsWith("/nt");
  const skeletonVariant = location.pathname.startsWith("/admin")
    ? "dashboard"
    : location.pathname.startsWith("/teachers")
      ? "dashboard"
      : location.pathname.startsWith("/nt")
        ? "dashboard"
        : location.pathname.startsWith("/home")
          ? "dashboard"
          : "page";
  const fallback = showSkeleton ? (
    <PageSkeleton variant={skeletonVariant} />
  ) : (
    <Loader fullScreen />
  );

  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
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
            <GlobalLoader />
            <RequiredAvatarModal />
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </LoadingProvider>
  );
}

export default App;
