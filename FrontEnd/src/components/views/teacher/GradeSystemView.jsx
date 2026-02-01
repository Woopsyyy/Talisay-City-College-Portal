import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { TeacherAPI } from '../../../services/api';
import { Users, ChevronLeft, Search, Save, Award, BookOpen, Clock, Calendar } from 'lucide-react';
import Loader from '../../Loader';

const GradeSystemView = () => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSection, setSelectedSection] = useState(null);
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({});
    const [loadingDetails, setLoadingDetails] = useState(false);
    
    
    const [editingStudent, setEditingStudent] = useState(null);
    const [gradeForm, setGradeForm] = useState({ prelim: '', midterm: '', finals: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        try {
            const data = await TeacherAPI.getSections();
            setSections(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching sections:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSectionClick = async (section) => {
        setSelectedSection(section);
        setLoadingDetails(true);
        try {
            
            let studentsData = [];
            let gradesData = {};

            try {
                studentsData = await TeacherAPI.getStudentsBySection(section.name);
            } catch (err) {
                console.error("Error fetching students:", err);
                
            }

            try {
                
                if (section.subjects && section.subjects.length > 0) {
                     gradesData = await TeacherAPI.getGrades({ 
                        section: section.name, 
                        subject: section.subjects[0]?.code 
                    });
                }
            } catch (err) {
                 console.error("Error fetching grades:", err);
            }

            setStudents(Array.isArray(studentsData) ? studentsData : []);
            setGrades(gradesData || {});
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleEditClick = (student) => {
        const studentGrades = grades[student.id] || {};
        setGradeForm({
            prelim: studentGrades.prelim_grade || '',
            midterm: studentGrades.midterm_grade || '',
            finals: studentGrades.finals_grade || ''
        });
        setEditingStudent(student);
    };

    const handleSaveGrades = async () => {
        if (!editingStudent || !selectedSection) return;
        setIsSaving(true);
        try {
            
            const payload = {
                student_id: editingStudent.id,
                subject: selectedSection.subjects[0]?.code, 
                prelim: gradeForm.prelim,
                midterm: gradeForm.midterm,
                finals: gradeForm.finals
            };

            await TeacherAPI.createGrade(payload);
            
            
            setGrades(prev => ({
                ...prev,
                [editingStudent.id]: {
                    ...prev[editingStudent.id],
                    prelim_grade: gradeForm.prelim,
                    midterm_grade: gradeForm.midterm,
                    finals_grade: gradeForm.finals
                }
            }));
            
            setEditingStudent(null);
        } catch (err) {
            alert("Failed to save grades: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    
    const calculateFinal = (g) => {
        if (!g) return 'N/A';
        
        return g.finals_grade || 'N/A';
    };

    if (loading) return <Loader />;

    
    if (!selectedSection) {
        return (
            <Container>
                <Header>
                    <div>
                        <Title>Grade Management</Title>
                        <Subtitle>Select a section to manage student grades</Subtitle>
                    </div>
                    <BookOpen size={32} color="var(--accent-primary)" />
                </Header>
                
                {sections.length === 0 ? (
                    <EmptyState>
                        <Award size={48} />
                        <p>No sections assigned to you yet.</p>
                    </EmptyState>
                ) : (
                    <Grid>
                        {sections.map((sec, idx) => (
                            <SectionCard key={idx} onClick={() => handleSectionClick(sec)}>
                                <CardHeader>
                                    <Badge>{sec.year_level || 'Yr'} - {sec.name}</Badge>
                                    <Users size={20} />
                                </CardHeader>
                                <CardBody>
                                    <CourseTitle>{sec.course || 'General'}</CourseTitle>
                                    <SubjectList>
                                        {sec.subjects.map((sub, sIdx) => (
                                            <SubjectItem key={sIdx}>
                                                <BookOpen size={14} />
                                                <span>{sub.name}</span>
                                            </SubjectItem>
                                        ))}
                                    </SubjectList>
                                </CardBody>
                            </SectionCard>
                        ))}
                    </Grid>
                )}
            </Container>
        );
    }

    
    return (
        <Container>
            <DetailHeader>
               <BackButton onClick={() => setSelectedSection(null)}>
                   <ChevronLeft size={20} /> Back to Sections
               </BackButton>
               <DetailTitle>
                   <h2>{selectedSection.name}</h2>
                   <p>{selectedSection.subjects[0]?.name} • Master List</p>
               </DetailTitle>
            </DetailHeader>

            {loadingDetails ? (
                <Loader />
            ) : (
                <>
                    <StudentGrid>
                        {}
                        {students
                            .sort((a, b) => a.full_name.localeCompare(b.full_name))
                            .map((student) => {
                                const g = grades[student.id];
                                return (
                                    <StudentCard key={student.id} onClick={() => handleEditClick(student)}>
                                        <AvatarPlaceholder>
                                            {student.image_path ? (
                                                <img src={student.image_path} alt={student.full_name} onError={e => e.target.style.display='none'} />
                                            ) : (
                                                student.full_name.charAt(0)
                                            )}
                                        </AvatarPlaceholder>
                                        <StudentInfo>
                                            <h3>{student.full_name}</h3>
                                            <span>{student.school_id || 'No ID'}</span>
                                        </StudentInfo>
                                        <GradePreview>
                                            <GradeItem>
                                                <label>Prelim</label>
                                                <strong>{g?.prelim_grade || '-'}</strong>
                                            </GradeItem>
                                            <GradeItem>
                                                <label>Midterm</label>
                                                <strong>{g?.midterm_grade || '-'}</strong>
                                            </GradeItem>
                                            <GradeItem>
                                                <label>Finals</label>
                                                <strong>{g?.finals_grade || '-'}</strong>
                                            </GradeItem>
                                        </GradePreview>
                                    </StudentCard>
                                );
                        })}
                    </StudentGrid>
                    
                    {students.length === 0 && (
                         <EmptyState>No students found in this section.</EmptyState>
                    )}
                </>
            )}

            {}
            {editingStudent && (
                <ModalOverlay onClick={() => !isSaving && setEditingStudent(null)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <h3>Grading: {editingStudent.full_name}</h3>
                            <button onClick={() => setEditingStudent(null)} disabled={isSaving}>&times;</button>
                        </ModalHeader>
                        <ModalBody>
                            <FormGroup>
                                <label>Prelim Grade</label>
                                <Input 
                                    type="text" 
                                    value={gradeForm.prelim} 
                                    onChange={e => setGradeForm({...gradeForm, prelim: e.target.value})}
                                    placeholder="e.g. 1.0, 85, A"
                                />
                            </FormGroup>
                            <FormGroup>
                                <label>Midterm Grade</label>
                                <Input 
                                    type="text" 
                                    value={gradeForm.midterm} 
                                    onChange={e => setGradeForm({...gradeForm, midterm: e.target.value})}
                                    placeholder="e.g. 1.0, 85, A"
                                />
                            </FormGroup>
                            <FormGroup>
                                <label>Finals Grade</label>
                                <Input 
                                    type="text" 
                                    value={gradeForm.finals} 
                                    onChange={e => setGradeForm({...gradeForm, finals: e.target.value})}
                                    placeholder="e.g. 1.0, 85, A"
                                />
                            </FormGroup>
                        </ModalBody>
                        <ModalFooter>
                            <Button $secondary onClick={() => setEditingStudent(null)} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleSaveGrades} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Grades'}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </ModalOverlay>
            )}
        </Container>
    );
};


const Container = styled.div`
    padding: 1rem;
    animation: fadeIn 0.3s ease-out;
    max-width: 1200px;
    margin: 0 auto;
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

const Header = styled.div`
    display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;
`;

const Title = styled.h2`
    font-size: 1.75rem; color: var(--text-primary); margin: 0 0 0.5rem 0; font-weight: 800;
`;

const Subtitle = styled.p` color: var(--text-secondary); margin: 0; font-size: 1rem; `;

const Grid = styled.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
`;

const SectionCard = styled.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; 
    overflow: hidden; cursor: pointer; transition: all 0.2s;
    &:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--accent-primary); }
`;

const CardHeader = styled.div`
    padding: 1.25rem; background: var(--bg-tertiary); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);
    svg { color: var(--text-secondary); }
`;

const Badge = styled.span`
    background: var(--accent-primary); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: 600; font-size: 0.85rem;
`;

const CardBody = styled.div` padding: 1.25rem; `;

const CourseTitle = styled.h3` font-size: 1.1rem; margin: 0 0 1rem 0; color: var(--text-primary); `;

const SubjectList = styled.div` display: flex; flex-direction: column; gap: 0.5rem; `;

const SubjectItem = styled.div`
    display: flex; align-items: center; gap: 0.5rem; color: var(--text-secondary); font-size: 0.9rem;
    svg { color: var(--accent-primary); }
`;

const EmptyState = styled.div`
    display: flex; flex-direction: column; align-items: center; padding: 4rem; color: var(--text-secondary); gap: 1rem;
    background: var(--bg-secondary); border-radius: 16px;
    svg { opacity: 0.5; }
`;


const DetailHeader = styled.div` margin-bottom: 2rem; `;

const BackButton = styled.button`
    display: flex; align-items: center; gap: 0.5rem; background: none; border: none; color: var(--text-secondary); cursor: pointer; font-weight: 600; margin-bottom: 1rem;
    &:hover { color: var(--accent-primary); }
`;

const DetailTitle = styled.div`
    h2 { font-size: 2rem; margin: 0 0 0.25rem 0; color: var(--text-primary); }
    p { color: var(--text-secondary); font-size: 1.1rem; }
`;

const StudentGrid = styled.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;
`;

const StudentCard = styled.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1rem; 
    display: flex; align-items: center; gap: 1rem; cursor: pointer; transition: all 0.2s;
    &:hover { border-color: var(--accent-primary); box-shadow: var(--shadow-sm); }
`;

const AvatarPlaceholder = styled.div`
    width: 48px; height: 48px; border-radius: 50%; background: var(--bg-tertiary); color: var(--accent-primary); 
    display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; }
`;

const StudentInfo = styled.div`
    flex: 1; min-width: 0;
    h3 { margin: 0 0 0.25rem 0; font-size: 1rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    span { font-size: 0.85rem; color: var(--text-secondary); }
`;

const GradePreview = styled.div`
    display: flex; gap: 0.75rem; text-align: center;
`;

const GradeItem = styled.div`
    display: flex; flex-direction: column;
    label { font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; }
    strong { font-size: 0.9rem; color: var(--accent-primary); }
`;


const ModalOverlay = styled.div`
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);
`;

const ModalContent = styled.div`
    background: var(--bg-secondary); width: 90%; max-width: 500px; border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden; animation: slideUp 0.3s ease-out;
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

const ModalHeader = styled.div`
    padding: 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;
    h3 { margin: 0; color: var(--text-primary); }
    button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-secondary); &:hover { color: var(--text-primary); } }
`;

const ModalBody = styled.div` padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; `;

const FormGroup = styled.div`
    display: flex; flex-direction: column; gap: 0.5rem;
    label { font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); }
`;

const Input = styled.input`
    padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);
    &:focus { outline: none; border-color: var(--accent-primary); }
`;

const ModalFooter = styled.div`
    padding: 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 1rem;
`;

const Button = styled.button`
    padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s;
    background: ${props => props.$secondary ? 'transparent' : 'var(--accent-primary)'};
    color: ${props => props.$secondary ? 'var(--text-secondary)' : 'white'};
    border: ${props => props.$secondary ? '1px solid var(--border-color)' : 'none'};
    &:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

export default GradeSystemView;
