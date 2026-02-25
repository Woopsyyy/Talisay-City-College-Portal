import React, { useState, useEffect } from 'react';
import baseStyled from 'styled-components';
import { StudentAPI } from 'services/apis/student';
import { 
  Send, 
  MessageSquare, 
  Info, 
  ShieldCheck, 
  ChevronRight,
  HelpCircle,
  AlertTriangle,
  Lightbulb,
  Heart,
  History,
  Clock,
  CheckCircle,
  User,
  ShieldAlert
} from 'lucide-react';
import Toast from '../../common/Toast';
import PageSkeleton from '../../loaders/PageSkeleton';
const styled = baseStyled as any;

const FeedbackView = () => {
  const [activeTab, setActiveTab] = useState('submit');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Suggestion');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const categories = [
    { id: 'Suggestion', icon: Lightbulb, color: '#3b82f6', desc: 'Ideas to improve the campus' },
    { id: 'Complaint', icon: AlertTriangle, color: '#ef4444', desc: 'Issues or problems encountered' },
    { id: 'Inquiry', icon: HelpCircle, color: '#f59e0b', desc: 'General questions about services' },
    { id: 'Shoutout', icon: Heart, color: '#10b981', desc: 'Positive feedback for staff/faculty' }
  ];

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await StudentAPI.getMyFeedbacks();
      const feedbackList = Array.isArray(response) ? response : (response?.data || []);
      setMyFeedbacks(feedbackList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      await StudentAPI.submitFeedback({
        message,
        category
      });
      setToast({ show: true, message: 'Feedback submitted anonymously', type: 'success' });
      setSubmitted(true);
      setMessage('');
    } catch (error) {
      setToast({ show: true, message: 'Failed to submit feedback', type: 'error' });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryColor = (catId) => {
    return categories.find(c => c.id === catId)?.color || '#6b7280';
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
      <TabHeader>
        <TabButton 
          $active={activeTab === 'submit'} 
          onClick={() => setActiveTab('submit')}
        >
          <Send size={18} /> Submit Feedback
        </TabButton>
        <TabButton 
          $active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
        >
          <History size={18} /> My Feedbacks
        </TabButton>
      </TabHeader>

      {activeTab === 'submit' ? (
        submitted ? (
          <SuccessContainer>
            <SuccessIconWrapper>
              <ShieldCheck size={64} color="#10b981" />
            </SuccessIconWrapper>
            <SuccessTitle>Thank You!</SuccessTitle>
            <SuccessText>
              Your feedback has been submitted anonymously. The administration will review it soon.
              Thank you for helping us improve our campus.
            </SuccessText>
            <ActionButton onClick={() => setSubmitted(false)}>
              Submit Another Feedback
            </ActionButton>
          </SuccessContainer>
        ) : (
          <Layout>
            <FormSection>
              <Header>
                <Title>Send Anonymous Feedback</Title>
                <Subtitle>Your identity will remain private. Speak your mind freely.</Subtitle>
              </Header>

              <StyledForm onSubmit={handleSubmit}>
                <FormGroup>
                  <Label>Select Category</Label>
                  <CategoryGrid>
                    {categories.map((cat) => (
                      <CategoryCard 
                        key={cat.id}
                        type="button"
                        $active={category === cat.id}
                        $color={cat.color}
                        onClick={() => setCategory(cat.id)}
                      >
                        <cat.icon size={20} />
                        <span>{cat.id}</span>
                      </CategoryCard>
                    ))}
                  </CategoryGrid>
                </FormGroup>

                <FormGroup>
                  <Label>Your Message</Label>
                  <TextArea 
                    placeholder="Describe your suggestion, concern, or feedback in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                  <CharCount $limitReached={message.length > 5000}>
                    {message.length} / 5000 characters
                  </CharCount>
                </FormGroup>

                <NoticeBox>
                  <Info size={18} />
                  <p>This feedback is sent directly to the Dean and Administrators. They can reply to your message, but won't see who sent it.</p>
                </NoticeBox>

                <SubmitButton type="submit" disabled={submitting || !message.trim()}>
                  {submitting ? 'Processing...' : (
                    <>
                      Submit Feedback <Send size={18} />
                    </>
                  )}
                </SubmitButton>
              </StyledForm>
            </FormSection>

            <InfoSidebar>
              <InfoCard>
                <InfoTitle>Why give feedback?</InfoTitle>
                <InfoList>
                  <li><ChevronRight size={14} /> Drive campus improvements</li>
                  <li><ChevronRight size={14} /> Report facilities issues</li>
                  <li><ChevronRight size={14} /> Suggest new features</li>
                  <li><ChevronRight size={14} /> Share your appreciation</li>
                </InfoList>
              </InfoCard>

              <AnonymityCard>
                <ShieldCheck size={32} />
                <AnonymityTitle>100% Anonymous</AnonymityTitle>
                <AnonymityText>
                  Your student ID is stored for system reference but is NEVER shown to Deans or Admins.
                  Only the message and category are visible to them.
                </AnonymityText>
              </AnonymityCard>
            </InfoSidebar>
          </Layout>
        )
      ) : (
        <HistorySection>
          <HistoryTitleGroup>
            <HistoryTitle>Your Feedback History</HistoryTitle>
            <HistorySubtitle>Track your submissions and view administrative responses</HistorySubtitle>
          </HistoryTitleGroup>

          {loadingHistory ? (
            <PageSkeleton variant="list" count={6} />
          ) : myFeedbacks.length === 0 ? (
            <EmptyHistory>
              <MessageSquare size={48} opacity={0.3} />
              <p>You haven't submitted any feedback yet.</p>
              <ActionButton onClick={() => setActiveTab('submit')}>Send your first feedback</ActionButton>
            </EmptyHistory>
          ) : (
            <FeedbackGrid>
              {myFeedbacks.map(f => (
                <HistoryCard key={f.id}>
                  <HistoryCardHeader>
                    <CategoryBadge $color={getCategoryColor(f.category)}>
                      {f.category}
                    </CategoryBadge>
                    <HistoryTime>{f.created_at}</HistoryTime>
                  </HistoryCardHeader>
                  
                  <HistoryMessage>{f.message}</HistoryMessage>
                  
                  <HistoryStatus $replied={f.status === 'replied'}>
                    {f.status === 'unread' ? (
                      <><Clock size={14} /> Waiting for review</>
                    ) : (
                      <><CheckCircle size={14} /> Replied</>
                    )}
                  </HistoryStatus>

                  {f.status === 'replied' && (
                    <ReplyBox>
                      <ReplyLabel>
                        <ShieldCheck size={14} /> 
                        Response from {f.replied_by_name} ({f.replied_by_role})
                      </ReplyLabel>
                      <ReplyText>{f.reply}</ReplyText>
                      <ReplyTime>{f.replied_at}</ReplyTime>
                    </ReplyBox>
                  )}
                </HistoryCard>
              ))}
            </FeedbackGrid>
          )}
        </HistorySection>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease-out;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const TabHeader = styled.div`
  display: flex;
  gap: 1rem;
  background: var(--bg-secondary);
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  width: fit-content;
`;

const TabButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: none;
  background: ${props => props.$active ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.$active ? 'white' : 'var(--text-secondary)'};
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$active ? 'var(--accent-primary)' : 'var(--bg-tertiary)'};
  }
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const FormSection = styled.div`
  background: var(--bg-secondary);
  padding: 2.5rem;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin: 0;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
`;

const CategoryCard = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid ${props => props.$active ? props.$color : 'var(--border-color)'};
  background: ${props => props.$active ? `${props.$color}11` : 'var(--bg-primary)'};
  color: ${props => props.$active ? props.$color : 'var(--text-secondary)'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${props => props.$color};
    background: ${props => `${props.$color}08`};
    transform: translateY(-2px);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  background: var(--bg-primary);
  border: 1.5px solid var(--border-color);
  border-radius: 15px;
  padding: 1.25rem;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  line-height: 1.6;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 4px var(--accent-primary)11;
  }
`;

const CharCount = styled.span`
  align-self: flex-end;
  font-size: 0.8rem;
  color: ${props => props.$limitReached ? '#ef4444' : 'var(--text-tertiary)'};
`;

const NoticeBox = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  align-items: flex-start;

  p {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 1.25rem;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover:not(:disabled) {
    background: var(--accent-highlight);
    transform: translateY(-3px);
    box-shadow: 0 10px 20px -10px var(--accent-primary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const InfoSidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InfoCard = styled.div`
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 16px;
  border: 1px solid var(--border-color);
`;

const InfoTitle = styled.h4`
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 700;
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
`;

const AnonymityCard = styled(InfoCard)`
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-highlight) 100%);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  border: none;
`;

const AnonymityTitle = styled.h4`
  margin: 0.5rem 0 0 0;
  font-weight: 800;
