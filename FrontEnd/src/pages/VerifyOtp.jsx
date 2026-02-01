import React from 'react';
import { Link } from 'react-router-dom';
import usePageStyle from '../hooks/usePageStyle';



const VerifyOtp = () => {
    usePageStyle("/css/login.css");

    return (
        <div className="login-card" id="loginCard">
            <div className="login-header">
                <img src="/images/tcc logo.png" alt="TCC Logo" className="school-logo" />
                <h2 className="mb-2">Talisay City College</h2>
            </div>
            <h3 className="mb-3">Verify Code</h3>

            <div className="alert alert-info mb-3">
                Email/OTP verification was previously handled by Supabase and is no longer in use.
                Your account is managed directly in the college system. Please login or contact the administrator if you have issues.
            </div>

            <div className="text-center mt-3">
                <Link to="/" className="text-muted text-decoration-none">Back to Login</Link>
            </div>
        </div>
    );
};

export default VerifyOtp;
