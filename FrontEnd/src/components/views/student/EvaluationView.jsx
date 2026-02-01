import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { StudentAPI } from '../../../services/api';
import { useSearchParams } from 'react-router-dom';
import { 
    ClipboardCheck, AlertTriangle, AlertCircle, Info, 
    User, CheckCircle, Clock, Star, ThumbsUp, ArrowLeft, Send
} from 'lucide-react';

const EvaluationView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [evaluationsEnabled, setEvaluationsEnabled] = useState(true);
    const [studentSection, setStudentSection] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    
    const teacherId = searchParams.get('teacher_id');
    const teacherName = searchParams.get('teacher_name');
    const subject = searchParams.get('subject');

    useEffect(() => {
        const init = async () => {
            try {
                
                const settings = await StudentAPI.getEvaluationSettings().catch(() => ({ enabled: true }));
                if (settings.enabled === false) {
                    setEvaluationsEnabled(false);
                    setLoading(false);
                    return;
                }

                
                const assignmentData = await StudentAPI.getAssignment().catch(() => null);
                let section = null;
                
                
                if (Array.isArray(assignmentData) && assignmentData.length > 0) {
                    
                    if (assignmentData[0].section) section = assignmentData[0].section;
                    
                    else if (assignmentData[0].section_name) section = assignmentData[0].section_name;
                } else if (assignmentData) {
                    if (assignmentData.section) section = assignmentData.section;
                    else if (assignmentData.section_name) section = assignmentData.section_name;
                }

                if (!section) {
                    setStudentSection(null);
                    setLoading(false);
                    return;
                }
                setStudentSection(section);

                if (!teacherId) {
                    
                    const teachersData = await StudentAPI.getEvaluationTeachers().catch(() => ({ teachers: [] }));
                    setTeachers(Array.isArray(teachersData.teachers) ? teachersData.teachers : []);
                }

            } catch (err) {
                console.error("Evaluation init error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [teacherId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const result = await StudentAPI.submitEvaluation(data);
            if (result.success) {
                
                setSearchParams({ view: 'evaluation' });
            } else {
                alert("Error: " + (result.message || "Failed to submit evaluation"));
            }
        } catch (err) {
            console.error("Submit error:", err);
            alert("An error occurred while submitting. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
        </div>
    );

    if (!evaluationsEnabled) {
        return (
            <Container>
                <Header>
                    <h2><ClipboardCheck size={28} /> Teacher Evaluation</h2>
                    <p>Select a teacher to evaluate</p>
                </Header>
                <AlertCard $type="warning">
                    <AlertTriangle size={24} />
                    <div>
                        <h4>Evaluations Disabled</h4>
                        <p>Teacher evaluations are currently disabled by the administrator.</p>
                    </div>
                </AlertCard>
            </Container>
        );
    }

    if (!studentSection) {
        return (
            <Container>
                <Header>
                    <h2><ClipboardCheck size={28} /> Teacher Evaluation</h2>
                    <p>Select a teacher to evaluate</p>
                </Header>
                <AlertCard $type="info">
                    <Info size={24} />
                    <div>
                        <h4>No Section Information</h4>
                        <p>Your section information is not available. Please contact the administrator.</p>
                    </div>
                </AlertCard>
            </Container>
        );
    }

    if (teacherId && teacherName) {
        
        return (
            <Container>
                <Header>
                    <BackButton onClick={() => setSearchParams({ view: 'evaluation' })}>
                        <ArrowLeft size={20} /> Back
                    </BackButton>
                    <h2>Evaluation Form</h2>
                    <p>Evaluate <strong>{teacherName}</strong> - {subject}</p>
                </Header>

                <Form onSubmit={handleSubmit}>
                    <input type="hidden" name="teacher_id" value={teacherId} />
                    <input type="hidden" name="teacher_name" value={teacherName} />
                    <input type="hidden" name="subject" value={subject || ""} />
                    <input type="hidden" name="student_section" value={studentSection} />

                    <InstructionCard>
                        <CardHeader>
                            <Info size={20} />
                            <h3>Evaluation Information</h3>
                        </CardHeader>
                        <CardBody>
                            <p className="highlight"><strong>This Evaluation Form will be part of your REQUIREMENTS for CLEARANCE.</strong></p>
                            <p><strong>Directions:</strong> Please indicate the extent to which each statement characterizes the competence of your teacher by choosing the specific numerical rating:</p>
                            <RatingScale>
                                <ScaleItem><strong>O (4)</strong> Outstanding</ScaleItem>
                                <ScaleItem><strong>VS (3)</strong> Very Satisfactory</ScaleItem>
                                <ScaleItem><strong>S (2)</strong> Satisfactory</ScaleItem>
                                <ScaleItem><strong>NI (1)</strong> Needs Improvement</ScaleItem>
                            </RatingScale>
                        </CardBody>
                    </InstructionCard>

                    <Card>
                        <CardHeader>
                            <User size={20} />
                            <h3>PART I: My Teacher</h3>
                        </CardHeader>
                        <CardBody>
                            {[
                                "Knows his/her subject matter well and organizes presentation of subject matter with clarity and coherence",
                                "Is proficient in English/Filipino/Japanese",
                                "Employs appropriate teaching methods/strategies whether in-person or online",
                                "Makes good use of visual aids/instructional materials",
                                "Manages the class well and commands respect",
                                "Utilizes class period productively",
                                "Engages us with questions to deepen our understanding",
                                "Gives subject requirements that are relevant",
                                "Gives learning tasks that are well-paced",
                                "Behaves professionally"
                            ].map((q, i) => (
                                <QuestionRow key={i}>
                                    <QuestionText>
                                        <span className="num">{i + 1}.</span>
                                        {q}
                                    </QuestionText>
                                    <RatingOptions>
                                        {[4, 3, 2, 1].map(val => (
                                            <RadioLabel key={val}>
                                                <input type="radio" name={`part1_q${i+1}`} value={val} required />
                                                <span>{['NI', 'S', 'VS', 'O'][val-1]} ({val})</span>
                                            </RadioLabel>
                                        ))}
                                    </RatingOptions>
                                </QuestionRow>
                            ))}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <Star size={20} />
                            <h3>PART II: As a Student</h3>
                        </CardHeader>
                        <CardBody>
                            {[
                                "With my teacher's guidance, I can demonstrate the intended knowledge and skills.",
                                "With my teacher's guidance, I can connect theory and practical knowledge.",
                                "I have improved my problem-solving skills.",
                                "I am happy that he/she is my teacher.",
                                "I can feel the teacher's concern.",
                                "I look up to my teacher as a role model.",
                                "I like to be in his/her class again.",
                                "I notice that my teacher extends help to struggling students."
                            ].map((q, i) => (
                                <QuestionRow key={i}>
                                    <QuestionText>
                                        <span className="num">{i + 1}.</span>
                                        {q}
                                    </QuestionText>
                                    <RatingOptions>
                                        {[4, 3, 2, 1].map(val => (
                                            <RadioLabel key={val}>
                                                <input type="radio" name={`part2_q${i+1}`} value={val} required />
                                                <span>{['NI', 'S', 'VS', 'O'][val-1]} ({val})</span>
                                            </RadioLabel>
                                        ))}
                                    </RatingOptions>
                                </QuestionRow>
                            ))}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader>
                            <ThumbsUp size={20} />
                            <h3>Additional Questions</h3>
                        </CardHeader>
                        <CardBody>
                            <QuestionBlock>
                                <Label>In a scale of 1 (not satisfied) to 10 (very satisfied), how satisfied are you with your learning experiences?</Label>
                                <RangeContainer>
                                    <RangeLabels>
                                        <span>Not Satisfied</span>
                                        <span>Very Satisfied</span>
                                    </RangeLabels>
                                    <RangeOptions>
                                        {Array.from({length: 10}, (_, i) => i + 1).map(val => (
                                            <RangeLabel key={val}>
                                                <input type="radio" name="satisfaction_rating" value={val} required />
                                                <div className="box">{val}</div>
                                            </RangeLabel>
                                        ))}
                                    </RangeOptions>
                                </RangeContainer>
                            </QuestionBlock>

                            <QuestionBlock>
                                <Label>Will you recommend the subject/s under the present teacher?</Label>
                                <RadioGroup>
                                    <RadioLabel>
                                        <input type="radio" name="recommend_teacher" value="YES" required />
                                        <span>YES</span>
                                    </RadioLabel>
                                    <RadioLabel>
                                        <input type="radio" name="recommend_teacher" value="NO" required />
                                        <span>NO</span>
                                    </RadioLabel>
                                </RadioGroup>
                            </QuestionBlock>

                            <QuestionBlock>
                                <Label htmlFor="comments">COMMENTS</Label>
                                <Textarea id="comments" name="comments" rows="5" placeholder="Enter your comments here..." />
                            </QuestionBlock>
                        </CardBody>
                    </Card>

                    <Actions>
                        <Button type="button" $secondary onClick={() => setSearchParams({ view: 'evaluation' })}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit Evaluation'} <Send size={18} />
                        </Button>
                    </Actions>
                </Form>
            </Container>
        );
    }

    
    return (
        <Container>
            <Header>
                <h2><ClipboardCheck size={28} /> Teacher Evaluation</h2>
                <p>Select a teacher to evaluate</p>
            </Header>

            <Card>
                <CardHeader>
                    <User size={20} />
                    <h3>Teachers in Section: {studentSection}</h3>
                </CardHeader>
                <CardBody>
                    {teachers.length === 0 ? (
                        <EmptyState>No teachers found for your section.</EmptyState>
                    ) : (
                        <Grid>
                            {teachers.map(teacher => (
                                <TeacherCard key={teacher.id}>
                                    <TeacherInfo>
                                        <h4>{teacher.name}</h4>
                                        <SubjectsList>
                                            <strong>Subjects:</strong>
                                            <ul>{(teacher.subjects || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
                                        </SubjectsList>
                                    </TeacherInfo>
                                    <TeacherStatus>
                                        {teacher.evaluated ? (
                                            <StatusBadge $success>
                                                <CheckCircle size={16} /> Evaluated
                                            </StatusBadge>
                                        ) : (
                                            <StatusBadge $pending>
                                                <Clock size={16} /> Pending
                                            </StatusBadge>
                                        )}
                                    </TeacherStatus>
                                    {!teacher.evaluated ? (
                                        <Button 
                                            onClick={() => setSearchParams({ 
                                                view: 'evaluation', 
                                                teacher_id: teacher.id, 
                                                teacher_name: teacher.name,
                                                subject: (teacher.subjects || []).join(", ")
                                            })}
                                        >
                                            Evaluate Teacher
                                        </Button>
                                    ) : (
                                        <Button disabled $secondary>Evaluated</Button>
                                    )}
                                </TeacherCard>
                            ))}
                        </Grid>
                    )}
                </CardBody>
            </Card>
        </Container>
    );
};


const Container = styled.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex; flex-direction: column; gap: 0.5rem;
  h2 { font-size: 1.75rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 12px; margin: 0; }
  p { color: var(--text-secondary); font-size: 1.1rem; margin: 0; }
`;

const BackButton = styled.button`
  background: transparent; border: none; color: var(--accent-primary);
  display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer;
  margin-bottom: 0.5rem; padding: 0;
  &:hover { text-decoration: underline; }
`;

const AlertCard = styled.div`
  background: ${props => props.$type === 'warning' ? 'rgba(234,179,8,0.1)' : 'rgba(59,130,246,0.1)'};
  border: 1px solid ${props => props.$type === 'warning' ? 'rgba(234,179,8,0.3)' : 'rgba(59,130,246,0.3)'};
  padding: 1.5rem; border-radius: 12px; display: flex; gap: 1rem; align-items: flex-start;
  color: ${props => props.$type === 'warning' ? '#ca8a04' : '#2563eb'};
  h4 { margin: 0 0 4px 0; font-weight: 700; color: inherit; }
  p { margin: 0; opacity: 0.9; color: inherit; }
`;

const Form = styled.form`
  display: flex; flex-direction: column; gap: 2rem;
`;

const Card = styled.div`
  background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;
`;

const InstructionCard = styled(Card)`
  border-left: 4px solid var(--accent-primary);
  .highlight { color: var(--text-primary); margin-bottom: 1rem; }
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 12px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
  svg { color: var(--accent-primary); }
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const RatingScale = styled.div`
  display: flex; flex-wrap: wrap; gap: 1rem; background: var(--bg-primary); padding: 1rem; border-radius: 8px; margin-top: 1rem;
`;

const ScaleItem = styled.div`
  font-size: 0.9rem; color: var(--text-secondary);
  strong { color: var(--text-primary); margin-right: 4px; }
`;

const QuestionRow = styled.div`
  padding: 1.5rem 0; border-bottom: 1px solid var(--border-color);
  &:last-child { border-bottom: none; }
`;

const QuestionText = styled.p`
  margin: 0 0 1rem 0; font-weight: 500; color: var(--text-primary);
  .num { font-weight: 700; opacity: 0.7; margin-right: 8px; }
`;

const RatingOptions = styled.div`
  display: flex; flex-wrap: wrap; gap: 1.5rem;
`;

const RadioLabel = styled.label`
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  input { accent-color: var(--accent-primary); width: 18px; height: 18px; }
  span { font-size: 0.95rem; color: var(--text-secondary); }
  &:hover span { color: var(--text-primary); }
`;

const QuestionBlock = styled.div`
  margin-bottom: 2rem;
  &:last-child { margin-bottom: 0; }
`;

const Label = styled.label`
  display: block; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary);
`;

const RangeContainer = styled.div`
  background: var(--bg-primary); padding: 1.5rem; border-radius: 12px;
`;

const RangeLabels = styled.div`
  display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.8rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase;
`;

const RangeOptions = styled.div`
  display: flex; justify-content: space-between; gap: 4px; overflow-x: auto;
`;

const RangeLabel = styled.label`
  cursor: pointer; position: relative;
  input { position: absolute; opacity: 0; }
  .box { 
    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; 
    border-radius: 8px; background: var(--bg-tertiary); border: 1px solid var(--border-color); font-weight: 600;
    transition: all 0.2s;
  }
  input:checked + .box { background: var(--accent-primary); color: white; border-color: var(--accent-primary); transform: scale(1.1); }
`;

const RadioGroup = styled.div`
  display: flex; gap: 2rem;
`;

const Textarea = styled.textarea`
  width: 100%; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-primary); color: var(--text-primary); font-family: inherit; resize: vertical;
  &:focus { outline: none; border-color: var(--accent-primary); ring: 2px solid var(--accent-primary); }
`;

const Actions = styled.div`
  display: flex; gap: 1rem; justify-content: flex-end;
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

const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
`;

const TeacherCard = styled.div`
  background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem;
  display: flex; flex-direction: column; gap: 1rem; transition: all 0.2s;
  &:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
`;

const TeacherInfo = styled.div`
  h4 { margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--text-primary); }
`;

const SubjectsList = styled.div`
  font-size: 0.9rem; color: var(--text-secondary);
  strong { display: block; margin-bottom: 4px; color: var(--text-primary); }
  ul { margin: 0; padding-left: 1.2rem; }
`;

const TeacherStatus = styled.div`
  display: flex;
`;

const StatusBadge = styled.span`
  display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600;
  color: ${props => props.$success ? '#16a34a' : '#ea580c'};
`;

const EmptyState = styled.p`
  text-align: center; color: var(--text-secondary); padding: 2rem;
`;

export default EvaluationView;
