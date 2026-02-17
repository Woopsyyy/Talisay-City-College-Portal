import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { StudentAPI } from '../../../services/api';
import { BookOpen, Calendar, Award, GraduationCap, User, X, Eye, Download } from 'lucide-react';
import PageSkeleton from '../../loaders/PageSkeleton';

const GradesView = ({ currentUser }) => {
    const [gradesByYear, setGradesByYear] = useState({});
    const [studyLoad, setStudyLoad] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [assignment, setAssignment] = useState(null);
    const [printingSem, setPrintingSem] = useState(null);
    const [selectedSubject, setSelectedSubject] = useState(null); 

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [gradesData, studyLoadData, assignmentData] = await Promise.all([
                StudentAPI.getGrades().catch(err => { console.error("Grades fetch error:", err); return []; }),
                StudentAPI.getStudyLoad('all').catch(err => { console.error("Study load fetch error:", err); return []; }),
                StudentAPI.getAssignment().catch(err => { console.error("Assignment fetch error:", err); return null; })
            ]);

            console.log("Debug - Study Load Received:", studyLoadData);
            console.log("Debug - Assignment Received:", assignmentData);

            const sLoad = Array.isArray(studyLoadData) ? studyLoadData : (studyLoadData ? [studyLoadData] : []);
            setStudyLoad(sLoad);
            
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
            console.error("fetchData overall error:", err);
            setError(err.message || "Failed to load academic records");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (sem) => {
        setPrintingSem(sem);
        setTimeout(() => {
            window.print();
            setPrintingSem(null);
        }, 500);
    };
    
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
        if (raw === "unknown" || raw === "") return "Academic Records";
        if (raw.toLowerCase().includes("year")) return raw;
        if (!isNaN(raw)) {
            const num = parseInt(raw);
            if (num > 0 && num <= 10) return formatOrdinal(num) + " Year";
        }
        return raw; 
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
    const orderedYearKeys = useMemo(() => Object.keys(gradesByYear).sort((a, b) => {
        const indexA = preferredYearOrder.indexOf(a);
        const indexB = preferredYearOrder.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    }), [gradesByYear, preferredYearOrder]);

    const firstSemSubjects = useMemo(
        () => studyLoad.filter(s => normalizeSemester(s.semester) === '1st Semester'),
        [studyLoad]
    );
    const secondSemSubjects = useMemo(
        () => studyLoad.filter(s => normalizeSemester(s.semester) === '2nd Semester'),
        [studyLoad]
    );
    const otherSubjects = useMemo(
        () => studyLoad.filter(s => {
            const normalized = normalizeSemester(s.semester);
            return normalized !== '1st Semester' && normalized !== '2nd Semester';
        }),
        [studyLoad]
    );

    console.log("Subjects Categorized:", {
        total: studyLoad.length,
        first: firstSemSubjects.length,
        second: secondSemSubjects.length,
        other: otherSubjects.length
    });

    const renderSubjectTable = (subjects, validSem, title) => (
        <div className={`printable-section ${printingSem && printingSem !== validSem ? 'hidden-print' : ''}`}>
            <TableHeader className="no-print">
                <SectionHeader>{title}</SectionHeader>
                <PremiumDownloadButton onClick={() => handleDownload(validSem)} disabled={subjects.length === 0}>
                    <Download size={18} /> Download {title}
                </PremiumDownloadButton>
            </TableHeader>
            
            <SubjectTable>
                <thead>
                    <tr>
                        <th style={{ width: '120px' }}>Subject Code</th>
                        <th>Descriptive Title</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Units</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.length === 0 ? (
                        <tr><td colSpan="3" className="text-center empty">No subjects enrolled for this semester.</td></tr>
                    ) : (
                        subjects.map((sub, idx) => (
                            <tr key={idx}>
                                <td><CodeBadge>{sub.subject_code}</CodeBadge></td>
                                <td className="subject-title-cell">{sub.subject_title}</td>
                                <td style={{ textAlign: 'center' }}><strong>{sub.units}</strong></td>
                            </tr>
                        ))
                    )}
                    {subjects.length > 0 && (
                        <TotalRowPrint>
                            <td colSpan="2" style={{ textAlign: 'right', paddingRight: '2rem' }}><strong>TOTAL UNITS ENROLLED:</strong></td>
                            <td style={{ textAlign: 'center' }}><strong>{subjects.reduce((sum, s) => sum + parseFloat(s.units || 0), 0)}</strong></td>
                        </TotalRowPrint>
                    )}
                </tbody>
            </SubjectTable>
        </div>
    );

    if (loading) return <PageSkeleton variant="table" columns={3} />;
    
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

            {/* Study Load - Redesigned Business Style */}
            <PrintStyles>
                <StudyLoadHeader className="no-print">
                    <SectionTitle style={{marginTop: '4rem'}}>
                        <GraduationCap size={24} /> Study Load Management
                    </SectionTitle>
                    <HeaderLogo>
                        <img src="/images/tcc-logo.png" alt="TCC Logo" onError={(e) => e.target.style.display = 'none'} />
                    </HeaderLogo>
                </StudyLoadHeader>
                
                <PrintContainer id="study-load-printable">
                    <PrintHeader>
                        <LogoSection>
                            <img src="/images/tcc-logo.png" alt="TCC Logo" onError={(e) => e.target.style.display = 'none'} />
                        </LogoSection>
                        <HeaderText>
                            <h1>Talisay City College</h1>
                            <p>Poblacion, Talisay City, Cebu, Philippines 6045</p>
                            <p>Tel. No. (032) 272-6804 | Email: talisaycitycollege@gmail.com</p>
                            <h3>Office of the Registrar</h3>
                        </HeaderText>
                    </PrintHeader>

                    <DocumentTitleSection>
                        <h2>CERTIFICATE OF ENROLLMENT (STUDY LOAD)</h2>
                    </DocumentTitleSection>

                    <InfoGridPrint>
                        <InfoBox $span={2}>
                            <label>Student Name</label>
                            <span>{currentUser?.full_name || 'N/A'}</span>
                        </InfoBox>
                        <InfoBox>
                            <label>Student ID</label>
                            <span>{currentUser?.school_id || 'N/A'}</span>
                        </InfoBox>
                        <InfoBox>
                            <label>Gender</label>
                            <span>{currentUser?.sex || currentUser?.gender || '-'}</span>
                        </InfoBox>
                        
                        <InfoBox $span={2}>
                            <label>Course / Program</label>
                            <span>{assignment?.department || assignment?.section_course || 'N/A'}</span>
                        </InfoBox>
                        <InfoBox>
                            <label>Year & Section</label>
                            <span>{assignment?.year_level || assignment?.grade_level || '1'} - {assignment?.section_full_name || assignment?.section_name || assignment?.section_code || 'N/A'}</span>
                        </InfoBox>
                        <InfoBox>
                            <label>Academic Year</label>
                            <span>{assignment?.school_year || '2025-2026'}</span>
                        </InfoBox>
                    </InfoGridPrint>

                    {/* Dynamic Tables */}
                    {firstSemSubjects.length > 0 && renderSubjectTable(firstSemSubjects, '1st Semester', '1ST SEMESTER STUDY LOAD')}
                    {secondSemSubjects.length > 0 && renderSubjectTable(secondSemSubjects, '2nd Semester', '2ND SEMESTER STUDY LOAD')}
                    {otherSubjects.length > 0 && renderSubjectTable(otherSubjects, 'Other', 'ADDITIONAL SUBJECTS')}
                    
                    {studyLoad.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#666', fontStyle: 'italic', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px dashed #ddd' }}>
                            <p>No study load subjects found for your current assignment.</p>
                            <p style={{ fontSize: '0.8rem' }}>Check if your year level and section are correctly assigned.</p>
                        </div>
                    )}

                    <SignatureSection>
                        <div className="sig-block">
                            <div className="line"></div>
                            <span>Student's Signature</span>
                        </div>
                        <div className="sig-block">
                            <div className="line"></div>
                            <span>Registrar's Signature</span>
                        </div>
                    </SignatureSection>

                    <OfficialSeal>
                        <p>NOT VALID WITHOUT OFFICIAL SEAL</p>
                    </OfficialSeal>
                </PrintContainer>
            </PrintStyles>

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

const StudyLoadHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const HeaderLogo = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  img { width: 48px; height: 48px; object-fit: contain; }
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

/* Semester Selector Styled Components */

/* Modern Study Load Styled Components */
const StudyLoadContainer = styled.div`
    background: var(--bg-secondary);
    border-radius: 20px;
    border: 1px solid var(--border-color);
    padding: 2rem;
    box-shadow: var(--shadow-md);
    margin-top: 1rem;
    margin-bottom: 2rem;
`;

const InfoCardsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
`;

const InfoCard = styled.div`
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    transition: all 0.2s;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
        border-color: var(--accent-primary);
    }
`;

const InfoCardLabel = styled.div`
    font-size: 0.8rem;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    letter-spacing: 0.5px;
`;

const InfoCardValue = styled.div`
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--text-primary);
    word-break: break-word;
`;

const AcademicDetailsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--bg-tertiary);
    border-radius: 12px;
    border: 1px solid var(--border-color);
`;

const AcademicDetailItem = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
`;

const DetailIcon = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    flex-shrink: 0;
`;

const DetailContent = styled.div`
    flex: 1;
    min-width: 0;
`;

const DetailLabel = styled.div`
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 0.25rem;
    letter-spacing: 0.5px;
`;

const DetailValue = styled.div`
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    word-break: break-word;
`;

