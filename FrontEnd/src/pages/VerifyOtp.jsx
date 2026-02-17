import React from 'react';
import { Link } from 'react-router-dom';
import usePageStyle from '../hooks/usePageStyle';



const VerifyOtp = () => {
    usePageStyle("/css/login.css");

    return (
        <div className="login-card" id="loginCard">
            <div className="login-header">
                <img src="/images/tcc-logo.png" alt="TCC Logo" className="school-logo" />
                <h2 className="mb-2">Talisay City College</h2>
            </div>
            <h3 className="mb-3">Verify Code</h3>

            <div className="alert alert-info mb-3">
                OTP verification is not required in the current app flow.
                Please continue to login, or contact the administrator if you
                need account assistance.
            </div>

            <div className="text-center mt-3">
                <Link to="/" className="text-muted text-decoration-none">Back to Login</Link>
            </div>
        </div>
    );
};

export default VerifyOtp;
