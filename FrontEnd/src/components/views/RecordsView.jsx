import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { StudentAPI, AdminAPI } from '../../services/api';
import { 
    Building2, Layers, Calendar, Users, Wallet, 
    CheckCircle, AlertTriangle, AlertCircle, Clock, MessageSquare
} from 'lucide-react';
import PageSkeleton from '../loaders/PageSkeleton';

const RecordsView = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    building: "Unassigned",
    floor: "",
    room: "",
    year: "N/A",
    section: "N/A",
    paymentStatus: "paid",
    owingAmount: null,
    sanctions: null,
    sanctionText: "No",
    sanctionDays: null,
    sanctionNote: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
        try {
            const assignment = await StudentAPI.getAssignment();
            
            
            let buildingText = "Unassigned";
            let floorText = "";
            let roomText = "";
            let yearText = "N/A";
            let sectionText = "N/A";
            let paymentStatus = "paid";
            let owingAmount = null;
            let sanctions = null;
            let sanctionText = "No";
            let sanctionDays = null;
            let sanctionNote = "";
            let gender = "-";
            let studentStatus = "Regular";

            const assignmentData = Array.isArray(assignment) && assignment.length > 0 ? assignment[0] : assignment;
            
            if (assignmentData) {
                if (assignmentData.grade_level) {
                    const match = String(assignmentData.grade_level).match(/^(\d)/);
                    yearText = match ? match[1] : assignmentData.grade_level;
                }
                
                sectionText = assignmentData.section_name || assignmentData.section || "N/A";
                paymentStatus = assignmentData.payment || "paid";
                owingAmount = assignmentData.amount_lacking || null;
                sanctions = assignmentData.sanctions || null;
                
                // Gender and Status from API
                gender = assignmentData.gender || "-";
                studentStatus = assignmentData.student_status || "Regular";
                
                if (assignmentData.sanction_reason) {
                    sanctionNote = assignmentData.sanction_reason;
                }

                
                if (assignmentData.building) {
                    buildingText = "Building " + assignmentData.building;
                }
                if (assignmentData.floor && parseInt(assignmentData.floor) > 0) {
                    floorText = formatOrdinal(assignmentData.floor) + " Floor";
                }
                if (assignmentData.room) {
                    roomText = "Room " + assignmentData.room;
                }
            }

            if (sanctions || assignmentData?.sanction_reason) {
                const sanctionReasonText = assignmentData?.sanction_reason || '';
                const dateMatch = sanctionReasonText.match(/(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    const sanctionDate = new Date(dateMatch[1]);
                    const now = new Date();
                    if (sanctionDate > now) {
                        const diff = Math.floor((sanctionDate - now) / (1000 * 60 * 60 * 24));
                        sanctionDays = diff;
                        sanctionText = diff + " days";
                    } else {
                        sanctionText = "Expired";
                    }
                } else {
                    const daysMatch = sanctionReasonText.match(/(\d+)\s*days?/i);
                    if (daysMatch) {
                        sanctionDays = parseInt(daysMatch[1]);
                        sanctionText = sanctionDays + " days";
                    } else if (sanctionReasonText.trim()) {
                        sanctionText = "Yes";
                        sanctionNote = sanctionReasonText.trim();
                    } else {
                        sanctionText = "Yes";
                    }
                }
            }

            setData({
                building: buildingText,
                floor: floorText,
                room: roomText,
                year: yearText,
                section: sectionText,
                paymentStatus,
                owingAmount,
                sanctions,
                sanctionText,
                sanctionDays,
                sanctionNote,
                gender,
                studentStatus
            });
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load records");
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, []);

  const formatOrdinal = (number) => {
    number = parseInt(number);
    if (number <= 0) return "";
    const suffixes = ["th", "st", "nd", "rd", "th", "th", "th", "th", "th", "th"];
    const value = number % 100;
    if (value >= 11 && value <= 13) {
      return number + "th";
    }
    return number + (suffixes[number % 10] || "th");
  };

  if (loading) return <PageSkeleton variant="cards" />;
  
  if (error) return <Container><div className="alert alert-danger">Error loading records: {error}</div></Container>;

  return (
    <Container>
        <Header>
            <div>
              <h2>My Records</h2>
              <p>View your academic and financial information</p>
            </div>
            <FeedbackButton onClick={() => navigate('/home/feedback')}>
              <MessageSquare size={16} />
              Send Feedback
            </FeedbackButton>
        </Header>
        
        <Grid>
            <Card>
                <CardHeader>
                    <Building2 size={20} />
                    <h3>Assignment Details</h3>
                </CardHeader>
                <CardBody>
                    <InfoRow>
                        <IconBox><Building2 size={20} /></IconBox>
                        <InfoMeta>
                            <InfoLabel>Building</InfoLabel>
                            <InfoValue>{data.building}</InfoValue>
                        </InfoMeta>
                    </InfoRow>
                    
                    <InfoRow>
                        <IconBox><Layers size={20} /></IconBox>
                        <InfoMeta>
                            <InfoLabel>Floor / Room</InfoLabel>
                            <InfoValue>
                                {data.floor && data.room ? `${data.floor} / ${data.room}` : (data.floor || data.room || "N/A")}
                            </InfoValue>
                        </InfoMeta>
                    </InfoRow>
                    
                    <InfoRow>
                        <IconBox><Calendar size={20} /></IconBox>
                        <InfoMeta>
                            <InfoLabel>Year</InfoLabel>
                            <InfoValue>{data.year}</InfoValue>
                        </InfoMeta>
                    </InfoRow>
                    
                    <InfoRow>
                        <IconBox><Users size={20} /></IconBox>
                        <InfoMeta>
                            <InfoLabel>Section</InfoLabel>
                            <InfoValue>{data.section}</InfoValue>
                        </InfoMeta>
                    </InfoRow>

                    <InfoRow>
                        <IconBox><Users size={20} /></IconBox>
                        <InfoMeta>
                            <InfoLabel>Gender</InfoLabel>
                            <InfoValue>{data.gender}</InfoValue>
                        </InfoMeta>
                    </InfoRow>

                    <InfoRow>
                        <IconBox><CheckCircle size={20} /></IconBox>
                        <InfoMeta>
                            <InfoLabel>Student Status</InfoLabel>
                            <InfoValue>{data.studentStatus}</InfoValue>
                        </InfoMeta>
                    </InfoRow>
                </CardBody>
            </Card>
            
            <Card>
                <CardHeader>
                    <Wallet size={20} />
                    <h3>Financial Status</h3>
                </CardHeader>
                <CardBody>
                    <FinancialItem $status={data.paymentStatus === "owing" ? "warning" : "success"}>
                        <IconBox>
                            {data.paymentStatus === "owing" ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                        </IconBox>
                        <InfoMeta>
                            <InfoLabel>Outstanding Balance</InfoLabel>
                            <InfoValue>
                                {data.paymentStatus === "owing" && data.owingAmount
                                    ? "₱" + parseFloat(data.owingAmount).toFixed(2)
                                    : (data.paymentStatus === "owing" ? "Amount pending" : "₱0.00")
                                }
                            </InfoValue>
                        </InfoMeta>
                    </FinancialItem>

                    {(data.sanctions || (data.sanctionDays !== null && data.sanctionDays > 0) || data.sanctionText.includes("days") || data.sanctionText === "Yes" || data.sanctionText === "Expired") && (
                        <FinancialItem $status="danger" style={{ marginTop: '1rem' }}>
                            <IconBox style={{ color: '#ef4444' }}>
                                <AlertCircle size={20} />
                            </IconBox>
                            <InfoMeta>
                                <InfoLabel>Sanctioned</InfoLabel>
                                <InfoValue>
                                    {data.sanctionDays !== null && data.sanctionDays > 0 ? (
                                        <><span className="text-danger fw-bold">{data.sanctionDays}</span> days remaining</>
                                    ) : data.sanctionText.includes("days") ? (
                                        <span className="text-danger fw-bold">{data.sanctionText}</span>
                                    ) : data.sanctionText === "Expired" ? (
                                        <span className="text-muted">Sanction expired</span>
                                    ) : data.sanctionText === "Yes" ? (
                                        <span className="text-danger">Active Sanction</span>
                                    ) : (
                                        <span>{data.sanctionText}</span>
                                    )}
                                </InfoValue>
                                {data.sanctionNote && (
                                    <div className="mt-2 pt-2 border-top border-secondary-subtle">
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reason:</div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{data.sanctionNote}</div>
                                    </div>
                                )}
                            </InfoMeta>
                        </FinancialItem>
                    )}
                </CardBody>
            </Card>
        </Grid>
    </Container>
  );
};


const Container = styled.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  h2 { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; }
  p { color: var(--text-secondary); font-size: 1.1rem; }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const FeedbackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    transform: translateY(-1px);
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.5rem;
`;

const Card = styled.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 12px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
  svg { color: var(--accent-primary); }
`;

const CardBody = styled.div`
  padding: 1.5rem;
  flex: 1;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
  &:last-child { border-bottom: none; padding-bottom: 0; }
  &:first-child { padding-top: 0; }
`;

const IconBox = styled.div`
  width: 44px; height: 44px;
  border-radius: 12px;
  background: var(--bg-tertiary);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
`;

const InfoMeta = styled.div`
  display: flex; flex-direction: column;
  gap: 2px;
`;

const InfoLabel = styled.span`
  font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;
`;

const InfoValue = styled.span`
  font-weight: 600; color: var(--text-primary); font-size: 1rem;
`;

const FinancialItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  border-radius: 12px;
  background: ${props => props.$status === 'warning' ? 'rgba(234, 179, 8, 0.1)' : props.$status === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'};
  border: 1px solid ${props => props.$status === 'warning' ? 'rgba(234, 179, 8, 0.3)' : props.$status === 'danger' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'};
  
  ${IconBox} {
    background: white;
    color: ${props => props.$status === 'warning' ? '#ca8a04' : props.$status === 'danger' ? '#ef4444' : '#16a34a'};
  }
`;

export default RecordsView;
