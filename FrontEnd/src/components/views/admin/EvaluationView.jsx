import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AdminAPI, getAvatarUrl } from '../../../services/api';
import { ClipboardCheck, ToggleLeft, AlertTriangle, User, FileText, X, Save, Plus, Trash2 } from 'lucide-react';
import Toast from '../../common/Toast';
import PageSkeleton from '../../loaders/PageSkeleton';

const EvaluationView = () => {
    const [enabled, setEnabled] = useState(true);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [avatarUrls, setAvatarUrls] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [showModal, setShowModal] = useState(false);
    const [template, setTemplate] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);

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
            setTemplate(settings.template || null);
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

    const handleOpenModal = () => {
        const defaultTemplate = template || {
            title: "𝐓𝐀𝐋𝐈𝐒𝐀𝐘 𝐂𝐈𝐓𝐘 𝐂𝐎𝐋𝐋𝐄𝐆𝐄 - 𝐒𝐓𝐔𝐃𝐄𝐍𝐓'𝐒 𝐄𝐕𝐀𝐋𝐔𝐀𝐓𝐈𝐎𝐍 𝐅𝐎𝐑 𝐓𝐄𝐀𝐂𝐇𝐄𝐑𝐒",
            subtitle: "(𝟏𝐬𝐭 𝐒𝐞𝐦𝐞𝐬𝐭𝐞𝐫 𝐨𝐟 𝐒.𝐘. 𝟐𝟎𝟐𝟓-𝟐𝟎𝟐𝟔)",
            description: "This Evaluation Form will be part of your 𝐑𝐄𝐐𝐔𝐈𝐑𝐄𝐌𝐄𝐍𝐓𝐒 𝐟𝐨𝐫 𝐂𝐋𝐄𝐀𝐑𝐀𝐍𝐂𝐄 𝐟𝐨𝐫 𝐭𝐡𝐞 𝟏𝐬𝐭 𝐒𝐞𝐦𝐞𝐬𝐭𝐞𝐫 𝐨𝐟 𝐒.𝐘. 𝟐𝟎𝟐𝟓-𝟐𝟎𝟐𝟔.\n\nDirections: The following are statements about your SUBJECT TEACHER for the 𝟏𝐬𝐭 𝐒𝐞𝐦𝐞𝐬𝐭𝐞𝐫 𝐨𝐟 𝐒.𝐘. 𝟐𝟎𝟐𝟓-𝟐𝟎𝟐𝟔. Please indicate the extent to which each statement characterizes the competence of your teacher by choosing the specific numerical rating based on the following:",
            scale: [
                {label: "𝗢 (𝟰) = 𝗢𝘂𝘁𝘀𝘁𝗮𝗻𝗱𝗶𝗻𝗴", value: 4},
                {label: "𝗩𝗦 (𝟯) = 𝗩𝗲𝗿𝘆 𝐒𝐚𝐭𝐢𝐬𝐟𝐚𝗰𝘁𝗼𝐫𝐲", value: 3},
                {label: "𝗦 (𝟮) = 𝗦𝗮𝘁𝗶𝘀𝗳𝗮𝗰𝘁𝗼𝐫𝐲", value: 2},
                {label: "𝗡𝗜 (𝟭) = 𝗡𝗲𝗲𝗱𝘀 𝗜𝗺𝗽𝗿𝗼𝘃𝗲𝗺𝗲𝗻𝘁", value: 1}
            ],
            sections: [
                {
                    id: "part1",
                    title: "𝐏𝐀𝐑𝐓 𝟏: 𝐌𝐘 𝐓𝐄𝐀𝐂𝐇𝐄𝐑",
                    questions: [
                        "Knows his/her subject matter well and organizes presentation of subject matter with clarity and coherence",
                        "Is proficient in English/Filipino/Japanese",
                        "Employs appropriate teaching methods/strategies whether in-person or online",
                        "Makes good use of visual aids/instructional materials to facilitate learning whether in-person or online and share them without difficulty (audio, video, etc.)",
                        "Manages the class well and commands respect from students while on discussion both in-person and online",
                        "Utilizes class period productively and sustains students’ interest in lesson and class discussion",
                        "Engages us with questions to deepen our understanding",
                        "Gives subject requirements that are relevant to the program outcomes of my degree",
                        "Gives learning tasks that are well-paced to give us adequate time to work on them",
                        "Behaves professionally through words and actions"
                    ]
                },
                {
                    id: "part2",
                    title: "𝐏𝐀𝐑𝐓 𝐈𝐈: 𝐀𝐬 𝐚 𝐒𝐓𝐔𝐃𝐄𝐍𝐓...",
                    questions: [
                        "With my teacher’s guidance, I can demonstrate the intended knowledge and skills with competence.",
                        "With my teacher’s guidance, I can connect theory and practical knowledge of this subject.",
                        "With my teacher’s guidance, I have improved my problem-solving, critical thinking, and decision-making skills through this subject.",
                        "I am happy that he/she is my teacher.",
                        "I can feel the teacher’s concern for us, his/her students.",
                        "I look up to my teacher as a role model.",
                        "I like to be in his/her class again.",
                        "I notice that my teacher extends help to his/her students who are struggling academically."
                    ]
                }
            ],
            satisfaction_question: "In a scale of 1 (not satisfied) to 10 (very satisfied), how satisfied are you with your learning experiences in this subject?",
            recommend_question: "Will you recommend the subject/s under the present teacher?",
            comments_label: "𝐂𝐎𝐌𝐌𝐄𝐍𝐓𝐒"
        };
        setEditingTemplate(JSON.parse(JSON.stringify(defaultTemplate)));
        setShowModal(true);
    };

    if (loading) return <PageSkeleton variant="dashboard" />;

    const handleSaveTemplate = async () => {
        try {
            await AdminAPI.updateEvaluationSettings({ template: editingTemplate });
            setTemplate(editingTemplate);
            setShowModal(false);
            setToast({ show: true, message: "Evaluation template updated successfully.", type: 'success' });
        } catch (err) {
            console.error("Error saving template:", err);
            setToast({ show: true, message: "Failed to save template.", type: 'error' });
        }
    };

    const updateSectionQuestion = (sectionIndex, qIndex, value) => {
        const newTemplate = { ...editingTemplate };
        newTemplate.sections[sectionIndex].questions[qIndex] = value;
        setEditingTemplate(newTemplate);
    };

    const addQuestion = (sectionIndex) => {
        const newTemplate = { ...editingTemplate };
        newTemplate.sections[sectionIndex].questions.push("");
        setEditingTemplate(newTemplate);
    };

    const removeQuestion = (sectionIndex, qIndex) => {
        const newTemplate = { ...editingTemplate };
        newTemplate.sections[sectionIndex].questions.splice(qIndex, 1);
        setEditingTemplate(newTemplate);
    };

    return (
        <StyledContainer>
            <HeaderSection>
                <div>
                    <h2><ClipboardCheck size={32} /> Evaluation Management</h2>
                    <p>Enable or disable teacher evaluations and view performance metrics.</p>
                </div>
                <button 
                    className="btn btn-primary d-flex align-items-center gap-2"
                    onClick={handleOpenModal}
                    style={{ padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold' }}
                >
                    <FileText size={20} /> Update Evaluation Template
                </button>
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

            {showModal && editingTemplate && (
                <ModalOverlay onClick={() => setShowModal(false)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <div className="d-flex align-items-center gap-2">
                                <FileText size={24} color="var(--accent-primary)" />
                                <h3>Customize Evaluation Template</h3>
                            </div>
                            <CloseButton onClick={() => setShowModal(false)}><X size={24} /></CloseButton>
                        </ModalHeader>
                        <ModalBody>
                            <SectionTitle>General Information</SectionTitle>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Main Title</label>
                                <Input 
                                    value={editingTemplate.title} 
                                    onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Subtitle / Semester</label>
                                <Input 
                                    value={editingTemplate.subtitle} 
                                    onChange={e => setEditingTemplate({...editingTemplate, subtitle: e.target.value})}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Description / Directions</label>
                                <Textarea 
                                    rows="4"
                                    value={editingTemplate.description} 
                                    onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                                />
                            </div>

                            {editingTemplate.sections.map((section, sIndex) => (
                                <div key={sIndex} className="mt-4">
                                    <SectionTitle>{section.title}</SectionTitle>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Section Title</label>
                                        <Input 
                                            value={section.title} 
                                            onChange={e => {
                                                const newTemplate = {...editingTemplate};
                                                newTemplate.sections[sIndex].title = e.target.value;
                                                setEditingTemplate(newTemplate);
                                            }}
                                        />
                                    </div>
                                    <QuestionsList>
                                        {section.questions.map((q, qIndex) => (
                                            <QuestionItem key={qIndex}>
                                                <span className="q-num">{qIndex + 1}</span>
                                                <Input 
                                                    value={q} 
                                                    onChange={e => updateSectionQuestion(sIndex, qIndex, e.target.value)}
                                                />
                                                <IconButton color="#ef4444" onClick={() => removeQuestion(sIndex, qIndex)}>
                                                    <Trash2 size={18} />
                                                </IconButton>
                                            </QuestionItem>
                                        ))}
                                    </QuestionsList>
                                    <button 
                                        className="btn btn-outline-primary btn-sm mt-2 d-flex align-items-center gap-1"
                                        onClick={() => addQuestion(sIndex)}
                                    >
                                        <Plus size={16} /> Add Question
                                    </button>
                                </div>
                            ))}

                            <SectionTitle className="mt-4">Bottom Questions</SectionTitle>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Satisfaction Scale Question</label>
                                <Input 
                                    value={editingTemplate.satisfaction_question} 
                                    onChange={e => setEditingTemplate({...editingTemplate, satisfaction_question: e.target.value})}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Recommendation Question</label>
                                <Input 
                                    value={editingTemplate.recommend_question} 
                                    onChange={e => setEditingTemplate({...editingTemplate, recommend_question: e.target.value})}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold">Comments Label</label>
                                <Input 
                                    value={editingTemplate.comments_label} 
                                    onChange={e => setEditingTemplate({...editingTemplate, comments_label: e.target.value})}
                                />
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleSaveTemplate}>
                                <Save size={18} /> Save Template Changes
                            </button>
                        </ModalFooter>
                    </ModalContent>
                </ModalOverlay>
            )}
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: var(--bg-secondary);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  border: 1px solid var(--border-color);
`;

const ModalHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  h3 { margin: 0; font-size: 1.25rem; font-weight: 800; }
`;

const CloseButton = styled.button`
  background: transparent; border: none; color: var(--text-secondary); cursor: pointer;
  &:hover { color: var(--text-primary); }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  background: var(--bg-primary);
`;

const ModalFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const SectionTitle = styled.h4`
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--accent-primary);
    font-weight: 800;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid var(--bg-tertiary);
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  &:focus { outline: none; border-color: var(--accent-primary); }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  resize: vertical;
  &:focus { outline: none; border-color: var(--accent-primary); }
`;

const QuestionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const QuestionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  .q-num {
      min-width: 24px; height: 24px; background: var(--bg-tertiary); border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;
  }
  input { margin-bottom: 0; }
`;

const IconButton = styled.button`
  background: transparent; border: none; color: ${props => props.color}; cursor: pointer;
  opacity: 0.7; &:hover { opacity: 1; }
`;

export default EvaluationView;
