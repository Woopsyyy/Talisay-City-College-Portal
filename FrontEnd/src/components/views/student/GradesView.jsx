import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { StudentAPI } from '../../../services/api';
import { BookOpen, Calendar, Award, GraduationCap, User, Hash, X, Eye } from 'lucide-react';

const GradesView = () => {
    const [gradesByYear, setGradesByYear] = useState({});
    const [studyLoad, setStudyLoad] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [assignment, setAssignment] = useState(null);
    
    const [selectedSubject, setSelectedSubject] = useState(null); 

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [gradesData, studyLoadData, assignmentData] = await Promise.all([
                    StudentAPI.getGrades().catch(() => []),
                    StudentAPI.getStudyLoad().catch(() => []),
                    StudentAPI.getAssignment().catch(() => null)
                ]);

                setStudyLoad(Array.isArray(studyLoadData) ? studyLoadData : (studyLoadData ? [studyLoadData] : []));
                
                const assign = Array.isArray(assignmentData) && assignmentData.length > 0 ? assignmentData[0] : assignmentData;
                setAssignment(assign);

                
                const grouped = {};
                (Array.isArray(gradesData) ? gradesData : []).forEach(grade => {
                    const year = grade.year || "unknown"; 
                    
                    if (!grouped[year]) {
                        grouped[year] = {
                            label: normalizeYear(year),
                            subjects: []
                        };
                    }
                    grouped[year].subjects.push(grade);
                });

                setGradesByYear(grouped);

            } catch (err) {
                console.error("Load grades error:", err);
                setError(err.message || "Failed to load grades");
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
        if (value >= 11 && value <= 13) return number + "th";
        return number + (suffixes[number % 10] || "th");
    };

    const normalizeYear = (value) => {
        const raw = String(value || "").trim();
        if (raw === "unknown") return "Academic Records";
        if (raw === "") return "Academic Records";
        if (!isNaN(raw)) {
            const num = parseInt(raw);
            if (num > 0 && num <= 10) return formatOrdinal(num) + " Year";
        }
        return raw + " Year"; 
    };

    const normalizeSemester = (value) => {
        const raw = String(value || "").trim().toLowerCase();
        if (raw === "") return "N/A";
        if (raw.includes("1") || raw.includes("first")) return "1st Semester";
        if (raw.includes("2") || raw.includes("second")) return "2nd Semester";
        if (raw.includes("summer")) return "Summer";
        return raw;
    };

    
    const preferredYearOrder = ["1", "2", "3", "4"];
    const orderedYearKeys = Object.keys(gradesByYear).sort((a, b) => {
        const indexA = preferredYearOrder.indexOf(a);
        const indexB = preferredYearOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

    const totalSubjects = studyLoad.length;
    const totalUnits = studyLoad.reduce((sum, s) => sum + parseInt(s.units || 0), 0);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center p-5">
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
        </div>
    );
    
    if (error) return <Container><div className="alert alert-danger">Error loading grades: {error}</div></Container>;

    return (
        <Container>
            <Header>
                <h2>Academic Records</h2>
                <p>Track your grades and enrollment status</p>
            </Header>

            {orderedYearKeys.length === 0 ? (
                <EmptyGroup>
                    <Award size={48} />
                    <p>No academic records found.</p>
                </EmptyGroup>
            ) : (
                orderedYearKeys.map(yearKey => {
                    const yearData = gradesByYear[yearKey];
                    return (
                        <YearGroup key={yearKey}>
                            <YearTitle>
                                <Calendar size={20} /> {yearData.label}
                            </YearTitle>
                            
                            <SubjectGrid>
                                {yearData.subjects.map((grade, idx) => (
                                    <SubjectCard key={idx} onClick={() => setSelectedSubject(grade)}>
                                        <CardIcon>
                                            <BookOpen size={24} />
                                        </CardIcon>
                                        <CardContent>
                                            <SubjectCode>{grade.subject_code || 'SUBJ'}</SubjectCode>
                                            <SubjectTitle>{grade.subject || 'Unknown Subject'}</SubjectTitle>
                                            <ViewButton>
                                                <Eye size={14} /> View Grades
                                            </ViewButton>
                                        </CardContent>
                                    </SubjectCard>
                                ))}
                            </SubjectGrid>
                        </YearGroup>
                    );
                })
            )}

            {}
            <SectionTitle>
                <GraduationCap size={24} /> Current Enrollment Info
            </SectionTitle>

            <Card>
                <CardHeader>
                    <Hash size={20} />
                    <h3>Study Load ({assignment?.school_year || 'Current Sem'})</h3>
                </CardHeader>
                <CardBody>
                    {studyLoad.length === 0 ? (
                        <EmptyState>No subjects enrolled this semester.</EmptyState>
                    ) : (
                        <StyledTable>
                            <thead>
                                <tr>
                                    <th>Subject Code</th>
                                    <th>Description</th>
                                    <th>Units</th>
                                    <th>Instructor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {studyLoad.map((subject, idx) => (
                                    <tr key={idx}>
                                        <td><Code>{subject.subject_code || "—"}</Code></td>
                                        <td>{subject.subject_title || "—"}</td>
                                        <td>{parseInt(subject.units || 0)}</td>
                                        <td>
                                            <InstructorCell>
                                                <User size={14} />
                                                {subject.teacher || "TBA"}
                                            </InstructorCell>
                                        </td>
                                    </tr>
                                ))}
                                <TotalRow>
                                    <td colSpan="2"><strong>Total Units</strong></td>
                                    <td><strong>{totalUnits}</strong></td>
                                    <td></td>
                                </TotalRow>
                            </tbody>
                        </StyledTable>
                    )}
                </CardBody>
            </Card>

            {}
            {selectedSubject && (
                <ModalOverlay onClick={() => setSelectedSubject(null)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <div>
                                <ModalTitle>{selectedSubject.subject}</ModalTitle>
                                <ModalSubtitle>
                                    {selectedSubject.subject_code} • {normalizeSemester(selectedSubject.semester)}
                                </ModalSubtitle>
                            </div>
                            <CloseButton onClick={() => setSelectedSubject(null)}>
                                <X size={24} />
                            </CloseButton>
                        </ModalHeader>
                        <ModalBody>
                            <GradeTable>
                                <thead>
                                    <tr>
                                        <th>Term</th>
                                        <th>Grade</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Prelim</td>
                                        <td><GradeValue>{selectedSubject.prelim_grade || "—"}</GradeValue></td>
                                        <td>{getStatus(selectedSubject.prelim_grade)}</td>
                                    </tr>
                                    <tr>
                                        <td>Midterm</td>
                                        <td><GradeValue>{selectedSubject.midterm_grade || "—"}</GradeValue></td>
                                        <td>{getStatus(selectedSubject.midterm_grade)}</td>
                                    </tr>
                                    <tr>
                                        <td>Finals</td>
                                        <td><GradeValue>{selectedSubject.finals_grade || "—"}</GradeValue></td>
                                        <td>{getStatus(selectedSubject.finals_grade)}</td>
                                    </tr>
                                </tbody>
                            </GradeTable>
                            
                            {selectedSubject.instructor && (
                                <InstructorInfo>
                                    <User size={16} />
                                    Instructor: <strong>{selectedSubject.instructor}</strong>
                                </InstructorInfo>
                            )}
                        </ModalBody>
                    </ModalContent>
                </ModalOverlay>
            )}

        </Container>
    );
};


const getStatus = (grade) => {
    if (!grade) return <StatusBadge $type="pending">Pending</StatusBadge>;
    const g = parseFloat(grade);
    if (isNaN(g)) return <StatusBadge $type="neutral">{grade}</StatusBadge>;
    if (g <= 3.0) return <StatusBadge $type="pass">Passed</StatusBadge>;
    if (g > 3.0) return <StatusBadge $type="fail">Failed</StatusBadge>; 
    return <StatusBadge $type="neutral">—</StatusBadge>;
};


const Container = styled.div`
  animation: fadeIn 0.4s ease-out;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 4rem;
`;

const Header = styled.div`
  margin-bottom: 2.5rem;
  h2 { font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`;

const YearGroup = styled.div`
    margin-bottom: 3rem;
`;

const YearTitle = styled.h3`
    display: flex; align-items: center; gap: 0.75rem; font-size: 1.4rem; color: var(--accent-primary); margin-bottom: 1.5rem;
`;

const SubjectGrid = styled.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;
`;

const SubjectCard = styled.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem;
    cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 1rem; position: relative; overflow: hidden;
    &:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--accent-primary); }
    &:hover button { color: var(--accent-primary); background: var(--bg-tertiary); }
`;

const CardIcon = styled.div`
    width: 48px; height: 48px; border-radius: 12px; background: var(--bg-tertiary); color: var(--accent-primary);
    display: flex; align-items: center; justify-content: center;
`;

const CardContent = styled.div`
    display: flex; flex-direction: column; gap: 0.25rem;
`;

const SubjectCode = styled.span`
    font-family: monospace; font-size: 0.85rem; color: var(--text-secondary); background: var(--bg-tertiary); 
    padding: 2px 6px; border-radius: 4px; align-self: flex-start;
`;

const SubjectTitle = styled.h4`
    font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0.5rem 0; line-height: 1.4;
`;

const ViewButton = styled.button`
    display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary);
    background: transparent; border: none; padding: 0.5rem 0; margin-top: auto; cursor: pointer; transition: color 0.2s;
`;

const SectionTitle = styled.h3`
  display: flex; align-items: center; gap: 10px; font-size: 1.5rem; color: var(--text-primary); margin: 3rem 0 1.5rem 0;
`;

const Card = styled.div`
  background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color);
  display: flex; align-items: center; gap: 12px;
  h3 { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-primary); }
  svg { color: var(--accent-primary); }
`;

const CardBody = styled.div` padding: 0; `;

const StyledTable = styled.table`
  width: 100%; border-collapse: collapse;
  th, td { padding: 1rem 1.5rem; text-align: left; border-bottom: 1px solid var(--border-color); }
  th { background: var(--bg-tertiary); color: var(--text-secondary); font-weight: 600; font-size: 0.85rem; text-transform: uppercase; }
  td { color: var(--text-primary); font-size: 0.95rem; }
  tr:last-child td { border-bottom: none; }
`;

const Code = styled.span`
  font-family: monospace; background: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;
`;

const InstructorCell = styled.div`
    display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary); svg { color: var(--text-secondary); }
`;

const TotalRow = styled.tr`
  background: var(--bg-tertiary); td { font-weight: 700; color: var(--text-primary); }
`;

const EmptyState = styled.div`
    padding: 3rem; text-align: center; color: var(--text-secondary);
`;

const EmptyGroup = styled(EmptyState)`
    background: var(--bg-secondary); border-radius: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: center; gap: 1rem; svg { opacity: 0.5; }
`;


const ModalOverlay = styled.div`
    position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;
    display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); animation: fadeIn 0.2s;
`;

const ModalContent = styled.div`
    background: var(--bg-secondary); width: 90%; max-width: 500px; border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

const ModalHeader = styled.div`
    padding: 1.5rem; background: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start;
`;

const ModalTitle = styled.h3` margin: 0; font-size: 1.25rem; color: var(--text-primary); line-height: 1.2; `;
const ModalSubtitle = styled.p` margin: 0.25rem 0 0 0; font-size: 0.9rem; color: var(--text-secondary); `;

const CloseButton = styled.button`
    background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 0; margin-left: 1rem;
    &:hover { color: var(--text-primary); }
`;

const ModalBody = styled.div` padding: 1.5rem; `;

const GradeTable = styled.table`
    width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; margin-bottom: 1.5rem;
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color); }
    th { background: var(--bg-tertiary); font-weight: 600; font-size: 0.85rem; color: var(--text-secondary); }
    tr:last-child td { border-bottom: none; }
`;

const GradeValue = styled.span` font-weight: 700; color: var(--text-primary); font-size: 1rem; `;

const StatusBadge = styled.span`
    padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
    background: ${props => props.$type === 'pass' ? 'rgba(16, 185, 129, 0.1)' : props.$type === 'fail' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-tertiary)'};
    color: ${props => props.$type === 'pass' ? '#10b981' : props.$type === 'fail' ? '#ef4444' : 'var(--text-secondary)'};
`;

const InstructorInfo = styled.div`
    display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); padding-top: 1rem; border-top: 1px solid var(--border-color);
    strong { color: var(--text-primary); }
`;

export default GradesView;
