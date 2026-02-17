import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { StudentAPI } from '../../../services/api';
import { 
    Briefcase, 
    Calendar, 
    DollarSign, 
    CheckCircle, 
    Clock, 
    Pause, 
    Target,
    TrendingUp,
    Building2
} from 'lucide-react';
import PageSkeleton from '../../loaders/PageSkeleton';

const TransparencyView = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await StudentAPI.getCampusProjects();
                setProjects(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Load transparency error:", err);
                setError(err.message || "Failed to load projects");
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        
        const cleaned = String(amount).replace(/[₱,]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) return amount;
        return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return dateString;
        }
    };

    const getStatusConfig = (status) => {
        const statusLower = (status || '').toLowerCase();
        if (statusLower === 'completed') {
            return { icon: CheckCircle, label: 'Completed', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
        } else if (statusLower === 'ongoing') {
            return { icon: Clock, label: 'Ongoing', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
        } else if (statusLower === 'paused') {
            return { icon: Pause, label: 'Paused', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
        } else {
            return { icon: Target, label: 'Planned', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
        }
    };

    const stats = useMemo(() => {
        const totalBudget = projects.reduce((sum, proj) => {
            const cleaned = String(proj.budget || '0').replace(/[₱,]/g, '');
            const num = parseFloat(cleaned);
            return sum + (isNaN(num) ? 0 : num);
        }, 0);

        const completed = projects.filter(p => (p.status || '').toLowerCase() === 'completed').length;
        const ongoing = projects.filter(p => (p.status || '').toLowerCase() === 'ongoing').length;

        return { totalBudget, completed, ongoing, total: projects.length };
    }, [projects]);

    if (loading) {
        return (
            <LoadingContainer>
                <PageSkeleton variant="cards" count={4} />
            </LoadingContainer>
        );
    }

    if (error) {
        return (
            <ErrorContainer>
                <AlertCircle size={48} />
                <h3>Failed to Load Projects</h3>
                <p>{error}</p>
            </ErrorContainer>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderContent>
                    <Building2 size={32} />
                    <div>
                        <h2>Campus Transparency</h2>
                        <p>View ongoing and completed campus projects with budget allocation</p>
                    </div>
                </HeaderContent>
            </Header>

            <StatsGrid>
                <StatCard $color="#3b82f6">
                    <StatIcon>
                        <Briefcase size={24} />
                    </StatIcon>
                    <StatContent>
                        <StatLabel>Total Projects</StatLabel>
                        <StatValue>{stats.total}</StatValue>
                    </StatContent>
                </StatCard>

                <StatCard $color="#10b981">
                    <StatIcon>
                        <CheckCircle size={24} />
                    </StatIcon>
                    <StatContent>
                        <StatLabel>Completed</StatLabel>
                        <StatValue>{stats.completed}</StatValue>
                    </StatContent>
                </StatCard>

                <StatCard $color="#f59e0b">
                    <StatIcon>
                        <Clock size={24} />
                    </StatIcon>
                    <StatContent>
                        <StatLabel>Ongoing</StatLabel>
                        <StatValue>{stats.ongoing}</StatValue>
                    </StatContent>
                </StatCard>

                <StatCard $color="#8b5cf6">
                    <StatIcon>
                        <DollarSign size={24} />
                    </StatIcon>
                    <StatContent>
                        <StatLabel>Total Budget</StatLabel>
                        <StatValue>{formatCurrency(stats.totalBudget)}</StatValue>
                    </StatContent>
                </StatCard>
            </StatsGrid>

            {projects.length === 0 ? (
                <EmptyState>
                    <Target size={64} />
                    <h3>No Projects Available</h3>
                    <p>There are currently no campus projects to display.</p>
                </EmptyState>
            ) : (
                <ProjectsGrid>
                    {projects.map((project, index) => {
                        const statusConfig = getStatusConfig(project.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <ProjectCard key={project.id || index}>
                                <CardHeader>
                                    <ProjectTitle>{project.name || 'Unnamed Project'}</ProjectTitle>
                                    <StatusBadge $color={statusConfig.color} $bg={statusConfig.bg}>
                                        <StatusIcon size={16} />
                                        <span>{statusConfig.label}</span>
                                    </StatusBadge>
                                </CardHeader>

                                {project.description && (
                                    <ProjectDescription>{project.description}</ProjectDescription>
                                )}

                                <ProjectDetails>
                                    <DetailItem>
                                        <DetailIcon>
                                            <DollarSign size={18} />
                                        </DetailIcon>
                                        <DetailContent>
                                            <DetailLabel>Budget</DetailLabel>
                                            <DetailValue>{formatCurrency(project.budget)}</DetailValue>
                                        </DetailContent>
                                    </DetailItem>

                                    <DetailItem>
                                        <DetailIcon>
                                            <Calendar size={18} />
                                        </DetailIcon>
                                        <DetailContent>
                                            <DetailLabel>Start Date</DetailLabel>
                                            <DetailValue>{formatDate(project.start_date)}</DetailValue>
                                        </DetailContent>
                                    </DetailItem>
                                </ProjectDetails>

                                <CardFooter $color={statusConfig.color} />
                            </ProjectCard>
                        );
                    })}
                </ProjectsGrid>
            )}
        </Container>
    );
};


const Container = styled.div`
    animation: fadeIn 0.4s ease-out;
    max-width: 1400px;
    margin: 0 auto;

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;

const Header = styled.div`
    margin-bottom: 2rem;
`;

const HeaderContent = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;

    svg {
        color: var(--accent-primary);
        flex-shrink: 0;
    }

    h2 {
        font-size: 1.75rem;
        font-weight: 800;
        color: var(--text-primary);
        margin: 0 0 0.25rem 0;
    }

    p {
        color: var(--text-secondary);
        font-size: 1rem;
        margin: 0;
    }
`;

const StatsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2.5rem;
`;

const StatCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 100px;
        height: 100px;
        background: ${props => props.$color};
        opacity: 0.05;
        border-radius: 50%;
        transform: translate(30%, -30%);
    }

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
        border-color: ${props => props.$color};
    }
`;

const StatIcon = styled.div`
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    flex-shrink: 0;
`;

const StatContent = styled.div`
    flex: 1;
`;

const StatLabel = styled.div`
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
    margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
`;

const ProjectsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.5rem;
`;

const ProjectCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
    }
`;

const CardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
`;

const ProjectTitle = styled.h3`
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
    line-height: 1.4;
`;

const StatusBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border-radius: 20px;
    background: ${props => props.$bg};
    color: ${props => props.$color};
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;

    svg {
        flex-shrink: 0;
    }
`;

const ProjectDescription = styled.p`
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0 0 1.25rem 0;
`;

const ProjectDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
`;

const DetailItem = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
`;

const DetailIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    flex-shrink: 0;
`;

const DetailContent = styled.div`
    flex: 1;
`;

const DetailLabel = styled.div`
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;
    margin-bottom: 0.2rem;
`;

const DetailValue = styled.div`
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
`;

const CardFooter = styled.div`
    height: 4px;
    background: linear-gradient(90deg, ${props => props.$color}, transparent);
    border-radius: 2px;
    margin: 1.25rem -1.5rem -1.5rem -1.5rem;
`;

const EmptyState = styled.div`
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);

    svg {
        opacity: 0.3;
        margin-bottom: 1rem;
    }

    h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }

    p {
        font-size: 1rem;
        margin: 0;
    }
`;

const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);

    p {
        margin-top: 1rem;
        font-size: 1rem;
    }
`;

const ErrorContainer = styled.div`
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-secondary);

    svg {
        color: #ef4444;
        margin-bottom: 1rem;
    }

    h3 {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }

    p {
        font-size: 1rem;
        color: #ef4444;
        margin: 0;
    }
`;

export default TransparencyView;
