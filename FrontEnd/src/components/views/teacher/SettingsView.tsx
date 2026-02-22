import React, { useState, useEffect } from 'react';
import baseStyled from 'styled-components';
import { AuthAPI, StudentAPI, getAvatarUrl } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { User, Camera, Save, ShieldCheck, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import imageCompression from 'browser-image-compression';
const styled = baseStyled as any;

type SettingsMessage = {
    type: 'success' | 'danger';
    text: string;
} | null;

const SettingsView = ({ currentUser }: { currentUser: any }) => {
    const [loading, setLoading] = useState(false);
    const [requestLoading, setRequestLoading] = useState(false);
    const [requestSubmitting, setRequestSubmitting] = useState(false);
    const [resetSubmitting, setResetSubmitting] = useState(false);
    const [message, setMessage] = useState<SettingsMessage>(null);
    const [previewUrl, setPreviewUrl] = useState("images/sample.jpg");
    const { checkAuth } = useAuth();
    const [latestRequest, setLatestRequest] = useState(null);
    const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
    const [approvalConsumed, setApprovalConsumed] = useState(false);
    const [consumedRequestId, setConsumedRequestId] = useState<number | null>(null);
    
    
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        gender: ''
    });

    useEffect(() => {
        if (currentUser) {
            setFormData(prev => ({
                ...prev,
                username: currentUser.username || '',
                full_name: currentUser.full_name || '',
                gender: (currentUser.gender || '').toLowerCase()
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

    const openFilePicker = () => {
        const picker = document.getElementById('profileImageInput') as HTMLInputElement | null;
        picker?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const options = {
                    maxSizeMB: 0.15,
                    maxWidthOrHeight: 400,
                    useWebWorker: true,
                    fileType: "image/jpeg",
                    initialQuality: 0.8
                };
                const compressedFile = await imageCompression(file, options);
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(new File([compressedFile], compressedFile.name, {
                    type: compressedFile.type,
                    lastModified: Date.now(),
                }));
                e.target.files = dataTransfer.files;

                const reader = new FileReader();
                reader.onload = (evt) => setPreviewUrl((evt.target?.result as string) || "images/sample.jpg");
                reader.readAsDataURL(compressedFile);
            } catch (err) {
                console.error("Compression err:", err);
                const reader = new FileReader();
                reader.onload = (evt) => setPreviewUrl((evt.target?.result as string) || "images/sample.jpg");
                reader.readAsDataURL(file);
            }
        }
    };

    const loadResetRequests = async () => {
        try {
            setRequestLoading(true);
            const rows = await StudentAPI.getMyAccountRequests(20);
            const activeRequest = Array.isArray(rows)
                ? rows.find((row) => {
                    const requestType = String(row?.request_type || '').trim().toLowerCase();
                    const status = String(row?.status || '').trim().toLowerCase();
                    return requestType === 'password_reset' && (status === 'pending' || status === 'approved');
                })
                : null;
            setLatestRequest(activeRequest || null);
            if (activeRequest) {
                const activeId = Number(activeRequest?.id || 0);
                if (consumedRequestId && activeId === consumedRequestId) {
                    setApprovalConsumed(true);
                } else {
                    setApprovalConsumed(false);
                }
            } else {
                setApprovalConsumed(false);
            }
        } catch (error: any) {
            setLatestRequest(null);
            setMessage({
                type: 'danger',
                text: error?.message || 'Failed to load password reset requests.',
            });
        } finally {
            setRequestLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser?.id) {
            loadResetRequests();
        }
    }, [currentUser?.id, consumedRequestId]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage(null);

        setLoading(true);
        const submitData = new FormData();
        submitData.append('username', formData.username);
        submitData.append('full_name', formData.full_name);
        if (formData.gender) submitData.append('gender', formData.gender);
        
        const fileInput = document.getElementById('profileImageInput') as HTMLInputElement | null;
        if (fileInput?.files?.[0]) {
            submitData.append('profile_image', fileInput.files[0]);
        }

        try {
            const result = await AuthAPI.updateProfile(submitData);
            if (result.success) {
                await checkAuth();
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                setMessage({ type: 'danger', text: result.error || 'Failed to update profile' });
            }
        } catch (err: any) {
            console.error("Profile update error:", err);
            setMessage({ type: 'danger', text: err?.message || 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    const requestStatus = String(latestRequest?.status || '').toLowerCase();
    const canRequestReset =
        !requestLoading && requestStatus !== 'pending' && requestStatus !== 'approved';
    const canCompleteReset = requestStatus === 'approved' && !approvalConsumed;

    const handleRequestPasswordReset = async () => {
        try {
            setMessage(null);
            setRequestSubmitting(true);
            const result = await StudentAPI.requestPasswordReset();
            await loadResetRequests();
            setMessage({
                type: 'success',
                text: result?.message || 'Password reset request submitted. Wait for admin approval.',
            });
        } catch (error: any) {
            setMessage({
                type: 'danger',
                text: error?.message || 'Failed to submit password reset request.',
            });
        } finally {
            setRequestSubmitting(false);
        }
    };

    const handleApprovedReset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const password = String(passwordForm.password || '');
        const confirm = String(passwordForm.confirm || '');

        if (password.length < 8) {
            setMessage({ type: 'danger', text: 'Password must be at least 8 characters.' });
            return;
        }
        if (password !== confirm) {
            setMessage({ type: 'danger', text: 'Password confirmation does not match.' });
            return;
        }

        try {
            setMessage(null);
            setResetSubmitting(true);
            const synced = await StudentAPI.completeApprovedPasswordReset(password);
            if (!synced) {
                throw new Error('Password was not synced to secure auth. Please contact admin.');
            }
            const requestId = Number(latestRequest?.id || 0);
            setPasswordForm({ password: "", confirm: "" });
            setApprovalConsumed(true);
            setConsumedRequestId(requestId > 0 ? requestId : null);
            setLatestRequest(null);
            await loadResetRequests();
            setMessage({
                type: 'success',
                text: 'Password updated successfully. Approval consumed. Request again next time you need another reset.',
            });
        } catch (error: any) {
            await loadResetRequests();
            setMessage({
                type: 'danger',
                text: error?.message || 'Failed to reset password.',
            });
        } finally {
            setResetSubmitting(false);
        }
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
                            <AvatarWrapper onClick={openFilePicker}>
                                <Avatar loading="lazy"
                                    src={previewUrl}
                                    onError={(e) => {
                                        const image = e.currentTarget as HTMLImageElement;
                                        image.src = "images/sample.jpg";
                                    }}
                                />
                                <Overlay>
                                    <Camera size={24} />
                                </Overlay>
                            </AvatarWrapper>
                            <input type="file" id="profileImageInput" accept="image/*" onChange={handleFileChange} hidden />
                            <p className="hint">Click to upload a new photo</p>
                            <Button type="button" $secondary onClick={openFilePicker}>
                                Choose Image
                            </Button>
                        </CardBody>
                    </ProfileCard>

                    <MainSettings>
                        <Card>
                            <CardHeader>
                                <User size={20} />
                                <h3>Personal Information</h3>
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
                                <FormGroup>
                                    <Label>Gender</Label>
                                    <Select
                                        value={formData.gender}
                                        onChange={e => setFormData({...formData, gender: e.target.value})}
                                    >
                                        <option value="">Select</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="lgbtq+">LGBTQ+</option>
                                    </Select>
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
                                    <Label>Password Reset Request</Label>
                                    <RequestStatus $status={requestStatus || 'none'}>
                                        <span className="dot" />
                                        {requestLoading
                                            ? 'Checking request status...'
                                            : requestStatus === 'approved'
                                                ? 'Approved - you can reset your password now.'
                                                : requestStatus === 'pending'
                                                    ? 'Pending admin approval.'
                                                    : 'No active request.'}
                                    </RequestStatus>
                                    <Button
                                        type="button"
                                        $secondary
                                        disabled={!canRequestReset || requestSubmitting}
                                        onClick={handleRequestPasswordReset}
                                    >
                                        <KeyRound size={18} />
                                        {requestSubmitting ? 'Submitting Request...' : 'Request Password Reset'}
                                    </Button>
                                    <p className="hint">
                                        Submit a request first. Once approved by admin, you can set a new password below.
                                    </p>
                                </FormGroup>

                                {canCompleteReset && (
                                    <ResetForm onSubmit={handleApprovedReset}>
                                        <FormGroup>
                                            <Label>New Password</Label>
                                            <Input
                                                type="password"
                                                value={passwordForm.password}
                                                onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                                required
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Confirm Password</Label>
                                            <Input
                                                type="password"
                                                value={passwordForm.confirm}
                                                onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                                required
                                            />
                                        </FormGroup>
                                        <Button type="submit" disabled={resetSubmitting}>
                                            <Save size={18} />
                                            {resetSubmitting ? 'Resetting Password...' : 'Reset Password'}
                                        </Button>
                                    </ResetForm>
                                )}
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

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  &:focus { outline: none; border-color: var(--accent-primary); }
`;

const RequestStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-weight: 600;

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $status }) =>
      $status === 'approved'
        ? '#10b981'
        : $status === 'pending'
          ? '#f59e0b'
          : $status === 'rejected'
            ? '#ef4444'
            : $status === 'completed'
              ? '#3b82f6'
              : '#9ca3af'};
  }
`;

const ResetForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
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
