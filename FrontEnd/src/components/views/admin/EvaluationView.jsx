import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AdminAPI, getAvatarUrl } from '../../../services/api';
import { ClipboardCheck, ToggleLeft, AlertTriangle, User } from 'lucide-react';
import Toast from '../../common/Toast';

const EvaluationView = () => {
    const [enabled, setEnabled] = useState(true);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [avatarUrls, setAvatarUrls] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [settings, lowestRated] = await Promise.all([
                AdminAPI.getEvaluationSettings().catch(() => ({ enabled: true })),
                AdminAPI.getLowestRatedTeachers().catch(() => ({ teachers: [] }))
            ]);

            setEnabled(settings.enabled !== false);
            setTeachers(lowestRated.teachers || []);
            
            const newAvatarUrls = {};
            const teacherList = lowestRated.teachers || [];
            
            await Promise.all(teacherList.map(async (t) => {
                if(t.image_path) {
                     try {
                         newAvatarUrls[t.id] = await getAvatarUrl(t.id, t.image_path);
                     } catch(e) {
                         
                     }
                }
            }));
            
            setAvatarUrls(newAvatarUrls);

        } catch (err) {
            console.error("Error loading evaluation data:", err);
            setToast({ show: true, message: "Failed to load evaluation data.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async () => {
        const newState = !enabled;
        setEnabled(newState);
        
        try {
            await AdminAPI.updateEvaluationSettings({ enabled: newState });
            setToast({ show: true, message: "Evaluation settings updated.", type: 'success' });
        } catch (err) {
            console.error("Error updating settings:", err);
            setToast({ show: true, message: "Failed to update settings.", type: 'error' });
            setEnabled(!newState); 
        }
    };

    const getScoreColor = (percentage) => {
        if (percentage < 50) return '#ef4444'; 
        if (percentage < 70) return '#f59e0b'; 
        return '#10b981'; 
    };

    return (
        <StyledContainer>
            <HeaderSection>
                <div>
                    <h2><ClipboardCheck size={32} /> Evaluation Management</h2>
                    <p>Enable or disable teacher evaluations and view performance metrics.</p>
                </div>
            </HeaderSection>
            
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(prev => ({ ...prev, show: false }))} 
                />
            )}

            <div className="row g-4 mb-4">
                <div className="col-12">
                     <MainCard>
                        <CardHeader>
                            <ToggleLeft size={20} />
                            <h3>Evaluation Settings</h3>
                        </CardHeader>
                        <CardBody>
                            <SettingsRow>
                                <div>
                                    <h5 className="m-0 fw-bold text-primary">Enable Teacher Evaluations</h5>
                                    <p className="m-0 text-secondary small mt-1">
                                        When enabled, students can evaluate their teachers. When disabled, students cannot access the evaluation form.
                                    </p>
                                </div>
                                <SwitchLabel>
                                    <input 
                                        type="checkbox" 
                                        checked={enabled} 
                                        onChange={handleToggle}
                                    />
                                    <span className="slider"></span>
                                </SwitchLabel>
                            </SettingsRow>
                        </CardBody>
                     </MainCard>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-12">
                     <MainCard>
                        <CardHeader>
                            <AlertTriangle size={20} />
                            <h3>Lowest Rated Teachers</h3>
                        </CardHeader>
                        <CardBody>
                             {teachers.length === 0 ? (
                                <EmptyState>No teacher evaluations available yet.</EmptyState>
                             ) : (
                                <TeacherList>
                                    {teachers.map((teacher, index) => {
                                        const percentage = parseFloat(teacher.percentage || 0).toFixed(1);
                                        const rating = parseFloat(teacher.average_rating || 0).toFixed(2);
                                        const color = getScoreColor(teacher.percentage || 0);

                                        return (
                                            <TeacherItem key={teacher.id || index}>
                                                <Rank>{index + 1}</Rank>
                                                <Avatar 
                                                    src={avatarUrls[teacher.id] || "/images/sample.jpg"}
                                                    onError={(e) => { e.target.src = "/images/sample.jpg" }}
                                                />
                                                <Info>
                                                    <h4>{teacher.full_name || "Unknown Teacher"}</h4>
                                                    <Stats>
                                                        <Badge>{teacher.total_evaluations} evaluations</Badge>
                                                        <Badge outline color={color}>{rating} / 4.00 Average</Badge>
                                                    </Stats>
                                                </Info>
                                                <Score color={color}>
                                                    {percentage}%
                                                </Score>
                                            </TeacherItem>
                                        );
                                    })}
                                </TeacherList>
                             )}
                        </CardBody>
                     </MainCard>
                </div>
            </div>
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

const SettingsRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
`;

const SwitchLabel = styled.label`
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
    
    input { 
        opacity: 0;
        width: 0;
        height: 0;
    }

    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg-tertiary);
        border: 1px solid var(--border-color);
        transition: .4s;
        border-radius: 34px;
    }

    .slider:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    input:checked + .slider {
        background-color: var(--accent-primary);
        border-color: var(--accent-primary);
    }

    input:checked + .slider:before {
        transform: translateX(26px);
    }
`;

const TeacherList = styled.div`
    display: flex;
    flex-direction: column;
`;

const TeacherItem = styled.div`
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 1.25rem;
    border-bottom: 1px solid var(--border-color);
    transition: background 0.2s;
    &:last-child { border-bottom: none; }
    &:hover { background: var(--bg-tertiary); }
`;

const Rank = styled.div`
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-secondary);
    min-width: 30px;
    text-align: center;
`;

const Avatar = styled.img`
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border-color);
`;

const Info = styled.div`
    flex: 1;
    h4 { margin: 0 0 4px; font-size: 1.1rem; color: var(--text-primary); font-weight: 600; }
`;

const Stats = styled.div`
    display: flex;
    gap: 8px;
`;

const Badge = styled.span`
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 12px;
    background: ${props => props.outline ? 'transparent' : 'var(--bg-tertiary)'};
    color: ${props => props.outline ? props.color : 'var(--text-secondary)'};
    border: ${props => props.outline ? `1px solid ${props.color}` : 'none'};
    font-weight: 600;
`;

const Score = styled.div`
    font-size: 1.5rem;
    font-weight: 800;
    color: ${props => props.color};
`;

const EmptyState = styled.p`
    text-align: center;
    color: var(--text-secondary);
    margin: 0;
    padding: 2rem 0;
`;

export default EvaluationView;