const StatusPill = styled.span`
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 700;
    background: ${props => props.$status === 'Irregular' 
        ? 'rgba(251, 191, 36, 0.15)' 
        : 'rgba(34, 197, 94, 0.15)'};
    color: ${props => props.$status === 'Irregular' 
        ? '#f59e0b' 
        : '#22c55e'};
    border: 1px solid ${props => props.$status === 'Irregular' 
        ? 'rgba(251, 191, 36, 0.3)' 
        : 'rgba(34, 197, 94, 0.3)'};
`;

const SubjectsSection = styled.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
`;

const SubjectsSectionHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
    gap: 1rem;
    
    h4 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        
        svg {
            color: var(--accent-primary);
        }
    }
`;

const SummaryBadges = styled.div`
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
`;

const SummaryBadge = styled.div`
    background: var(--bg-secondary);
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    
    span {
        margin-right: 0.25rem;
    }
    
    strong {
        color: var(--accent-primary);
        font-size: 1.1rem;
    }
`;

const ModernTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    
    thead {
        background: var(--bg-tertiary);
        
        th {
            padding: 1rem 1.5rem;
            text-align: left;
            font-weight: 700;
            font-size: 0.85rem;
            text-transform: uppercase;
            color: var(--text-secondary);
            letter-spacing: 0.5px;
            border-bottom: 2px solid var(--border-color);
        }
    }
    
    tbody {
        tr {
            border-bottom: 1px solid var(--border-color);
            transition: background 0.15s;
            
            &:hover {
                background: var(--bg-tertiary);
            }
            
            &:last-child {
                border-bottom: none;
            }
            
            td {
                padding: 1.25rem 1.5rem;
                color: var(--text-primary);
                font-size: 0.95rem;
            }
        }
    }
`;

const SubjectCodeBadge = styled.span`
    display: inline-block;
    padding: 4px 10px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--accent-primary);
`;

const UnitsBadge = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 50%;
    font-weight: 800;
    font-size: 0.95rem;
    color: var(--accent-primary);
`;

const TotalRowPrint = styled.tr`
    background: #f8fafc;
    td { border-top: 2px solid #0f172a !important; border-bottom: none !important; padding: 1rem !important; }
`;

