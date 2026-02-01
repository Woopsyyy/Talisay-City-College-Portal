import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthAPI } from '../services/api';
import usePageStyle from '../hooks/usePageStyle';

const Signup = () => {
  usePageStyle("/css/signup.css");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [emailStatus, setEmailStatus] = useState({ msg: '', ok: null, show: false });
  const [usernameStatus, setUsernameStatus] = useState({ msg: '', ok: null, show: false });
  const [nameStatus, setNameStatus] = useState({ msg: '', ok: null, show: false });
  const [passwordStatus, setPasswordStatus] = useState({ msg: '', ok: null, show: false });
  
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  
  useEffect(() => {
    
    if (!formData.name) {
        setNameStatus({ show: false });
    } else if (formData.name.length < 2) {
        setNameStatus({ msg: 'Name is too short', ok: false, show: true });
    } else {
        setNameStatus({ msg: 'Looks good', ok: true, show: true });
    }

    
    if (!formData.username) {
        setUsernameStatus({ show: false });
    } else if (formData.username.length < 3) {
        setUsernameStatus({ msg: 'Username too short', ok: false, show: true });
    } else {
        setUsernameStatus({ msg: 'Looks good', ok: true, show: true });
    }

    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
        setEmailStatus({ show: false });
    } else if (!emailRegex.test(formData.email)) {
        setEmailStatus({ msg: 'Invalid email address', ok: false, show: true });
    } else {
        setEmailStatus({ msg: 'Valid email format', ok: true, show: true });
    }

    
    const pw = formData.password;
    if (!pw) {
        setPasswordStatus({ show: false });
    } else {
        let msg = '';
        let ok = true;
        if (pw.length < 6) { msg = 'Password must be at least 6 characters'; ok = false; }
        
        setPasswordStatus({ msg: ok ? 'Strong password' : msg, ok, show: true });
    }
  }, [formData]);

  useEffect(() => {
    const nameOk = nameStatus.ok === true;
    const usernameOk = usernameStatus.ok === true;
    const emailOk = emailStatus.ok === true;
    const pwOk = passwordStatus.ok === true;
    setCanSubmit(nameOk && usernameOk && emailOk && pwOk && !loading);
  }, [nameStatus, usernameStatus, emailStatus, passwordStatus, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setGeneralError('');

    try {
      
      if (profileImage) {
        const formDataPayload = new FormData();
        formDataPayload.append('name', formData.name); 
        formDataPayload.append('username', formData.username);
        formDataPayload.append('password', formData.password);
        formDataPayload.append('email', formData.email);
        formDataPayload.append('role', 'student');
        formDataPayload.append('profile_picture', profileImage);
        
        await AuthAPI.signup(formDataPayload);
      } else {
        await AuthAPI.signup({
            username: formData.username,
            password: formData.password,
            full_name: formData.name, 
            email: formData.email,
            role: 'student',
        });
      }

      navigate('/?signup=success');
    } catch (err) {
      console.error("Signup error:", err);
      setGeneralError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const renderFeedback = (status) => {
    if (!status.show) return null;
    let iconClass = status.ok ? "bi bi-check-circle-fill text-success" : "bi bi-x-circle-fill text-danger";
    let textClass = status.ok ? "text-success" : "text-danger";

    return (
        <div className={`field-feedback ${textClass}`} style={{ display: 'flex', alignItems: 'center', marginTop: '6px', fontSize: '0.9rem' }}>
             <span className="icon"><i className={iconClass} aria-hidden="true"></i></span>
             <span className="msg" style={{ marginLeft: '5px' }}>{status.msg}</span>
        </div>
    );
  };

  return (
    <div className="main-container">
        <div className="user-card-preview" id="userCardPreview">
            <div className={`profile-circle ${previewUrl ? 'has-image' : ''}`}>
                <div 
                    className={`profile-image ${previewUrl ? 'visible' : ''}`}
                    id="cardImage"
                    style={{ backgroundImage: previewUrl ? `url(${previewUrl})` : 'none' }}
                ></div>
            </div>
            <h2 id="cardName" className={formData.name ? 'visible' : ''}>{formData.name || 'Your Name'}</h2>
        </div>

        <div className="signup-container">
            <h2 style={{ color: 'var(--color-ethereal) !important' }}>Create Your Account</h2>
            {generalError && <div className="alert alert-danger mb-3">{generalError}</div>}
            
            <form id="signupForm" onSubmit={handleSubmit}>
                <div className="form-group">
                    <input 
                        type="text" 
                        id="name" 
                        className="form-control" 
                        name="name" 
                        placeholder="Full Name" 
                        required 
                        style={{ color: 'var(--color-ethereal) !important' }}
                        value={formData.name}
                        onChange={handleChange}
                    />
                    {renderFeedback(nameStatus)}
                </div>

                <div className="form-group">
                    <input 
                        type="text" 
                        id="username" 
                        className="form-control" 
                        name="username" 
                        placeholder="Username" 
                        required 
                        style={{ color: 'var(--color-ethereal) !important' }}
                        value={formData.username}
                        onChange={handleChange}
                    />
                    {renderFeedback(usernameStatus)}
                </div>
            
                <div className="form-group">
                    <input 
                        type="email" 
                        id="email" 
                        className="form-control" 
                        name="email" 
                        placeholder="Email Address" 
                        required 
                        style={{ color: 'var(--color-ethereal) !important' }}
                        value={formData.email}
                        onChange={handleChange}
                    />
                    {renderFeedback(emailStatus)}
                </div>
            
                <div className="form-group">
                    <input 
                        type="password" 
                        id="password" 
                        className="form-control" 
                        name="password" 
                        placeholder="Password" 
                        required 
                        style={{ color: 'var(--color-ethereal) !important' }}
                        value={formData.password}
                        onChange={handleChange}
                    />
                    {renderFeedback(passwordStatus)}
                </div>

                <div className="file-input-wrapper">
                    <label htmlFor="profileImage" className="file-input-label">Choose Profile Picture</label>
                    <input 
                        type="file" 
                        id="profileImage" 
                        name="profileImage" 
                        accept="image/*" 
                        style={{ display: 'none' }}
                        onChange={handleImageChange}
                    />
                </div>
            
                <button type="submit" className="submit-btn" disabled={!canSubmit}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                </button>
            </form>
            
            <div className="login-link">
                <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Login here</a></p>
            </div>
        </div>
    </div>
  );
};

export default Signup;
