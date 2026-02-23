import React, { useState, useEffect, useMemo } from 'react';
import baseStyled from 'styled-components';
import { StudentAPI } from '../../../services/api';
import { 
    Megaphone, 
    Calendar, 
    AlertCircle, 
    Bell,
    TrendingUp,
    Users,
    Clock,
    Filter,
    X
} from 'lucide-react';
import PageSkeleton from '../../loaders/PageSkeleton';
const styled = baseStyled as any;

const AnnouncementsView = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [priorityFilter, setPriorityFilter] = useState('all');

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const data = await StudentAPI.getAnnouncements();
                setAnnouncements(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error fetching announcements:", err);
                setError(err.message || "Failed to load announcements");
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, []);

    const formatDate = (dateInput) => {
        try {
            if (!dateInput) return "Date not specified";
            const d = new Date(dateInput);
            if (isNaN(d.getTime())) return String(dateInput);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return String(dateInput);
        }
    };

    const getTimeAgo = (dateInput) => {
        try {
            const date = new Date(dateInput);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor(diffMs / (1000 * 60));

            if (diffDays > 7) return formatDate(dateInput);
            if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
            return 'Just now';
        } catch (e) {
            return formatDate(dateInput);
        }
    };

    const getPriorityConfig = (priority) => {
        const p = (priority || 'medium').toLowerCase();
        if (p === 'high') {
            return { 
                icon: AlertCircle, 
                label: 'Urgent', 
                color: '#ef4444', 
                bg: 'rgba(239, 68, 68, 0.1)',
                order: 1 
            };
        } else if (p === 'medium') {
            return { 
                icon: TrendingUp, 
                label: 'Important', 
                color: '#f59e0b', 
                bg: 'rgba(245, 158, 11, 0.1)',
                order: 2 
            };
        } else {
            return { 
                icon: Bell, 
                label: 'Info', 
                color: '#3b82f6', 
                bg: 'rgba(59, 130, 246, 0.1)',
                order: 3 
            };
        }
    };

    const getTargetConfig = (targetRole) => {
        const role = (targetRole || 'all').toLowerCase();
        if (role === 'all') {
            return { icon: Users, label: 'All Users', color: '#8b5cf6' };
        } else if (role === 'student') {
            return { icon: Users, label: 'Students', color: '#10b981' };
        }
        return { icon: Users, label: targetRole, color: '#6b7280' };
    };

    const stats = useMemo(() => {
        const urgent = announcements.filter(a => (a.priority || '').toLowerCase() === 'high').length;
        const recent = announcements.filter(a => {
            const date = new Date(a.published_at);
            const daysDiff = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
        }).length;

        return { total: announcements.length, urgent, recent };
    }, [announcements]);

    const filteredAnnouncements = useMemo(() => announcements.filter(a => {
        if (priorityFilter === 'all') return true;
        return (a.priority || 'medium').toLowerCase() === priorityFilter;
    }), [announcements, priorityFilter]);

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
                <h3>Failed to Load Announcements</h3>
                <p>{error}</p>
            </ErrorContainer>
        );
    }

    return (
        <Container>
            <Header>
                <HeaderContent>
                    <Megaphone size={32} />
                    <div>
                        <h2>Campus Announcements</h2>
                        <p>Stay informed with the latest news and important updates</p>
                    </div>
                </HeaderContent>
            </Header>

            <StatsGrid>
                <StatCard $color="#3b82f6">
                    <StatIcon>
                        <Bell size={24} />
                    </StatIcon>
                    <StatContent>
                        <StatLabel>Total</StatLabel>
                        <StatValue>{stats.total}</StatValue>
                    </StatContent>
                </StatCard>

                <StatCard $color="#ef4444">
                    <StatIcon>
                        <AlertCircle size={24} />
                    </StatIcon>
                    <StatContent>
                        <StatLabel>Urgent</StatLabel>
                        <StatValue>{stats.urgent}</StatValue>
                    </StatContent>
                </StatCard>

                <StatCard $color="#10b981">
                    <StatIcon>
                        <Clock size={24} />
                    </StatIcon>
                    <StatContent>
                        <StatLabel>Recent (7 days)</StatLabel>
                        <StatValue>{stats.recent}</StatValue>
                    </StatContent>
                </StatCard>
            </StatsGrid>

            <FilterSection>
                <FilterLabel>
                    <Filter size={16} />
                    Filter by Priority:
                </FilterLabel>
                <FilterButtons>
                    <FilterButton 
                        $active={priorityFilter === 'all'} 
                        onClick={() => setPriorityFilter('all')}
                    >
                        All
                    </FilterButton>
                    <FilterButton 
                        $active={priorityFilter === 'high'} 
                        $color="#ef4444"
                        onClick={() => setPriorityFilter('high')}
                    >
                        Urgent
                    </FilterButton>
                    <FilterButton 
                        $active={priorityFilter === 'medium'} 
                        $color="#f59e0b"
                        onClick={() => setPriorityFilter('medium')}
                    >
                        Important
                    </FilterButton>
                    <FilterButton 
                        $active={priorityFilter === 'low'} 
                        $color="#3b82f6"
                        onClick={() => setPriorityFilter('low')}
                    >
                        Info
                    </FilterButton>
                    {priorityFilter !== 'all' && (
                        <ClearFilterButton onClick={() => setPriorityFilter('all')}>
                            <X size={14} /> Clear
                        </ClearFilterButton>
                    )}
                </FilterButtons>
            </FilterSection>

            {filteredAnnouncements.length === 0 ? (
                <EmptyState>
                    <Megaphone size={64} />
                    <h3>No Announcements Found</h3>
                    <p>
                        {priorityFilter !== 'all' 
                            ? 'No announcements match your current filter. Try changing the filter or clearing it.'
                            : 'There are currently no announcements to display.'}
                    </p>
                </EmptyState>
            ) : (
                <AnnouncementsGrid>
                    {filteredAnnouncements.map((announcement, index) => {
                        const priorityConfig = getPriorityConfig(announcement.priority);
                        const targetConfig = getTargetConfig(announcement.target_role);
                        const PriorityIcon = priorityConfig.icon;
                        const TargetIcon = targetConfig.icon;

                        return (
                            <AnnouncementCard key={announcement.id || index} $priority={announcement.priority}>
                                <CardAccent $color={priorityConfig.color} />
                                
                                <CardHeader>
                                    <TitleSection>
                                        <AnnouncementTitle>{announcement.title || 'Untitled'}</AnnouncementTitle>
                                        <MetaInfo>
                                            <TimeStamp>
                                                <Clock size={14} />
                                                {getTimeAgo(announcement.published_at)}
                                            </TimeStamp>
                                        </MetaInfo>
                                    </TitleSection>
                                    <PriorityBadge $color={priorityConfig.color} $bg={priorityConfig.bg}>
                                        <PriorityIcon size={14} />
                                        <span>{priorityConfig.label}</span>
                                    </PriorityBadge>
                                </CardHeader>

                                <CardBody>
                                    <Content dangerouslySetInnerHTML={{ 
                                        __html: (announcement.content || '').replace(/\n/g, '<br>') 
                                    }} />
                                </CardBody>

                                <CardFooter>
                                    <TargetBadge $color={targetConfig.color}>
                                        <TargetIcon size={12} />
                                        <span>{targetConfig.label}</span>
                                    </TargetBadge>
                                    
                                    {announcement.expires_at && (
                                        <ExpiryInfo>
                                            <Calendar size={12} />
                                            <span>Expires: {formatDate(announcement.expires_at)}</span>
                                        </ExpiryInfo>
                                    )}
                                </CardFooter>
                            </AnnouncementCard>
                        );
                    })}
                </AnnouncementsGrid>
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
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
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
        width: 80px;
        height: 80px;
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
    width: 50px;
    height: 50px;
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

const FilterSection = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
`;

const FilterLabel = styled.div`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: var(--text-secondary);
    font-size: 0.9rem;

    svg {
        color: var(--accent-primary);
    }
`;

const FilterButtons = styled.div`
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    flex: 1;
`;

const FilterButton = styled.button`
    padding: 0.5rem 1rem;
    border-radius: 8px;
    border: 1px solid ${props => props.$active ? (props.$color || 'var(--accent-primary)') : 'var(--border-color)'};
    background: ${props => props.$active ? (props.$color || 'var(--accent-primary)') : 'var(--bg-tertiary)'};
    color: ${props => props.$active ? 'white' : 'var(--text-primary)'};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
    }
`;

const ClearFilterButton = styled.button`
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    transition: all 0.2s;

    &:hover {
        background: var(--bg-primary);
        color: var(--text-primary);
    }
`;

const AnnouncementsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 1.5rem;
`;

const AnnouncementCard = styled.div`
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    flex-direction: column;

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
    }
`;

const CardAccent = styled.div`
    height: 4px;
    background: ${props => props.$color};
`;

const CardHeader = styled.div`
    padding: 1.5rem 1.5rem 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
`;

const TitleSection = styled.div`
    flex: 1;
    min-width: 0;
`;

const AnnouncementTitle = styled.h3`
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
`;

const MetaInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
`;

const TimeStamp = styled.div`
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
    font-weight: 500;

    svg {
        flex-shrink: 0;
    }
`;

const PriorityBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    border-radius: 20px;
    background: ${props => props.$bg};
    color: ${props => props.$color};
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    svg {
        flex-shrink: 0;
    }
`;

const CardBody = styled.div`
    padding: 0 1.5rem 1.25rem 1.5rem;
    flex: 1;
`;

const Content = styled.div`
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.7;
    
    br {
        margin-bottom: 0.5rem;
    }
`;

const CardFooter = styled.div`
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color);
    background: var(--bg-tertiary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
`;

const TargetBadge = styled.div`
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.75rem;
    border-radius: 16px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    color: ${props => props.$color};
    font-size: 0.75rem;
    font-weight: 600;

    svg {
        flex-shrink: 0;
    }
`;

const ExpiryInfo = styled.div`
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-weight: 500;

    svg {
        flex-shrink: 0;
    }
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
        max-width: 500px;
        margin: 0 auto;
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

export default AnnouncementsView;