const PrintContainer = styled.div`
    background: white; 
    padding: 4rem; 
    border-radius: 12px; 
    box-shadow: 0 10px 25px rgba(0,0,0,0.05); 
    color: #1a1a1a;
    font-family: 'Inter', system-ui, sans-serif;
    border: 1px solid #eef0f2;
    position: relative;
    max-width: 900px;
    margin: 3rem auto;

    @media print { 
        box-shadow: none; 
        padding: 0; 
        border: none;
        max-width: 100%;
        margin: 0;
    }
`;

const PrintHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 3px double #0056b3;
`;

const LogoSection = styled.div`
    background: #f8fafc;
    width: 90px;
    height: 90px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #e2e8f0;
    
    img { width: 70px; height: 70px; object-fit: contain; }
`;

const HeaderText = styled.div`
    h1 { font-size: 2rem; font-weight: 900; margin: 0; color: #003366; letter-spacing: -0.5px; }
    p { font-size: 0.85rem; color: #64748b; margin: 3px 0; font-weight: 600; }
    h3 { font-size: 1rem; font-weight: 700; margin: 8px 0 0 0; color: #0056b3; text-transform: uppercase; letter-spacing: 2px; }
`;

const DocumentTitleSection = styled.div`
    text-align: center;
    margin-bottom: 3rem;
    h2 { font-size: 1.6rem; font-weight: 900; color: #1e293b; margin: 0; border-bottom: 2px solid #334155; display: inline-block; padding-bottom: 5px; }
`;

const InfoGridPrint = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.25rem;
    margin-bottom: 3rem;
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;

    @media print { background: none; border: 1px solid #eef0f2; }
`;

const InfoBox = styled.div`
    grid-column: span ${props => props.$span || 1};
    display: flex;
    flex-direction: column;
    gap: 3px;
    
    label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    span { font-size: 1rem; font-weight: 700; color: #0f172a; }
`;

const TableHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    
    @media print { display: none; }
`;

const SectionHeader = styled.h3`
    font-size: 1.25rem;
    font-weight: 800;
    color: #1e293b;
    margin: 0;
    position: relative;
    padding-left: 15px;
    &:before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 80%;
        background: #0056b3;
        border-radius: 2px;
    }
`;

const PremiumDownloadButton = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    background: #0056b3;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(0, 86, 179, 0.2);

    &:hover { background: #004494; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0, 86, 179, 0.3); }
    &:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
`;

const SubjectTable = styled.table`
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3rem;
    
    th {
        background: #f1f5f9;
        text-align: left;
        padding: 1rem;
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
    }

    td {
        padding: 1rem;
        font-size: 0.95rem;
        color: #1e293b;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: middle;
    }

    .subject-title-cell {
        font-weight: 600;
        color: #0f172a;
    }
`;

const CodeBadge = styled.span`
    background: #f1f5f9;
    padding: 4px 8px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 0.85rem;
    color: #0056b3;
    border: 1px solid #e2e8f0;
`;

const SignatureSection = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4rem;
    margin-top: 4rem;
    padding-top: 2rem;

    .sig-block {
        text-align: center;
        .line { border-bottom: 2px solid #1e293b; margin-bottom: 10px; }
        span { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: #475569; }
    }
`;

const OfficialSeal = styled.div`
    margin-top: 4rem;
    text-align: center;
    p { 
        display: inline-block;
        border: 2px dashed #cbd5e1;
        padding: 15px 30px;
        color: #94a3b8;
        font-weight: 800;
        font-size: 0.75rem;
        letter-spacing: 2px;
    }
`;

const PrintStyles = styled.div`
    @media print {
        body * { visibility: hidden; pointer-events: none; }
        #study-load-printable, #study-load-printable * { visibility: visible; }
        #study-load-printable { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            padding: 0;
            margin: 0;
            box-shadow: none !important;
            border: none !important;
        }
        .no-print { display: none !important; }
        .hidden-print { display: none !important; }
        @page { size: auto; margin: 15mm; }
    }
`;

export default GradesView;
