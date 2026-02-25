import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import PageSkeleton from "./components/loaders/PageSkeleton";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import RequiredAvatarModal from "./components/common/RequiredAvatarModal";
import PortalOutageScreen from "./components/common/PortalOutageScreen";
import {
  PORTAL_OUTAGE_EVENT,
  PORTAL_OUTAGE_LOCAL_KEY,
  clearLocalPortalOutageState,
  fetchPortalOutageSimulationState,
  isPortalOutageSimulationActive,
  isSupabaseUnavailableError,
  probeSupabaseAvailability,
  readLocalPortalOutageState,
  writeLocalPortalOutageState,
} from "./services/portalOutage";
import { APP_POLLING_GUARD } from "./config/runtimeGuards";
import "./App.css";

// Lazy load pages
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Home = lazy(() => import("./pages/Home"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const NonTeachingDashboard = lazy(() => import("./pages/NonTeachingDashboard"));

type OutageMode = "simulation" | "offline" | null;
const OUTAGE_FAILURE_THRESHOLD = 1;

const usePortalOutageGuard = ({
  enabled,
  isAuthenticated,
}: {
  enabled: boolean;
  isAuthenticated: boolean;
}) => {
  const [mode, setMode] = useState<OutageMode>(null);
  const inFlightRef = useRef(false);
  const unavailableCountRef = useRef(0);

  const checkPortalOutage = useCallback(async () => {
    if (!enabled) {
      unavailableCountRef.current = 0;
      setMode(null);
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      let simulatedOffline = false;
      let forcedOfflineHint = false;
      const localState = readLocalPortalOutageState();
      const localSimulationActive = isPortalOutageSimulationActive(localState);
      if (localSimulationActive && localState.source === "runtime_probe") {
        forcedOfflineHint = true;
      } else {
        simulatedOffline = localSimulationActive;
      }

      if (isAuthenticated) {
        try {
          const remoteState = await fetchPortalOutageSimulationState();
          const remoteActive = isPortalOutageSimulationActive(remoteState);
          if (remoteActive) {
            writeLocalPortalOutageState(remoteState);
          } else {
            clearLocalPortalOutageState();
          }
          simulatedOffline = remoteActive;
          forcedOfflineHint = false;
        } catch (error: any) {
          if (isSupabaseUnavailableError(error)) {
            unavailableCountRef.current += 1;
            const offline = unavailableCountRef.current >= OUTAGE_FAILURE_THRESHOLD;
            setMode(simulatedOffline ? "simulation" : forcedOfflineHint || offline ? "offline" : null);
            return;
          }
        }
      }

      try {
        await probeSupabaseAvailability(isAuthenticated);
        unavailableCountRef.current = 0;
      } catch (error: any) {
        if (isSupabaseUnavailableError(error)) {
          unavailableCountRef.current += 1;
          const offline = unavailableCountRef.current >= OUTAGE_FAILURE_THRESHOLD;
          setMode(simulatedOffline ? "simulation" : forcedOfflineHint || offline ? "offline" : null);
          return;
        }
        unavailableCountRef.current = 0;
      }

      setMode(simulatedOffline ? "simulation" : null);
      if (!simulatedOffline && !isAuthenticated) {
        clearLocalPortalOutageState();
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, isAuthenticated]);

  useEffect(() => {
    void checkPortalOutage();
  }, [checkPortalOutage]);

  useEffect(() => {
    if (!enabled) return;

    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      void checkPortalOutage();
    }, APP_POLLING_GUARD.outageProbeIntervalMs);

    const handleFocus = () => {
      void checkPortalOutage();
    };
    const handleVisibility = () => {
      if (!document.hidden) void checkPortalOutage();
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== PORTAL_OUTAGE_LOCAL_KEY) return;
      void checkPortalOutage();
    };
    const handleOutageEvent = () => {
      void checkPortalOutage();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(PORTAL_OUTAGE_EVENT, handleOutageEvent);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PORTAL_OUTAGE_EVENT, handleOutageEvent);
    };
  }, [checkPortalOutage, enabled]);

  return mode;
};

const AppRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isAdminDashboardRoute = location.pathname.startsWith("/admin/dashboard");
  const outageMode = usePortalOutageGuard({
    enabled: !isAdminDashboardRoute,
    isAuthenticated: Boolean(user),
  });

  if (!isAdminDashboardRoute && outageMode) {
    return <PortalOutageScreen />;
  }

  const usePortalSkeleton =
    location.pathname.startsWith("/home") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/teachers") ||
    location.pathname.startsWith("/nt");
  const skeletonVariant = usePortalSkeleton
    ? "portal"
    : location.pathname === "/"
      ? "form"
      : "cards";
  const fallback = <PageSkeleton variant={skeletonVariant} compact={!usePortalSkeleton} />;

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
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppRoutes />
          <RequiredAvatarModal />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
