import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AuthAPI, getAvatarUrl } from '../../../services/api';
import { User, Lock, Mail, Camera, Save, ShieldCheck, CheckCircle, AlertTriangle } from 'lucide-react';

const SettingsView = ({ currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("images/sample.jpg");
    
    
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        password: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (currentUser) {
            setFormData(prev => ({
                ...prev,
                username: currentUser.username || '',
                full_name: currentUser.full_name || ''
            }));

            
            const loadPreview = async () => {
                let url = "images/sample.jpg";
                if (currentUser.avatar_url) {
                    url = currentUser.avatar_url;
                } else if (currentUser.image_path) {
                    url = await getAvatarUrl(currentUser.id, currentUser.image_path);
                }
                setPreviewUrl(url);
            };
            loadPreview();
        }
    }, [currentUser]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => setPreviewUrl(evt.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);
        
        if (formData.password || formData.confirmPassword) {
            if (formData.password !== formData.confirmPassword) {
                setMessage({ type: 'danger', text: 'Passwords do not match' });
                return;
            }
            if (formData.password.length < 8) {
                setMessage({ type: 'danger', text: 'Password must be at least 8 characters' });
                return;
            }
        }

        setLoading(true);
        const submitData = new FormData();
        submitData.append('username', formData.username);
        submitData.append('full_name', formData.full_name);
        if (formData.password) submitData.append('password', formData.password);
        
        const fileInput = document.getElementById('profileImageInput');
        if (fileInput && fileInput.files[0]) {
            submitData.append('profile_image', fileInput.files[0]);
        }

        try {
            const result = await AuthAPI.updateProfile(submitData);
            if (result.success) {
                setMessage({ type: 'success', text: 'Profile updated successfully! Reloading...' });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setMessage({ type: 'danger', text: result.error || 'Failed to update profile' });
            }
        } catch (err) {
            console.error("Profile update error:", err);
            setMessage({ type: 'danger', text: err.message || 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLink = () => {
        const width = 600, height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        window.open(
            '/api/auth/google',
            'google_oauth',
            `width=${width},height=${height},top=${top},left=${left}`
        );
    };

    return (
        <Container>
            <Header>
                <h2>Account Settings</h2>
                <p>Manage your profile information and security</p>
            </Header>

            {message && (
                <Alert $type={message.type}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    {message.text}
                </Alert>
            )}

            <Form onSubmit={handleSubmit}>
                <SplitLayout>
                    <ProfileCard>
                        <CardHeader>
                            <Camera size={20} />
                            <h3>Profile Picture</h3>
                        </CardHeader>
                        <CardBody $center>
                            <AvatarWrapper onClick={() => document.getElementById('profileImageInput').click()}>
                                <Avatar src={previewUrl} onError={(e) => e.target.src = "images/sample.jpg"} />
                                <Overlay>
                                    <Camera size={24} />
                                </Overlay>
                            </AvatarWrapper>
                            <input type="file" id="profileImageInput" accept="image/*" onChange={handleFileChange} hidden />
                            <p className="hint">Click to upload a new photo</p>
                            <Button type="button" $secondary onClick={() => document.getElementById('profileImageInput').click()}>
                                Choose Image
                            </Button>
                        </CardBody>
                    </ProfileCard>

                    <MainSettings>
                        <Card>
                            <CardHeader>
                                <User size={20} />
                                <h3 className="card-title">Personal Information</h3>
                            </CardHeader>
                            <CardBody>
                                <FormGroup>
                                    <Label>Full Name</Label>
                                    <InputWrapper>
                                        <User size={18} />
                                        <Input 
                                            type="text" 
                                            value={formData.full_name} 
                                            onChange={e => setFormData({...formData, full_name: e.target.value})} 
                                            required 
                                        />
                                    </InputWrapper>
                                </FormGroup>
                                <FormGroup>
                                    <Label>Username</Label>
                                    <InputWrapper>
                                        <User size={18} />
                                        <Input 
                                            type="text" 
                                            value={formData.username} 
                                            onChange={e => setFormData({...formData, username: e.target.value})} 
                                            required 
                                        />
                                    </InputWrapper>
                                </FormGroup>
                            </CardBody>
                        </Card>

                        <Card>
                            <CardHeader>
                                <ShieldCheck size={20} />
                                <h3>Security</h3>
                            </CardHeader>
                            <CardBody>
                                <FormGroup>
                                    <Label>Google Account</Label>
                                    <GoogleBtn type="button" onClick={handleGoogleLink} $linked={currentUser?.google_linked}>
                                        <Mail size={18} />
                                        {currentUser?.google_linked ? "Connected to Google" : "Connect Google Account"}
                                        {currentUser?.google_linked && <CheckCircle size={16} />}
                                    </GoogleBtn>
                                </FormGroup>
                                <Divider />
                                <FormGroup>
                                    <Label>New Password</Label>
                                    <InputWrapper>
                                        <Lock size={18} />
                                        <Input 
                                            type="password" 
                                            placeholder="Leave blank to keep current" 
                                            value={formData.password}
                                            onChange={e => setFormData({...formData, password: e.target.value})}
                                        />
                                    </InputWrapper>
                                </FormGroup>
                                <FormGroup>
                                    <Label>Confirm Password</Label>
                                    <InputWrapper>
                                        <Lock size={18} />
                                        <Input 
                                            type="password" 
                                            placeholder="Confirm new password"
                                            value={formData.confirmPassword}
                                            onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                        />
                                    </InputWrapper>
                                </FormGroup>
                            </CardBody>
                        </Card>
                    </MainSettings>
                </SplitLayout>

                <Actions>
                    <Button type="submit" disabled={loading}>
                        <Save size={18} /> {loading ? 'Saving Changes...' : 'Save Changes'}
                    </Button>
                </Actions>
            </Form>
        </Container>
    );
};


const Container = styled.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  h2 { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`;

const Alert = styled.div`
  background: ${props => props.$type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'};
  border: 1px solid ${props => props.$type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'};
  color: ${props => props.$type === 'success' ? '#16a34a' : '#ef4444'};
  padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;
  display: flex; align-items: center; gap: 10px; font-weight: 500;
`;

const Form = styled.form`
  display: flex; flex-direction: column; gap: 2rem;
`;

const SplitLayout = styled.div`
  display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const ProfileCard = styled.div`
  background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden; height: fit-content;
`;

const MainSettings = styled.div`
  display: flex; flex-direction: column; gap: 1.5rem;
`;

const Card = styled.div`
  background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 12px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
  svg { color: var(--accent-primary); }
`;

const CardBody = styled.div`
  padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1.5rem;
  ${props => props.$center && `align-items: center; text-align: center;`}
  .hint { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; }
`;

const AvatarWrapper = styled.div`
  width: 120px; height: 120px; border-radius: 50%; position: relative; cursor: pointer; border: 3px solid var(--bg-tertiary);
  &:hover div { opacity: 1; }
`;

const Avatar = styled.img`
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s; color: white;
`;

const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 8px;
`;

const Label = styled.label`
  font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);
`;

const InputWrapper = styled.div`
  position: relative;
  svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); pointer-events: none; }
`;

const Input = styled.input`
  width: 100%; padding: 10px 12px 10px 40px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-primary); color: var(--text-primary); font-size: 0.95rem;
  &:focus { outline: none; border-color: var(--accent-primary); ring: 2px solid var(--accent-primary); }
`;

const Divider = styled.div`
  height: 1px; background: var(--border-color); margin: 0.5rem 0;
`;

const GoogleBtn = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 10px;
  background: ${props => props.$linked ? 'var(--bg-tertiary)' : 'white'};
  color: ${props => props.$linked ? 'var(--text-primary)' : '#333'};
  border: 1px solid var(--border-color); border-radius: 8px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
  &:hover { background: var(--bg-tertiary); }
`;

const Actions = styled.div`
  display: flex; justify-content: flex-end;
`;

const Button = styled.button`
  padding: 12px 24px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600;
  display: flex; align-items: center; gap: 8px; transition: all 0.2s;
  background: ${props => props.$secondary ? 'transparent' : 'var(--accent-primary)'};
  color: ${props => props.$secondary ? 'var(--text-secondary)' : 'white'};
  border: ${props => props.$secondary ? '1px solid var(--border-color)' : 'none'};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    background: ${props => props.$secondary ? 'var(--bg-tertiary)' : 'var(--accent-highlight)'};
  }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export default SettingsView;
