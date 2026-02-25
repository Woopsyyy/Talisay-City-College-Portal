import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import usePageStyle from "../hooks/usePageStyle";
import { PublicAPI } from 'services/apis/public';
import { Eye, EyeOff, ArrowRight, GraduationCap } from "lucide-react";
import Loader from "../components/Loader";
import {
  isSupabaseUnavailableError,
  writeLocalPortalOutageState,
} from "../services/portalOutage";
import { APP_POLLING_GUARD } from "../config/runtimeGuards";

const Login = () => {
  usePageStyle("/css/login.css");
  const { login, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, avatars: [] });
  const navigate = useNavigate();

  const fetchStats = useCallback(async (forceRefresh = false) => {
    try {
      const data = await PublicAPI.getLandingPageStats({
        force_refresh: forceRefresh,
      });
      setStats({
        totalStudents: Math.max(0, Number(data?.totalStudents) || 0),
        avatars: Array.isArray(data?.avatars) ? data.avatars : [],
      });
    } catch (err) {
      console.error("Failed to fetch landing stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      fetchStats();
    }, APP_POLLING_GUARD.loginLandingStatsIntervalMs);
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchStats]);

  useEffect(() => {
    if (user && !authLoading) {
      const rawRoles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role || "student"];
      const roles = rawRoles
        .map((role) => String(role || "").trim().toLowerCase())
        .filter(Boolean);
      if (roles.includes("admin")) navigate("/admin/dashboard");
      else if (roles.includes("nt") || roles.includes("staff")) navigate("/nt/dashboard");
      else if (roles.includes("teacher") || roles.includes("faculty")) navigate("/teachers");
      else navigate("/home");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      await login(username, password);
      // useAuth useEffect will handle navigation
    } catch (err: any) {
      console.error("Login error:", err);
      if (isSupabaseUnavailableError(err)) {
        writeLocalPortalOutageState({
          active: true,
          scenario: "supabase_offline",
          started_at: new Date().toISOString(),
          duration_minutes: 3,
          severity: "critical",
          resolved_at: null,
          source: "runtime_probe",
        });
      }
      setError(err.message || "Invalid login credentials.");
      setLoading(false);
    }
  };

  const displayAvatars = [...(stats.avatars || [])].slice(0, 3);
  while (displayAvatars.length < 3) {
    displayAvatars.push("/images/sample.jpg");
  }

  const displayedStudentCount =
    stats.totalStudents > 99 ? "99+" : String(Math.min(99, Math.max(0, stats.totalStudents)));

  return (
    <>
      {loading && <Loader fullScreen />}
      <div className="login-page-wrapper" aria-busy={loading}>
        <div className="login-container-new">
        {/* Left Side: Form */}
        <div className="login-form-side">
          <div className="login-form-header">
            <div className="brand-logo-container">
              <img src="/images/tcc-logo.png" alt="TCC Logo" className="brand-logo" />
              <span className="brand-name">TCC</span>
            </div>
            <h1 className="login-title">Sign in</h1>
          </div>

          <form className="login-form-content" onSubmit={handleLogin}>
            {error && <div className="login-error-toast">{error}</div>}
            
            <div className="login-input-group">
              <label htmlFor="username">Username</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  id="username"
                  className="no-left-icon"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="login-input-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  className="no-left-icon has-toggle"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-me-label">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  id="rememberMe"
                />
                <span className="remember-me-text">Remember me</span>
              </label>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={18} style={{ marginLeft: '10px' }} />}
            </button>
          </form>
        </div>

        {/* Right Side: Welcome Illustration/Details */}
        <div className="login-info-side">
          <div className="info-side-overlay"></div>
          <div className="info-content-wrapper">
            <div className="info-top-block">
              <img src="/images/tcc-logo.png" alt="Large Logo" className="info-large-logo" />
              <h2 className="info-welcome-text">Welcome to Talisay City College</h2>
              <p className="info-description">
                TCC helps students to build organized and well structured academic records. 
                Join us and start building your future today.
              </p>
            </div>
            
            <div className="info-floating-card">
              <div style={{ backgroundColor: '#ebf8ff', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', color: '#3182ce' }}>
                <GraduationCap size={24} />
              </div>
              <h3 className="floating-card-title">Get your right education and right place apply now</h3>
              <p className="floating-card-text">
                Be among the first students to experience the easiest way to manage your academic life.
              </p>
              <div className="floating-card-users">
                <div className="avatar-stack">
                  {displayAvatars.map((path, idx) => (
                    <img key={idx} src={path} alt={`student-${idx}`} />
                  ))}
                  <div className="avatar-more">{displayedStudentCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default Login;
