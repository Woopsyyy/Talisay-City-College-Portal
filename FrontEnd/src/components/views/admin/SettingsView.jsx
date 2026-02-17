import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Settings, Trash2, AlertTriangle, CheckCircle, Info, Image as ImageIcon, Database, Download, Clock, Upload } from 'lucide-react';
import Toast from '../../common/Toast';
import { AdminAPI } from '../../../services/api';

const SettingsView = () => {
    const DASHBOARD_MANAGED_MESSAGE = "This action should be configured in the Supabase dashboard.";
    const [pictureResult, setPictureResult] = useState(null);
    const [loadingPictures, setLoadingPictures] = useState(false);
    const [loadingBackups, setLoadingBackups] = useState(false);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const [backups, setBackups] = useState([]);
    const [backupResult, setBackupResult] = useState(null);
    const [importFile, setImportFile] = useState(null);
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduleFrequency, setScheduleFrequency] = useState('daily');
    const [scheduleTime, setScheduleTime] = useState('02:00');

    const formatSize = (bytes) => {
        const numericBytes = Number(bytes);
        if (!Number.isFinite(numericBytes) || numericBytes <= 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(numericBytes) / Math.log(k));
        return Math.round((numericBytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    const loadBackups = async () => {
        setLoadingBackups(true);
        try {
            const response = await AdminAPI.getBackups();
            setBackups(Array.isArray(response) ? response : []);
        } catch (error) {
            setBackups([]);
            setToast({
                show: true,
                message: error?.message || "Failed to load backup files.",
                type: "error",
            });
        } finally {
            setLoadingBackups(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);

    const handleManualBackup = async () => {
        setCreatingBackup(true);
        setBackupResult(null);

        try {
            const response = await AdminAPI.createBackup();
            setBackupResult(response);
            setToast({
                show: true,
                message: "Backup created and uploaded to Supabase Storage.",
                type: "success",
            });
            await loadBackups();
        } catch (error) {
            const message = error?.message || "Backup creation failed.";
            setBackupResult({ error: message });
            setToast({ show: true, message, type: "error" });
        } finally {
            setCreatingBackup(false);
        }
    };

    const handleImportDatabase = async (e) => {
        e.preventDefault();
        const suffix = importFile?.name ? ` Selected file: ${importFile.name}` : "";
        setToast({
            show: true,
            message: `${DASHBOARD_MANAGED_MESSAGE}${suffix}`,
            type: "info",
        });
    };

    const handleDownloadBackup = (url, filename) => {
        if (!url) {
            setToast({
                show: true,
                message: "Backup file URL is unavailable.",
                type: "error",
            });
            return;
        }

        const downloadUrl = url;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleScheduleChange = () => {
        setScheduleEnabled((prev) => !prev);
        setToast({
            show: true,
            message: DASHBOARD_MANAGED_MESSAGE,
            type: 'info'
        });
    };

    const handleCleanupPictures = async () => {
        setLoadingPictures(true);
        setPictureResult(null);

        try {
            const response = await AdminAPI.cleanupPictures();
            setPictureResult(response);

            const removed = Number(response?.deleted || 0);
            setToast({
                show: true,
                message: removed > 0
                    ? `Removed ${removed} unused profile image${removed === 1 ? "" : "s"}.`
                    : "No unused profile images found.",
                type: removed > 0 ? "success" : "info",
            });
        } catch (error) {
            const message = error?.message || "Failed to clean up profile images.";
            setPictureResult({ error: message });
            setToast({ show: true, message, type: "error" });
        } finally {
            setLoadingPictures(false);
        }
    };

    return (
        <StyledContainer>
            <HeaderSection>
                <div>
                    <h2><Settings size={32} /> Settings</h2>
                    <p>Manage database cleanup and maintenance tasks.</p>
                </div>
            </HeaderSection>
            
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(prev => ({ ...prev, show: false }))} 
                />
            )}

            <MainCard style={{ marginBottom: '1.5rem' }}>
                <CardHeader>
                    <Database size={20} />
                    <h3>Database Backup</h3>
                </CardHeader>
                <CardBody>
                    <div className="row g-4">
                        <div className="col-lg-6">
                            <ActionCard>
                                <ActionHeader>
                                    <div>
                                        <h4>Manual Backup</h4>
                                        <p>Create an instant backup of your database.</p>
                                    </div>
                                    <IconWrapper className="blue">
                                        <Database size={24} />
                                    </IconWrapper>
                                </ActionHeader>
                                
                                <InfoBox className="blue">
                                    <Info size={16} />
                                    Create a JSON snapshot from Supabase tables and store it in Supabase Storage.
                                </InfoBox>

                                <ActionButton 
                                    onClick={handleManualBackup} 
                                    className="primary"
                                    disabled={creatingBackup || loadingBackups}
                                >
                                    {creatingBackup ? "Creating Backup..." : "Create Backup Now"}
                                </ActionButton>

                                {backupResult && (
                                    <ResultBox>
                                        {backupResult.error ? (
                                            <div className="error"><AlertTriangle size={14} /> {backupResult.error}</div>
                                        ) : (
                                            <div className="success">
                                                <div><CheckCircle size={14} /> Backup created: {backupResult.filename}</div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Size: {formatSize(backupResult.size)}</div>
                                            </div>
                                        )}
                                    </ResultBox>
                                )}

                                {backups.length > 0 && (
                                    <BackupList>
                                        <h5>Recent Backups ({backups.length})</h5>
                                        {backups.slice(0, 5).map((backup, idx) => (
                                            <BackupItem key={idx}>
                                                <div className="info">
                                                    <strong>{backup.filename}</strong>
                                                    <small>{backup.created_at || new Date(backup.created * 1000).toLocaleString()}</small>
                                                    <div className="size">{formatSize(backup.size)}</div>
                                                </div>
                                                <DownloadAction onClick={() => handleDownloadBackup(backup.download_url, backup.filename)}>
                                                    <Download size={16} />
                                                </DownloadAction>
                                            </BackupItem>
                                        ))}
                                    </BackupList>
                                )}

                                {loadingBackups && (
                                    <ResultBox>
                                        <div className="info"><Info size={14} /> Loading backup history...</div>
                                    </ResultBox>
                                )}
                            </ActionCard>
                        </div>

                        <div className="col-lg-6">
                            <ActionCard>
                                <ActionHeader>
                                    <div>
                                        <h4>Import Database</h4>
                                        <p>Restore or upload a database file.</p>
                                    </div>
                                    <IconWrapper className="orange">
                                        <Upload size={24} />
                                    </IconWrapper>
                                </ActionHeader>

                                <InfoBox className="orange">
                                    <AlertTriangle size={16} />
                                    <strong>Caution:</strong> Database imports should be executed from Supabase SQL tools.
                                </InfoBox>

                                <FormGroup style={{ marginBottom: '1rem' }}>
                                    <label>Backup File (.sql / .json)</label>
                                    <div className="file-input-wrapper">
                                        <input 
                                            id="db-import-file"
                                            type="file" 
                                            accept=".sql,.json"
                                            onChange={(e) => setImportFile(e.target.files[0])}
                                        />
                                    </div>
                                </FormGroup>

                                <ActionButton 
                                    onClick={handleImportDatabase} 
                                    className="warning"
                                >
                                    Use Supabase Dashboard
                                </ActionButton>
                            </ActionCard>
                        </div>

                        <div className="col-lg-12">
                            <ActionCard style={{ marginTop: '1.5rem' }}>
                                <ActionHeader>
                                    <div>
                                        <h4>Scheduled Backup</h4>
                                        <p>Automate database backups on a schedule.</p>
                                    </div>
                                    <IconWrapper className="green">
                                        <Clock size={24} />
                                    </IconWrapper>
                                </ActionHeader>
                                
                                <InfoBox className="green">
                                    <Info size={16} />
                                    Automatically create backups at scheduled intervals.
                                </InfoBox>

                                <ScheduleConfig>
                                    <ToggleSwitch>
                                        <input 
                                            type="checkbox" 
                                            checked={scheduleEnabled}
                                            onChange={handleScheduleChange}
                                            id="schedule-toggle"
                                        />
                                        <label htmlFor="schedule-toggle">
                                            {scheduleEnabled ? 'Enabled' : 'Disabled'}
                                        </label>
                                    </ToggleSwitch>

                                    {scheduleEnabled && (
                                        <div className="d-flex gap-3 flex-wrap">
                                            <FormGroup style={{ flex: 1 }}>
                                                <label>Frequency</label>
                                                <select 
                                                    value={scheduleFrequency} 
                                                    onChange={(e) => setScheduleFrequency(e.target.value)}
                                                >
                                                    <option value="hourly">Hourly</option>
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </FormGroup>

                                            <FormGroup style={{ flex: 1 }}>
                                                <label>Time</label>
                                                <input 
                                                    type="time" 
                                                    value={scheduleTime}
                                                    onChange={(e) => setScheduleTime(e.target.value)}
                                                />
                                            </FormGroup>

                                            <div style={{ flex: '100%' }}>
                                                <ScheduleInfo>
                                                    <CheckCircle size={16} />
                                                    Next backup: {scheduleFrequency} at {scheduleTime}
                                                </ScheduleInfo>
                                            </div>
                                        </div>
                                    )}
                                </ScheduleConfig>
                            </ActionCard>
                        </div>
                    </div>
                </CardBody>
            </MainCard>

            <MainCard>
                <CardHeader>
                    <Trash2 size={20} />
                    <h3>System Maintenance</h3>
                </CardHeader>
                <CardBody>
                    <div className="row g-4">
                        {}
                        <div className="col-lg-6">
                            <ActionCard>
                                <ActionHeader>
                                    <div>
                                        <h4>Clean Up Unused Pictures</h4>
                                        <p>Remove profile pictures that are no longer in use.</p>
                                    </div>
                                    <IconWrapper className="blue">
                                        <ImageIcon size={24} />
                                    </IconWrapper>
                                </ActionHeader>
                                
                                <InfoBox className="blue">
                                    <Info size={16} />
                                    Clean up unused profile files from the Supabase Storage bucket.
                                </InfoBox>

                                <ActionButton 
                                    onClick={handleCleanupPictures} 
                                    className="primary"
                                    disabled={loadingPictures}
                                >
                                    {loadingPictures ? "Cleaning Up..." : "Clean Up Images"}
                                </ActionButton>

                                {pictureResult && (
                                    <ResultBox>
                                        {pictureResult.error ? (
                                            <div className="error"><AlertTriangle size={14} /> {pictureResult.error}</div>
                                        ) : pictureResult.deleted > 0 ? (
                                            <div className="success">
                                                <div><CheckCircle size={14} /> Deleted {pictureResult.deleted} file(s). {pictureResult.total_users} users in database.</div>
                                                {pictureResult.files && pictureResult.files.length > 0 && (
                                                    <Details>
                                                        <summary>View Details</summary>
                                                        <ul>
                                                            {pictureResult.files.map((f, i) => <li key={i}>{f}</li>)}
                                                        </ul>
                                                    </Details>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="info"><Info size={14} /> No unused pictures found.</div>
                                        )}
                                    </ResultBox>
                                )}
                            </ActionCard>
                        </div>

                    </div>
                </CardBody>
            </MainCard>
        </StyledContainer>
    );
};


const StyledContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
  color: var(--text-primary);
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 0.5rem;
    svg { color: var(--accent-primary); }
  }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`;

const MainCard = styled.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 10px;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`;

const CardBody = styled.div`
   padding: 1.5rem;
`;

const ActionCard = styled.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
`;

const ActionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    h4 { margin: 0 0 4px; font-size: 1.1rem; font-weight: 700; }
    p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }
`;

const IconWrapper = styled.div`
    width: 40px; height: 40px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    
    &.blue { background: rgba(59, 130, 246, 0.1); color: var(--accent-primary); }
    &.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }
    &.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
`;

const InfoBox = styled.div`
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
    display: flex;
    gap: 10px;
    align-items: flex-start;

    &.blue { background: rgba(59, 130, 246, 0.05); color: var(--accent-primary); border: 1px solid rgba(59, 130, 246, 0.1); }
    &.orange { background: rgba(249, 115, 22, 0.05); color: #c2410c; border: 1px solid rgba(249, 115, 22, 0.1); }
    &.green { background: rgba(16, 185, 129, 0.05); color: #059669; border: 1px solid rgba(16, 185, 129, 0.1); }

    code { background: rgba(0,0,0,0.05); padding: 2px 4px; border-radius: 4px; font-family: monospace; }
`;

const ActionButton = styled.button`
    width: 100%;
    padding: 0.75rem;
    border-radius: 8px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: auto;

    &.primary {
        background: var(--accent-primary);
        color: var(--text-inverse);
        &:hover { background: var(--accent-highlight); }
    }
    &.warning {
        background: #f97316;
        color: white;
        &:hover { background: #ea580c; }
    }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ResultBox = styled.div`
    margin-top: 1rem;
    font-size: 0.9rem;
    
    .error { color: #ef4444; display: flex; align-items: center; gap: 6px; }
    .success { color: #10b981; display: flex; flex-direction: column; gap: 4px; }
    .info { color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
`;

const Details = styled.details`
    margin-top: 0.5rem;
    summary { cursor: pointer; font-size: 0.85rem; opacity: 0.8; }
    ul { margin: 0.5rem 0 0 1rem; font-size: 0.8rem; color: var(--text-secondary); max-height: 100px; overflow-y: auto; }
`;

const BackupList = styled.div`
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    h5 { font-size: 0.9rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary); }
`;

const BackupItem = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    font-size: 0.85rem;
    border-bottom: 1px solid rgba(128, 128, 128, 0.1);
    &:last-child { border-bottom: none; }
    
    .info {
        flex-grow: 1;
        strong { display: block; color: var(--text-primary); font-size: 0.85rem; margin-bottom: 2px; }
        small { color: var(--text-secondary); font-size: 0.75rem; display: block; margin-bottom: 2px; }
        .size { font-size: 0.75rem; color: var(--accent-primary); font-weight: 600; }
    }
`;

const DownloadAction = styled.button`
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
    border: 1px solid rgba(59, 130, 246, 0.2);
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        background: var(--accent-primary);
        color: white;
        transform: translateY(-1px);
    }
`;

const ScheduleConfig = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: auto;
`;

const ToggleSwitch = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    
    input[type="checkbox"] {
        appearance: none;
        width: 50px;
        height: 26px;
        background: var(--border-color);
        border-radius: 13px;
        position: relative;
        cursor: pointer;
        transition: all 0.3s;
        
        &:checked {
            background: var(--accent-primary);
        }
        
        &::before {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: white;
            top: 3px;
            left: 3px;
            transition: all 0.3s;
        }
        
        &:checked::before {
            left: 27px;
        }
    }
    
    label {
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
    }
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    
    label {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-primary);
    }
    
    select, input[type="time"] {
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 0.9rem;
        
        &:focus {
            outline: none;
            border-color: var(--accent-primary);
        }
    }
`;

const ScheduleInfo = styled.div`
    padding: 0.75rem;
    background: rgba(16, 185, 129, 0.05);
    border: 1px solid rgba(16, 185, 129, 0.1);
    border-radius: 8px;
    color: #059669;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
`;

export default SettingsView;
