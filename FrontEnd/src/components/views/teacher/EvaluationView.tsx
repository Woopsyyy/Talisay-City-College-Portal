import React, { useState, useEffect } from 'react';
import baseStyled from 'styled-components';
import { TeacherAPI, AdminAPI } from '../../../services/api';
import { 
    Star, 
    MessageSquare, 
    TrendingUp, 
    Users, 
    Settings2, 
    ToggleLeft, 
    ToggleRight,
    Edit3
} from 'lucide-react';
import Toast from '../../common/Toast';
import PageSkeleton from '../../loaders/PageSkeleton';
const styled = baseStyled as any;

const EvaluationView = ({ isAdmin = false }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState('1st Semester');
    const [isEvaluationEnabled, setIsEvaluationEnabled] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                // If admin (Dean), maybe we fetch global stats? 
                // For now, let's stick to the current TeacherAPI or a hypothetical DeanAPI
                const data = await TeacherAPI.getEvaluationStatistics(selectedSemester);
                setStats(data || { average_rating: 0, total_evaluations: 0, comments: [] });
            } catch (err) {
                console.error(err);
                setStats({ average_rating: 0, total_evaluations: 0, comments: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [selectedSemester]);

    const showToast = (message, type = 'success') => setToast({ show: true, message, type });

    const toggleEvaluationStatus = () => {
        setIsEvaluationEnabled(!isEvaluationEnabled);
        showToast(`Evaluations ${!isEvaluationEnabled ? 'enabled' : 'disabled'}`);
    };

    if (loading && !stats) return <PageSkeleton variant="dashboard" />;

    return (
        <Container>
            {toast.show && <Toast {...toast} onClose={() => setToast({ ...toast, show: false })} />}
            <Header>
                <div>
                    <Title>{isAdmin ? "Evaluation Management" : "Performance Evaluation"}</Title>
                    <Subtitle>{isAdmin ? "Monitor department performance and manage evaluation cycles" : "Summary of student feedback and performance metrics"}</Subtitle>
                </div>
                <ActionGroup>
                    {isAdmin && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                             <ControlButton onClick={toggleEvaluationStatus} $active={isEvaluationEnabled}>
                                 {isEvaluationEnabled ? <><ToggleRight size={20} /> Enabled</> : <><ToggleLeft size={20} /> Disabled</>}
                             </ControlButton>
                             <ControlButton onClick={() => showToast("Template editor coming soon", "info")}>
                                 <Edit3 size={18} /> Update Template
                             </ControlButton>
                        </div>
                    )}
                    <SemesterTabs>
                        <Tab $active={selectedSemester === '1st Semester'} onClick={() => setSelectedSemester('1st Semester')}>1st Sem</Tab>
                        <Tab $active={selectedSemester === '2nd Semester'} onClick={() => setSelectedSemester('2nd Semester')}>2nd Sem</Tab>
                    </SemesterTabs>
                </ActionGroup>
            </Header>

            <StatsGrid>
                <StatCard>
                    <IconWrapper $color="#f59e0b"><Star size={24} fill="currentColor" /></IconWrapper>
                    <StatContent>
                        <StatValue>{stats?.average_rating ? Number(stats.average_rating).toFixed(1) : '0.0'}</StatValue>
                        <StatLabel>Average Rating</StatLabel>
                    </StatContent>
                </StatCard>
                <StatCard>
                    <IconWrapper $color="#3b82f6"><Users size={24} /></IconWrapper>
                    <StatContent>
                        <StatValue>{stats?.total_evaluations || 0}</StatValue>
                        <StatLabel>Total Evaluations</StatLabel>
                    </StatContent>
                </StatCard>
                <StatCard>
                    <IconWrapper $color="#10b981"><TrendingUp size={24} /></IconWrapper>
                    <StatContent>
                        <StatValue>{isAdmin ? "Very Good" : "Good"}</StatValue>
                        <StatLabel>Department Status</StatLabel>
                    </StatContent>
                </StatCard>
            </StatsGrid>

            <SectionTitle><MessageSquare size={20} /> {isAdmin ? "Latest Feedback" : "Student Comments"}</SectionTitle>

            <CommentsList>
                {stats?.comments && stats.comments.length > 0 ? (
                    stats.comments.map((comment, idx) => (
                        <CommentCard key={idx}>
                            <CommentHeader>
                                <StarRating>
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} fill={i < comment.rating ? "#f59e0b" : "var(--border-color)"} color={i < comment.rating ? "#f59e0b" : "var(--border-color)"} />
                                    ))}
                                </StarRating>
                                <CommentDate>{comment.date || 'Unknown Date'}</CommentDate>
                            </CommentHeader>
                            <CommentText>"{comment.text}"</CommentText>
                        </CommentCard>
                    ))
                ) : (
                    <EmptyState><MessageSquare size={48} /><p>No qualitative feedback available yet.</p></EmptyState>
                )}
            </CommentsList>
        </Container>
    );
};

const Container = styled.div` padding: 1rem; max-width: 1000px; margin: 0 auto; animation: fadeIn 0.4s ease-out; `;
const Header = styled.div` display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; `;
const Title = styled.h2` font-size: 1.75rem; color: var(--text-primary); margin: 0 0 0.5rem 0; font-weight: 800; `;
const Subtitle = styled.p` color: var(--text-secondary); margin: 0; font-size: 1rem; `;
const ActionGroup = styled.div` display: flex; align-items: center; gap: 1.5rem; `;
const SemesterTabs = styled.div` display: flex; background: var(--bg-secondary); padding: 4px; border-radius: 12px; border: 1px solid var(--border-color); `;
const Tab = styled.button` padding: 0.6rem 1.25rem; border-radius: 9px; border: none; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; background: ${props => props.$active ? 'var(--accent-primary)' : 'transparent'}; color: ${props => props.$active ? 'white' : 'var(--text-secondary)'}; `;
const StatsGrid = styled.div` display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; `;
const StatCard = styled.div` background: var(--bg-secondary); padding: 1.5rem; border-radius: 16px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm); transition: transform 0.2s; &:hover { transform: translateY(-4px); } `;
const IconWrapper = styled.div` width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: ${props => `${props.$color}15`}; color: ${props => props.$color}; `;
const StatContent = styled.div` display: flex; flex-direction: column; `;
const StatValue = styled.div` font-size: 1.75rem; font-weight: 800; color: var(--text-primary); `;
const StatLabel = styled.div` font-size: 0.9rem; color: var(--text-secondary); `;
const SectionTitle = styled.h3` display: flex; align-items: center; gap: 0.75rem; font-size: 1.25rem; color: var(--text-primary); margin-bottom: 1.5rem; svg { color: var(--accent-primary); } `;
const CommentsList = styled.div` display: flex; flex-direction: column; gap: 1rem; `;
const CommentCard = styled.div` background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color); `;
const CommentHeader = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; `;
const StarRating = styled.div` display: flex; gap: 2px; `;
const CommentDate = styled.span` font-size: 0.85rem; color: var(--text-secondary); `;
const CommentText = styled.p` margin: 0; color: var(--text-primary); font-style: italic; line-height: 1.6; `;
const ControlButton = styled.button` display: flex; align-items: center; gap: 8px; background: ${props => props.$active === undefined ? 'var(--bg-secondary)' : (props.$active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)')}; color: ${props => props.$active === undefined ? 'var(--text-primary)' : (props.$active ? '#10b981' : '#ef4444')}; border: 1px solid var(--border-color); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; &:hover { border-color: var(--accent-primary); } `;
const EmptyState = styled.div` padding: 3rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 1rem; svg { opacity: 0.5; } `;

export default EvaluationView;
