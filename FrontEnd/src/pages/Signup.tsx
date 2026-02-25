import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { AuthAPI } from 'services/apis/auth';
import usePageStyle from '../hooks/usePageStyle';

type FieldStatus = {
  msg: string;
  ok: boolean | null;
  show: boolean;
};

const Signup = () => {
  usePageStyle("/css/signup.css");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<FieldStatus>({ msg: '', ok: null, show: false });
  const [nameStatus, setNameStatus] = useState<FieldStatus>({ msg: '', ok: null, show: false });
  const [passwordStatus, setPasswordStatus] = useState<FieldStatus>({ msg: '', ok: null, show: false });
  
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  
  useEffect(() => {
    
    if (!formData.name) {
        setNameStatus({ msg: '', ok: null, show: false });
    } else if (formData.name.length < 2) {
        setNameStatus({ msg: 'Name is too short', ok: false, show: true });
    } else {
        setNameStatus({ msg: 'Looks good', ok: true, show: true });
    }

    
    if (!formData.username) {
        setUsernameStatus({ msg: '', ok: null, show: false });
    } else if (formData.username.length < 3) {
        setUsernameStatus({ msg: 'Username too short', ok: false, show: true });
    } else {
        setUsernameStatus({ msg: 'Looks good', ok: true, show: true });
    }

    const pw = formData.password;
    if (!pw) {
        setPasswordStatus({ msg: '', ok: null, show: false });
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
    const pwOk = passwordStatus.ok === true;
    setCanSubmit(nameOk && usernameOk && pwOk && !loading);
  }, [nameStatus, usernameStatus, passwordStatus, loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const options = {
          maxSizeMB: 0.15,
          maxWidthOrHeight: 400,
          useWebWorker: true,
          fileType: "image/jpeg",
          initialQuality: 0.8
        };
        const compressedFile = await imageCompression(file, options);
        setProfileImage(compressedFile);
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewUrl((ev.target?.result as string) || null);
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        console.error("Compression err:", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        formDataPayload.append('role', 'student');
        formDataPayload.append('profile_picture', profileImage);
        
        await AuthAPI.signup(formDataPayload);
      } else {
        await AuthAPI.signup({
            username: formData.username,
            password: formData.password,
            full_name: formData.name, 
            role: 'student',
        });
      }

      navigate('/?signup=success');
    } catch (err: any) {
      console.error("Signup error:", err);
      setGeneralError(err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const renderFeedback = (status: FieldStatus) => {
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
