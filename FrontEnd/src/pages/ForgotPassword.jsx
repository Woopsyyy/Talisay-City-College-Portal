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
        setNewPassword(response.new_password);
        setMessage("Password reset successful!");
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
            src="/images/tcc logo.png"
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
            <div className="alert alert-success mt-3 text-center">
              <h4>Password Changed!</h4>
              <p>Your new temporary password is:</p>
              <div className="bg-white p-2 rounded border border-success mb-3">
                <strong className="fs-4 text-dark">{newPassword}</strong>
              </div>
              <p className="text-muted small">
                Please copy this password and use it to log in. You can change it later in your profile settings.
              </p>
              <Link to="/" className="btn btn-success w-100">
                Go to Login
              </Link>
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
