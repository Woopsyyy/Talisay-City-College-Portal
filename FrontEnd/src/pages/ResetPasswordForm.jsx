import React from "react";
import usePageStyle from "../hooks/usePageStyle";



const ResetPasswordForm = () => {
  usePageStyle("/css/login.css");

  return (
    <div className="login-card" id="loginCard">
      <div className="login-header">
        <img
          src="/images/tcc-logo.png"
          alt="TCC Logo"
          className="school-logo"
        />
        <h2 className="mb-2">Talisay City College</h2>
      </div>
      <h3 className="mb-3">New Password</h3>

      <div className="alert alert-info mb-3">
        Password resets are handled through the system administrator or the
        in-app profile settings after login. This page is kept only for route
        compatibility.
      </div>
    </div>
  );
};

export default ResetPasswordForm;