`;

const AnonymityText = styled.p`
  font-size: 0.8rem;
  line-height: 1.4;
  opacity: 0.9;
  margin: 0;
`;

const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: var(--bg-secondary);
  border-radius: 20px;
  border: 1px solid var(--border-color);
  text-align: center;
  max-width: 600px;
  margin: 2rem auto;
  animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
`;

const SuccessIconWrapper = styled.div`
  width: 100px;
  height: 100px;
  background: #10b98111;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
`;

const SuccessTitle = styled.h2`
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 1rem;
`;

const SuccessText = styled.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
`;

const ActionButton = styled(SubmitButton)`
  padding: 1rem 2rem;
`;

const HistorySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: slideUp 0.3s ease-out;
`;

const HistoryTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const HistoryTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0;
`;

const HistorySubtitle = styled.p`
  color: var(--text-secondary);
  margin: 0;
`;

const FeedbackGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HistoryCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 2rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: transform 0.2s;

  &:hover {
    transform: translateX(5px);
    border-color: var(--accent-primary)44;
  }
`;

const HistoryCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CategoryBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  background: ${props => props.$color}22;
  color: ${props => props.$color};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const HistoryTime = styled.span`
  font-size: 0.8rem;
  color: var(--text-tertiary);
`;

const HistoryMessage = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-primary);
  margin: 0;
`;

const HistoryStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${props => props.$replied ? '#10b981' : '#f59e0b'};
  text-transform: uppercase;
`;

const ReplyBox = styled.div`
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border-radius: 12px;
  border-left: 4px solid #10b981;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const ReplyLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #10b981;
  text-transform: uppercase;
`;

const ReplyText = styled.p`
  font-size: 1rem;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 0;
`;

const ReplyTime = styled.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
`;

const EmptyHistory = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem;
  text-align: center;
  background: var(--bg-secondary);
  border-radius: 20px;
  border: 1px dashed var(--border-color);
  gap: 1.5rem;
  color: var(--text-tertiary);
`;

export default FeedbackView;
