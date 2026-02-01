import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TeacherAPI } from '../../../services/api';
import Loader from '../../Loader';
import { Star, MessageSquare, TrendingUp, Users } from 'lucide-react';

const EvaluationView = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await TeacherAPI.getEvaluationStatistics();
                
                setStats(data || { average_rating: 0, total_evaluations: 0, comments: [] });
            } catch (err) {
                console.error(err);
                setStats({ average_rating: 0, total_evaluations: 0, comments: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <Loader />;

    return (
        <Container>
            <Header>
                <div>
                    <Title>Performance Evaluation</Title>
                    <Subtitle>Summary of student feedback and performance metrics</Subtitle>
                </div>
                <Star size={32} color="var(--accent-primary)" fill="var(--accent-primary)" />
            </Header>

            <StatsGrid>
                <StatCard>
                    <IconWrapper $color="#f59e0b">
                        <Star size={24} fill="currentColor" />
                    </IconWrapper>
                    <StatContent>
                        <StatValue>{stats.average_rating ? Number(stats.average_rating).toFixed(1) : '0.0'}</StatValue>
                        <StatLabel>Average Rating</StatLabel>
                    </StatContent>
                </StatCard>

                <StatCard>
                    <IconWrapper $color="#3b82f6">
                        <Users size={24} />
                    </IconWrapper>
                    <StatContent>
                        <StatValue>{stats.total_evaluations || 0}</StatValue>
                        <StatLabel>Total Evaluations</StatLabel>
                    </StatContent>
                </StatCard>

                <StatCard>
                    <IconWrapper $color="#10b981">
                        <TrendingUp size={24} />
                    </IconWrapper>
                    <StatContent>
                        <StatValue>Good</StatValue>
                        <StatLabel>Performance Status</StatLabel>
                    </StatContent>
                </StatCard>
            </StatsGrid>

            {}
            <SectionTitle>
                <MessageSquare size={20} />
                Student Comments
            </SectionTitle>

            <CommentsList>
                {stats.comments && stats.comments.length > 0 ? (
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
                    <EmptyState>
                        <MessageSquare size={48} />
                        <p>No qualitative feedback available yet.</p>
                    </EmptyState>
                )}
            </CommentsList>
        </Container>
    );
};


const Container = styled.div`
    padding: 1rem;
    max-width: 1000px;
    margin: 0 auto;
    animation: fadeIn 0.4s ease-out;
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const Header = styled.div`
    display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem;
`;

const Title = styled.h2`
    font-size: 1.75rem; color: var(--text-primary); margin: 0 0 0.5rem 0; font-weight: 800;
`;

const Subtitle = styled.p`
    color: var(--text-secondary); margin: 0; font-size: 1rem;
`;

const StatsGrid = styled.div`
    display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 3rem;
`;

const StatCard = styled.div`
    background: var(--bg-secondary); padding: 1.5rem; border-radius: 16px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 1.25rem;
    box-shadow: var(--shadow-sm); transition: transform 0.2s;
    &:hover { transform: translateY(-4px); }
`;

const IconWrapper = styled.div`
    width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
    background: ${props => `${props.$color}15`}; color: ${props => props.$color};
`;

const StatContent = styled.div`
    display: flex; flex-direction: column;
`;

const StatValue = styled.div`
    font-size: 1.75rem; font-weight: 800; color: var(--text-primary); line-height: 1.2;
`;

const StatLabel = styled.div`
    font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;
`;

const SectionTitle = styled.h3`
    display: flex; align-items: center; gap: 0.75rem; font-size: 1.25rem; color: var(--text-primary); margin-bottom: 1.5rem;
    svg { color: var(--accent-primary); }
`;

const CommentsList = styled.div`
    display: flex; flex-direction: column; gap: 1rem;
`;

const CommentCard = styled.div`
    background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);
`;

const CommentHeader = styled.div`
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;
`;

const StarRating = styled.div` display: flex; gap: 2px; `;

const CommentDate = styled.span` font-size: 0.85rem; color: var(--text-secondary); `;

const CommentText = styled.p` margin: 0; color: var(--text-primary); font-style: italic; line-height: 1.6; `;

const EmptyState = styled.div`
  padding: 3rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 1rem;
  svg { opacity: 0.5; }
`;

export default EvaluationView;
