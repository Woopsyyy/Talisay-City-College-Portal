import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AuthAPI } from "../services/api";
import usePageStyle from "../hooks/usePageStyle";

const ForgotPassword = () => {
  usePageStyle("/css/login.css");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [newPassword, setNewPassword] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    setNewPassword(null);

    try {
      const response = await AuthAPI.resetPassword(username);
      if (response.success) {
        // Handle both possible structures (direct or wrapped in data)
        const newPass = response.new_password || (response.data && response.data.new_password);
        if (newPass) {
            setNewPassword(newPass);
            setMessage("Password reset successful!");
        } else {
            setError("Password reset indicated success, but no password was returned.");
        }
      }
    } catch (err) {
      setError(err.message || "Failed to reset password. User may not exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <img src="/images/background.jpg" alt="Background" className="logo" />
      <div className="login-card" id="loginCard">
        <div className="login-header">
          <img
            src="/images/tcc-logo.png"
            alt="TCC Logo"
            className="school-logo"
          />
          <h2 className="mb-2">Talisay City College</h2>
        </div>
        <h3 className="mb-3">Reset Password</h3>

        <form onSubmit={handleSubmit}>
          {!newPassword ? (
            <>
              <div className="alert alert-info mb-3">
                <p className="mb-2">
                  Enter your username below. The system will generate a new
                  random password for you to log in with.
                </p>
              </div>

              {error && (
                <div className="alert alert-danger mb-3">
                  {error}
                </div>
              )}

              <div className="form-group mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 mb-3"
                disabled={loading}
              >
                {loading ? "Processing..." : "Generate New Password"}
              </button>
            </>
          ) : (
            <div className="text-center mt-4 fade-in">
              <div className="mb-4">
                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
              </div>
              <h4 className="mb-3 fw-bold">Password Reset Successful</h4>
              <p className="text-muted mb-3">
                Your password has been reset. Please use the following temporary password to log in:
              </p>
              
              <div className="password-display mb-4 p-3 rounded" style={{ 
                  background: '#f8f9fa', 
                  border: '2px dashed #dee2e6',
                  position: 'relative'
              }}>
                <code className="fs-2 fw-bold text-dark d-block">{newPassword}</code>
                <small className="text-muted d-block mt-2">
                    <i className="bi bi-clipboard me-1"></i> Copy this password
                </small>
              </div>

              <div className="d-grid gap-2">
                <Link to="/" className="btn btn-primary btn-lg">
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </form>

        {!newPassword && (
          <div className="text-center mt-3">
            <Link to="/" className="text-muted text-decoration-none">
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default ForgotPassword;
