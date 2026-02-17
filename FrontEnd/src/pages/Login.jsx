import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthAPI } from "../services/api";
import usePageStyle from "../hooks/usePageStyle";

const Login = () => {
  usePageStyle("/css/login.css");
  const { login, user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading) {
      const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role || "student"];
      if (roles.includes("admin")) navigate("/admin/dashboard");
      else if (roles.includes("nt")) navigate("/nt/dashboard");
      else if (roles.includes("teacher")) navigate("/teachers");
      else navigate("/home");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup") === "success") {
      setSignupSuccess(true);
    }
    if (params.get("error") === "1") {
      setError("Invalid username or password");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await login(username, password);
      // useAuth useEffect will handle navigation
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <img src="/images/background.jpg" alt="Background" className="logo" />
      <div className="login-card">
        <div className="login-header">
          <img
            src="/images/tcc-logo.png"
            alt="Talisay City College logo"
            className="school-logo"
          />
          <h2 className="mb-2">Talisay City College</h2>
        </div>
        <form id="loginForm" className="w-100" onSubmit={handleLogin}>
          {error && (
            <div
              className="text-danger mb-3"
              id="error-message"
              style={{ display: "block" }}
            >
              {error}
            </div>
          )}
          {signupSuccess && (
            <div className="alert alert-success mb-3">
              Account created successfully! Please login.
            </div>
          )}

          <div className="form-group mb-3">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              className="form-control"
              id="username"
              name="username"
              placeholder="Enter your username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div className="form-group mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-100 mb-3"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <div className="d-flex justify-content-between align-items-center mt-3">
            <Link
              to="/forgot-password"
              style={{
                fontSize: "14px",
                color: "var(--color-cliff)",
                textDecoration: "none",
              }}
            >
              Forgot Password?
            </Link>
            <Link
              to="/signup"
              style={{
                fontSize: "14px",
                color: "var(--color-cliff)",
                textDecoration: "none",
              }}
            >
              Create Account
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default Login;
