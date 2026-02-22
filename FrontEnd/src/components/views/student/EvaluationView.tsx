import React, { useState, useEffect, useMemo } from 'react';
import baseStyled from 'styled-components';
import { StudentAPI } from '../../../services/api';
import { useSearchParams } from 'react-router-dom';
import { 
    ClipboardCheck, AlertTriangle, AlertCircle, Info, 
    User, CheckCircle, Clock, Star, ThumbsUp, ArrowLeft, Send
} from 'lucide-react';
import PageSkeleton from '../../loaders/PageSkeleton';
const styled = baseStyled as any;

const EvaluationView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [evaluationsEnabled, setEvaluationsEnabled] = useState(true);
    const [studentSection, setStudentSection] = useState(null);
    const [teachers, setTeachers] = useState([]);
    const [template, setTemplate] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [existingData, setExistingData] = useState(null);
    const [isReadOnly, setIsReadOnly] = useState(false);

    
    const teacherId = searchParams.get('teacher_id');
    const teacherName = searchParams.get('teacher_name');
    const subject = searchParams.get('subject');

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                
                const settings = await StudentAPI.getEvaluationSettings().catch(() => ({ enabled: true }));
                if (settings.enabled === false) {
                    setEvaluationsEnabled(false);
                    setLoading(false);
                    return;
                }
                setTemplate(settings.template);

                
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

                if (teacherId) {
                    const evalResult = await StudentAPI.getEvaluation(teacherId).catch(() => null);
                    if (evalResult && evalResult.success) {
                        setExistingData(evalResult.data);
                        setIsReadOnly(true);
                    } else {
                        setExistingData(null);
                        setIsReadOnly(false);
                    }
                } else {
                    setExistingData(null);
                    setIsReadOnly(false);
                    // RESTORED: Fetch teachers list when on the selection view
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

    const defaultScale = useMemo(() => ([
        {label: "O (4) Outstanding", value: 4},
        {label: "VS (3) Very Satisfactory", value: 3},
        {label: "S (2) Satisfactory", value: 2},
        {label: "NI (1) Needs Improvement", value: 1}
    ]), []);

    const defaultSections = useMemo(() => ([
        { id: "part1", title: "PART I: My Teacher", questions: [
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
        ]},
        { id: "part2", title: "PART II: As a Student", questions: [
            "With my teacher's guidance, I can demonstrate the intended knowledge and skills.",
            "With my teacher's guidance, I can connect theory and practical knowledge.",
            "I have improved my problem-solving skills.",
            "I am happy that he/she is my teacher.",
            "I can feel the teacher's concern.",
            "I look up to my teacher as a role model.",
            "I like to be in his/her class again.",
            "I notice that my teacher extends help to struggling students."
        ]}
    ]), []);

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

    if (loading) return <PageSkeleton variant="form" />;

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
                    <h2>{isReadOnly ? "View Evaluation" : (template?.title || "Evaluation Form")}</h2>
                    <p>{isReadOnly ? `Reviewing evaluation for ${teacherName}` : (template?.subtitle || `Evaluate ${teacherName} - ${subject}`)}</p>
                </Header>

                {isReadOnly && (
                    <ReadOnlyBanner>
                        <CheckCircle size={20} />
                        <div>
                            <strong>Evaluation Submitted</strong>
                            <p>You have already evaluated this teacher. Below is your submitted response.</p>
                        </div>
                    </ReadOnlyBanner>
                )}

                <Form onSubmit={handleSubmit}>
                    <input type="hidden" name="teacher_id" value={teacherId} />
                    <input type="hidden" name="teacher_name" value={teacherName} />
                    <input type="hidden" name="subject" value={subject || ""} />
                    <input type="hidden" name="student_section" value={studentSection} />

                    <Card>
                        <CardHeader>
                            <User size={20} />
                            <h3>Student Information</h3>
                        </CardHeader>
                        <CardBody>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <Label>STATUS *</Label>
                                    <Select 
                                        name="student_status" 
                                        required 
                                        disabled={isReadOnly}
                                        defaultValue={existingData?.student_status || ""}
                                    >
                                        <option value="">Select Status</option>
                                        <option value="REGULAR">REGULAR</option>
                                        <option value="IRREGULAR">IRREGULAR</option>
                                    </Select>
                                </div>
                                <div className="col-md-6">
                                    <Label>GENDER *</Label>
                                    <Select 
                                        name="student_gender" 
                                        required 
                                        disabled={isReadOnly}
                                        defaultValue={existingData?.student_gender || ""}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                        <option value="LGBTQIA++">LGBTQIA++</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </Select>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    <InstructionCard>
                        <CardHeader>
                            <Info size={20} />
                            <h3>Evaluation Information</h3>
                        </CardHeader>
                        <CardBody>
                            {template?.description ? (
                                template.description.split('\n').map((line, i) => (
                                    <p key={i} className={i === 0 ? "highlight" : ""}>{line}</p>
                                ))
                            ) : (
                                <>
                                    <p className="highlight"><strong>This Evaluation Form will be part of your REQUIREMENTS for CLEARANCE.</strong></p>
                                    <p><strong>Directions:</strong> Please indicate the extent to which each statement characterizes the competence of your teacher by choosing the specific numerical rating:</p>
                                </>
                            )}
                            <RatingScale>
                                {(template?.scale || defaultScale).map((s, i) => (
                                    <ScaleItem key={i}>{s.label}</ScaleItem>
                                ))}
                            </RatingScale>
                        </CardBody>
                    </InstructionCard>

                    {(template?.sections || defaultSections).map((section) => (
                        <Card key={section.id}>
                            <CardHeader>
                                {section.id === 'part1' ? <User size={20} /> : <Star size={20} />}
                                <h3>{section.title}</h3>
                            </CardHeader>
                            <CardBody>
                                {section.questions.map((q, i) => (
                                    <QuestionRow key={i}>
                                        <QuestionText>
                                            <span className="num">{i + 1}.</span>
                                            {q}
                                        </QuestionText>
                                        <RatingOptions>
                                            {(template?.scale || defaultScale).map(s => {
                                                const val = typeof s === 'object' ? s.value : s;
                                                const label = typeof s === 'object' ? s.label.split('(')[0].trim() : s;
                                                const fieldName = `${section.id}_q${i+1}`;
                                                return (
                                                    <RadioLabel key={val}>
                                                        <input 
                                                            type="radio" 
                                                            name={fieldName} 
                                                            value={val} 
                                                            required 
                                                            disabled={isReadOnly}
                                                            defaultChecked={Number(existingData?.ratings?.[fieldName]) === val}
                                                        />
                                                        <span>{label} ({val})</span>
                                                    </RadioLabel>
                                                );
                                            })}
                                        </RatingOptions>
                                    </QuestionRow>
                                ))}
                            </CardBody>
                        </Card>
                    ))}

                    <Card>
                        <CardHeader>
                            <ThumbsUp size={20} />
                            <h3>Overall Satisfaction</h3>
                        </CardHeader>
                        <CardBody>
                            <QuestionBlock>
                                <Label>{template?.satisfaction_question || "In a scale of 1 (not satisfied) to 10 (very satisfied), how satisfied are you with your learning experiences?"}</Label>
                                <RangeContainer>
                                    <RangeLabels>
                                        <span>NOT SATISFIED (1)</span>
                                        <span>VERY SATISFIED (10)</span>
                                    </RangeLabels>
                                    <RangeOptions>
                                        {Array.from({length: 10}, (_, i) => i + 1).map(val => (
                                            <RangeLabel key={val}>
                                                <input 
                                                    type="radio" 
                                                    name="satisfaction_rating" 
                                                    value={val} 
                                                    required 
                                                    disabled={isReadOnly}
                                                    defaultChecked={Number(existingData?.ratings?.satisfaction_rating) === val}
                                                />
                                                <div className="box">{val}</div>
                                            </RangeLabel>
                                        ))}
                                    </RangeOptions>
                                </RangeContainer>
                            </QuestionBlock>

                            <QuestionBlock>
                                <Label>{template?.recommend_question || "Will you recommend the subject/s under the present teacher?"}</Label>
                                <RadioGroup>
                                    <RadioLabel>
                                        <input 
                                            type="radio" 
                                            name="recommend_teacher" 
                                            value="YES" 
                                            required 
                                            disabled={isReadOnly}
                                            defaultChecked={existingData?.ratings?.recommend_teacher === "YES"}
                                        />
                                        <span>YES</span>
                                    </RadioLabel>
                                    <RadioLabel>
                                        <input 
                                            type="radio" 
                                            name="recommend_teacher" 
                                            value="NO" 
                                            required 
                                            disabled={isReadOnly}
                                            defaultChecked={existingData?.ratings?.recommend_teacher === "NO"}
                                        />
                                        <span>NO</span>
                                    </RadioLabel>
                                </RadioGroup>
                            </QuestionBlock>

                            <QuestionBlock>
                                <Label htmlFor="comments">{template?.comments_label || "COMMENTS"}</Label>
                                <Textarea 
                                    id="comments" 
                                    name="comments" 
                                    rows="5" 
                                    placeholder="Enter your comments here..." 
                                    disabled={isReadOnly}
                                    defaultValue={existingData?.comments || ""}
                                />
                            </QuestionBlock>
                        </CardBody>
                    </Card>

                    <Actions>
                        <Button type="button" $secondary onClick={() => setSearchParams({ view: 'evaluation' })}>
                            {isReadOnly ? 'Back to List' : 'Cancel'}
                        </Button>
                        {!isReadOnly && (
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Evaluation'} <Send size={18} />
                            </Button>
                        )}
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
                            {teachers.map(teacher => {
                                const avatarUrl = teacher.image_path 
                                    ? (teacher.image_path.startsWith('http') ? teacher.image_path : `/TCC/public/${teacher.image_path.replace(/^\//, '')}`)
                                    : "/images/sample.jpg";

                                return (
                                <TeacherCard key={teacher.id}>
                                    <AvatarContainer>
                                        <AvatarImg loading="lazy" 
                                            src={avatarUrl} 
                                            onError={(e) => { e.target.src = "/images/sample.jpg" }}
                                            alt={teacher.name}
                                        />
                                    </AvatarContainer>
                                    <TeacherInfo>
                                        <h4>{teacher.name}</h4>
                                        <SubjectsList>
                                            <strong>Subjects:</strong>
                                            <ul>
                                                {(teacher.subjects || []).map((s, i) => (
                                                    <li key={i} title={typeof s === 'object' ? `${s.code} - ${s.title}` : s}>
                                                        {typeof s === 'object' ? `${s.code} - ${s.title}` : s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </SubjectsList>
                                    </TeacherInfo>
                                    <Divider />
                                    <TeacherStatus>
                                        {teacher.evaluated ? (
                                            <StatusBadge $success>
                                                <CheckCircle size={18} /> Done
                                            </StatusBadge>
                                        ) : (
                                            <StatusBadge $pending>
                                                <Clock size={16} /> Pending
                                            </StatusBadge>
                                        )}
                                    </TeacherStatus>
                                    <Button 
                                        onClick={() => setSearchParams({ 
                                            view: 'evaluation', 
                                            teacher_id: teacher.id, 
                                            teacher_name: teacher.name,
                                            subject: (teacher.subjects || [])
                                                .map((s) => {
                                                    if (typeof s !== 'object') return String(s || '');
                                                    const code = String(s.code || '').trim();
                                                    const title = String(s.title || '').trim();
                                                    return code && title ? `${code} - ${title}` : (code || title);
                                                })
                                                .filter(Boolean)
                                                .join(", ")
                                        })}
                                        $secondary={teacher.evaluated}
                                        style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
                                    >
                                        {teacher.evaluated ? 'View Evaluation' : 'Evaluate Teacher'}
                                    </Button>
                                </TeacherCard>
                            )})}
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

const ReadOnlyBanner = styled.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #059669;
  padding: 1.25rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  
  strong { display: block; margin-bottom: 2px; }
  p { margin: 0; font-size: 0.9rem; opacity: 0.9; }
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



const Select = styled.select`
  width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-primary); color: var(--text-primary); font-family: inherit;
  &:focus { outline: none; border-color: var(--accent-primary); }
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
  display: grid; 
  grid-template-columns: repeat(3, 1fr); 
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const TeacherCard = styled.div`
  background: var(--bg-primary); 
  border: 1px solid var(--border-color); 
  border-radius: 12px; 
  padding: 1.5rem;
  display: flex; 
  flex-direction: column; 
  gap: 1rem; 
  transition: all 0.2s; 
  align-items: center; 
  text-align: center;
  height: 100%;
  &:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
`;

const AvatarContainer = styled.div`
  width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 3px solid var(--bg-tertiary);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 0.5rem;
`;

const AvatarImg = styled.img`
  width: 100%; height: 100%; object-fit: cover;
`;

const TeacherInfo = styled.div`
  width: 100%;
  h4 { margin: 0 0 0.5rem 0; font-size: 1.15rem; color: var(--text-primary); font-weight: 700; }
`;

const Divider = styled.div`
  height: 1px; width: 100%; background: var(--border-color); opacity: 0.5;
`;

const SubjectsList = styled.div`
  font-size: 0.85rem; color: var(--text-secondary);
  strong { display: block; margin-bottom: 4px; color: var(--text-primary); }
  ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
  li { 
      background: var(--bg-tertiary); 
      padding: 4px 8px; 
      border-radius: 4px; 
      border: 1px solid var(--border-color);
      font-size: 0.8rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
  }
`;

const TeacherStatus = styled.div`
  display: flex; justify-content: center; width: 100%;
`;

const StatusBadge = styled.span`
  display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600;
  color: ${props => props.$success ? '#16a34a' : '#ea580c'};
`;

const EmptyState = styled.p`
  text-align: center; color: var(--text-secondary); padding: 2rem;
`;

export default EvaluationView;
