import React, { useState, useEffect } from 'react';
import baseStyled from 'styled-components';
import { AdminAPI } from 'services/apis/admin';
import { 
  MessageSquare, 
  Send, 
  Filter, 
  Clock, 
  CheckCircle, 
  User,
  ShieldCheck,
  AlertCircle,
  Inbox
} from 'lucide-react';
import Toast from '../../common/Toast';
import SkeletonLoader from '../../loaders/SkeletonLoader';
const styled = baseStyled as any;


const FeedbackInboxView = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ unread: 0, replied: 0, total: 0 });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const response = await AdminAPI.getFeedbacks(filter);
      const feedbackList = Array.isArray(response) ? response : (response?.data || []);
      setFeedbacks(feedbackList);
      
      const statsRes = await AdminAPI.getFeedbackStats();
      const statsData = statsRes?.data || statsRes || { unread: 0, replied: 0, total: 0 };
      setStats(statsData);
    } catch (error) {
      setToast({ show: true, message: 'Failed to load feedbacks', type: 'error' });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [filter]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      await AdminAPI.replyFeedback(selectedFeedback.id, replyText);
      setToast({ show: true, message: 'Reply sent successfully', type: 'success' });
      setReplyText('');
      setSelectedFeedback(null);
      fetchFeedbacks();
    } catch (error) {
      setToast({ show: true, message: 'Failed to send reply', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'suggestion': return '#3b82f6';
      case 'complaint': return '#ef4444';
      case 'inquiry': return '#f59e0b';
      case 'shoutout': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <Container>
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
      <Header>
        <TitleGroup>
          <Inbox size={24} color="var(--accent-primary)" />
          <div>
            <Title>Feedback Inbox</Title>
            <Subtitle>Manage anonymous feedback from students</Subtitle>
          </div>
        </TitleGroup>

        <StatsGrid>
          <StatCard $type="unread">
            <StatLabel>Unread</StatLabel>
            <StatValue>{stats.unread}</StatValue>
          </StatCard>
          <StatCard $type="replied">
            <StatLabel>Replied</StatLabel>
            <StatValue>{stats.replied}</StatValue>
          </StatCard>
        </StatsGrid>
      </Header>

      <Filters>
        <FilterButton 
          $active={filter === 'unread'} 
          onClick={() => setFilter('unread')}
        >
          <Clock size={16} /> Unread
        </FilterButton>
        <FilterButton 
          $active={filter === 'replied'} 
          onClick={() => setFilter('replied')}
        >
          <CheckCircle size={16} /> Replied
        </FilterButton>
        <FilterButton 
          $active={filter === ''} 
          onClick={() => setFilter('')}
        >
          <Filter size={16} /> All
        </FilterButton>
      </Filters>

      <ContentWrapper>
        <FeedbackList>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <SkeletonLoader />
              <SkeletonLoader />
            </div>
          ) : feedbacks.length === 0 ? (
            <EmptyState>
              <MessageSquare size={48} opacity={0.3} />
              <p>No feedbacks found in this category.</p>
            </EmptyState>
          ) : (
            feedbacks.map(f => (
              <FeedbackCard 
                key={f.id} 
                $selected={selectedFeedback?.id === f.id}
                onClick={() => setSelectedFeedback(f)}
              >
                <CardHeader>
                  <CategoryBadge $color={getCategoryColor(f.category)}>
                    {f.category}
                  </CategoryBadge>
                  <TimeText>{f.created_at}</TimeText>
                </CardHeader>
                <MessageExcerpt>{f.message}</MessageExcerpt>
                <CardFooter>
                  <StatusTag $replied={f.status === 'replied'}>
                    {f.status === 'unread' ? <Clock size={12} /> : <CheckCircle size={12} />}
                    {f.status}
                  </StatusTag>
                </CardFooter>
              </FeedbackCard>
            ))
          )}
        </FeedbackList>

        <DetailPanel>
          {selectedFeedback ? (
            <DetailContent>
              <DetailHeader>
                <DetailTitleGroup>
                  <CategoryBadge $color={getCategoryColor(selectedFeedback.category)}>
                    {selectedFeedback.category}
                  </CategoryBadge>
                  <TimeText>Received on {selectedFeedback.created_at}</TimeText>
                </DetailTitleGroup>
                <StatusTag $replied={selectedFeedback.status === 'replied'}>
                  {selectedFeedback.status}
                </StatusTag>
              </DetailHeader>

              <MessageSection>
                <SectionLabel><User size={14} /> Anonymous Student Message</SectionLabel>
                <MessageBody>{selectedFeedback.message}</MessageBody>
              </MessageSection>

              {selectedFeedback.status === 'replied' && (
                <ReplySection>
                  <SectionLabel>
                    <ShieldCheck size={14} /> 
                    Response by {selectedFeedback.replied_by_name} ({selectedFeedback.replied_by_role})
                  </SectionLabel>
                  <ReplyBody>{selectedFeedback.reply}</ReplyBody>
                  <TimeText style={{ marginTop: '8px' }}>Replied at {selectedFeedback.replied_at}</TimeText>
                </ReplySection>
              )}

              {selectedFeedback.status === 'unread' && (
                <ReplyForm onSubmit={handleReply}>
                  <SectionLabel><Send size={14} /> Formulate Response</SectionLabel>
                  <TextArea 
                    placeholder="Type your reply here..." 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    required
                  />
                  <SubmitButton type="submit" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send Reply'}
                  </SubmitButton>
                </ReplyForm>
              )}
            </DetailContent>
          ) : (
            <NoSelectionState>
              <AlertCircle size={48} opacity={0.3} />
              <p>Select a feedback to view details and respond.</p>
            </NoSelectionState>
          )}
        </DetailPanel>
      </ContentWrapper>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
  animation: fadeIn 0.3s ease-out;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.9rem;
`;

const StatsGrid = styled.div`
  display: flex;
  gap: 1rem;
`;

const StatCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  border-bottom: 3px solid ${props => props.$type === 'unread' ? '#f59e0b' : '#10b981'};
`;

const StatLabel = styled.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-tertiary);
`;

const StatValue = styled.span`
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
`;

const Filters = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 10px;
  width: fit-content;
  border: 1px solid var(--border-color);
`;

const FilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  background: ${props => props.$active ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.$active ? 'white' : 'var(--text-secondary)'};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$active ? 'var(--accent-primary)' : 'var(--bg-tertiary)'};
  }
`;

const ContentWrapper = styled.div`
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 1.5rem;
  flex: 1;
  min-height: 500px;
`;

const FeedbackList = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 1rem;
  max-height: calc(100vh - 300px);

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
`;

const FeedbackCard = styled.div`
  padding: 1.25rem;
  background: ${props => props.$selected ? 'var(--bg-tertiary)' : 'var(--bg-primary)'};
  border: 1px solid ${props => props.$selected ? 'var(--accent-primary)' : 'var(--border-color)'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
    border-color: var(--accent-primary);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CategoryBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${props => props.$color}22;
  color: ${props => props.$color};
  text-transform: uppercase;
`;

const TimeText = styled.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
`;

const MessageExcerpt = styled.p`
  font-size: 0.9rem;
  color: var(--text-primary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const StatusTag = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${props => props.$replied ? '#10b981' : '#f59e0b'};
`;

const DetailPanel = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
`;

const DetailContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: slideRight 0.3s ease-out;
`;

const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
`;

const DetailTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const MessageSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SectionLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MessageBody = styled.div`
  background: var(--bg-tertiary);
  padding: 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
  border-left: 4px solid var(--accent-primary);
`;

const ReplySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem;
  background: #10b98111;
  border: 1px solid #10b98133;
  border-radius: 12px;
`;

const ReplyBody = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
`;

const ReplyForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 150px;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 1rem;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
`;

const SubmitButton = styled.button`
  align-self: flex-end;
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--accent-highlight);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: var(--text-secondary);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--text-tertiary);
  text-align: center;
  gap: 1rem;
`;

const NoSelectionState = styled(EmptyState)`
  height: 100%;
`;

export default FeedbackInboxView;
