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
        Online password reset is currently disabled because Supabase has been
        removed. Please contact the administrator to update your password, or
        use the in-app profile settings once logged in pew.
      </div>
    </div>
  );
};

export default ResetPasswordForm;
