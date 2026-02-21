import React from 'react';
import { useNavigate } from 'react-router-dom';



const AuthCallback = () => {
    const navigate = useNavigate();

    React.useEffect(() => {
        
        navigate('/', { replace: true });
    }, [navigate]);

    return (
        <div style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            background: 'var(--bg-primary, #f5f5fa)',
            color: 'var(--text-primary, #1e1e2d)',
            fontFamily: "'sf pro display', sans-serif"
        }}>
            <div style={{ marginBottom: '20px' }}>
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
            <h2>Redirecting...</h2>
        </div>
    );
};

export default AuthCallback;
