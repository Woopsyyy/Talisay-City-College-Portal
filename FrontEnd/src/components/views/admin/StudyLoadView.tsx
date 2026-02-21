import React, { useState, useEffect, useRef, useMemo } from 'react';
import baseStyled from 'styled-components';
const styled = baseStyled as any;
import { AdminAPI } from '../../../services/api';
import Toast from '../../common/Toast';
import { BookOpen, GraduationCap, Download, Layers, Calendar, ArrowLeft, Hash, Users, Clock, AlertCircle, PlusCircle, Trash2, Search, Save } from 'lucide-react';
import PageSkeleton from '../../loaders/PageSkeleton';

const StudyLoadView = () => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSection, setSelectedSection] = useState(null);
    const [studyLoadDetails, setStudyLoadDetails] = useState([]);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [activeYear, setActiveYear] = useState('All');
    const [toast, setToast] = useState(null);
    
    
    const [allSubjects, setAllSubjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSubjectCode, setSelectedSubjectCode] = useState('');
    const searchTimeoutRef = useRef(null);
    
    
    const defaultSchedule = {
        day: 'Monday', 
        time_start: '00:00',
        time_end: '00:00',
        building: '',
        room: ''
    };

    useEffect(() => {
        fetchSections();
    }, []);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const fetchSections = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getSectionsWithLoad();
            setSections(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error loading sections:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllSubjects = async () => {
        try {
            const data = await AdminAPI.getSubjects();
            console.log("Fetched Subjects:", data);
            setAllSubjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error loading subjects:", err);
        }
    };

    const handleSectionClick = async (section) => {
        setSelectedSection(section);
        setDetailsLoading(true);
        if (allSubjects.length === 0) fetchAllSubjects(); 
        try {
            const details = await AdminAPI.getSectionLoadDetails(section.id);
            setStudyLoadDetails(Array.isArray(details) ? details : []);
        } catch (err) {
            console.error("Error details:", err);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleBack = () => {
        setSelectedSection(null);
        setStudyLoadDetails([]);
        fetchSections(); 
    };



    
    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        setSelectedSubjectCode(''); 

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (term.length === 0) {
            setSuggestions([]);
            return;
        }

        searchTimeoutRef.current = setTimeout(() => {
            const filtered = allSubjects.filter(s => 
                s.subject_code.toLowerCase().includes(term.toLowerCase()) || 
                s.subject_name.toLowerCase().includes(term.toLowerCase())
            );
            setSuggestions(filtered.slice(0, 10)); 
        }, 200);
    };

    const handleSelectSuggestion = (subject) => {
        setSearchTerm(`${subject.subject_code} - ${subject.subject_name}`);
        setSelectedSubjectCode(subject.subject_code);
        setSuggestions([]);
    };

    const handleAddSubject = async () => {
        const codeToAdd = selectedSubjectCode || searchTerm; 
        
        if (!codeToAdd) {
            setToast({ message: "Please enter or select a subject.", type: 'error' });
            return;
        }

        try {
            
            let subjectCodeStart = codeToAdd.split(' - ')[0].trim().toUpperCase();

            await AdminAPI.createSchedule({
                subject: subjectCodeStart,
                section: selectedSection.section_name, 
                ...defaultSchedule
            });
            
            
            const details = await AdminAPI.getSectionLoadDetails(selectedSection.id);
            setStudyLoadDetails(Array.isArray(details) ? details : []);
            
            
            setSearchTerm('');
            setSelectedSubjectCode('');
            setToast({ message: "Subject added successfully!", type: 'success' });
        } catch (err) {
            console.error(err);
            if (err.message && (err.message.includes("already assigned") || err.status === 409)) {
                setToast({ message: "Warning: Subject already assigned to this section.", type: 'warning' });
            } else {
                setToast({ message: "Error adding subject: " + (err.message || "Unknown error"), type: 'error' });
            }
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm("Are you sure you want to CLEAR ALL subjects from this section's study load? This cannot be undone.")) return;
        try {
            await AdminAPI.clearSectionLoad(selectedSection.id);
            setStudyLoadDetails([]);
            setToast({ message: "Study load cleared successfully!", type: 'success' });
        } catch (err) {
            setToast({ message: "Failed to clear: " + err.message, type: 'error' });
        }
    };

    const handleDeleteSubject = async (studyLoadId) => {
        if (!window.confirm("Remove this subject from study load?")) return;
        try {
            await AdminAPI.deleteStudyLoad(studyLoadId);
            const details = await AdminAPI.getSectionLoadDetails(selectedSection.id);
            setStudyLoadDetails(Array.isArray(details) ? details : []);
            setToast({ message: "Subject removed successfully", type: 'success' });
        } catch (err) {
            setToast({ message: "Failed to delete: " + err.message, type: 'error' });
        }
    };

    
    const filteredSections = useMemo(() => (
        activeYear === 'All' 
            ? sections 
            : sections.filter(s => String(s.grade_level) === String(activeYear))
    ), [activeYear, sections]);
    
    const yearLevels = useMemo(() => ['1', '2', '3', '4'], []);

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    const formatTime = (timeStr) => {
        if (!timeStr || timeStr === '00:00:00' || timeStr === '00:00') return 'TBA';
        const [h, m] = timeStr.split(':');
        const hours = parseInt(h);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hrs = hours % 12 || 12;
        return `${hrs}:${m} ${ampm}`;
    };

    const [printingSem, setPrintingSem] = useState(null);

    

    const handleDownload = (sem) => {
        setPrintingSem(sem);
        setTimeout(() => {
            window.print();
            setPrintingSem(null); 
        }, 500);
    };

    
    const firstSemSubjects = useMemo(
        () => studyLoadDetails.filter(s => s.semester === 'First Semester' || s.semester === '1st Semester'),
        [studyLoadDetails]
    );
    const secondSemSubjects = useMemo(
        () => studyLoadDetails.filter(s => s.semester === 'Second Semester' || s.semester === '2nd Semester'),
        [studyLoadDetails]
    );
    const otherSubjects = useMemo(
        () => studyLoadDetails.filter(s =>
            !['First Semester', '1st Semester', 'Second Semester', '2nd Semester'].includes(s.semester)
        ),
        [studyLoadDetails]
    );

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
                        <th className="no-print" style={{ width: '60px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {detailsLoading ? (
                        <tr><td colSpan={4} className="text-center">Loading Data...</td></tr>
                    ) : subjects.length === 0 ? (
                        <tr><td colSpan={4} className="text-center empty">No subjects enrolled for this semester.</td></tr>
                    ) : (
                        subjects.map((sub, idx) => (
                            <tr key={idx}>
                                <td><CodeBadge>{sub.subject_code}</CodeBadge></td>
                                <td className="subject-title-cell">{sub.subject_title}</td>
                                <td style={{ textAlign: 'center' }}><strong>{sub.units}</strong></td>
                                <td className="no-print">
                                    <DeleteAction onClick={() => handleDeleteSubject(sub.id)} title="Remove Subject">
                                        <Trash2 size={16} />
                                    </DeleteAction>
                                </td>
                            </tr>
                        ))
                    )}
                    {!detailsLoading && subjects.length > 0 && (
                        <TotalRow>
                            <td colSpan={2} style={{ textAlign: 'right', paddingRight: '2rem' }}><strong>TOTAL UNITS ENROLLED:</strong></td>
                            <td style={{ textAlign: 'center' }}><strong>{subjects.reduce((sum, s) => sum + parseFloat(s.units || 0), 0)}</strong></td>
                            <td className="no-print"></td>
                        </TotalRow>
                    )}
                </tbody>
            </SubjectTable>
        </div>
    );

    if (selectedSection) {
        return (
            <DetailContainer>
                <DetailHeader className="no-print">
                    <BackButton onClick={handleBack}>
                        <ArrowLeft size={20} /> Back to Sections
                    </BackButton>
                </DetailHeader>

                <PrintContainer id="study-load-printable">
                    <PrintHeader>
                        <LogoSection>
                            <GraduationCap size={48} color="#0056b3" />
                        </LogoSection>
                        <HeaderText>
                            <h1>Talisay City College</h1>
                            <p>Poblacion, Talisay City, Cebu, 6045</p>
                            <h3>OFFICE OF THE REGISTRAR</h3>
                        </HeaderText>
                    </PrintHeader>

                    <DocumentTitleSection>
                        <h2>OFFICIAL STUDY LOAD</h2>
                        {printingSem && <div className="semester-badge">{printingSem}</div>}
                    </DocumentTitleSection>

                    <InfoGrid>
                        <InfoBox>
                            <label>STUDENT SECTION</label>
                            <span>{selectedSection.section_name}</span>
                        </InfoBox>
                         <InfoBox>
                            <label>YEAR LEVEL</label>
                            <span>{selectedSection.grade_level}{getOrdinal(selectedSection.grade_level)} Year</span>
                        </InfoBox>
                        <InfoBox $span={2}>
                            <label>COURSE & MAJOR</label>
                            <span>{selectedSection.course} {selectedSection.major ? `• ${selectedSection.major}` : ''}</span>
                        </InfoBox>
                        <InfoBox>
                            <label>ACADEMIC YEAR</label>
                            <span>2025 - 2026</span>
                        </InfoBox>
                        <InfoBox>
                            <label>DATE ISSUED</label>
                            <span>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </InfoBox>
                    </InfoGrid>

                    {}
                    <AssignmentCard className="no-print">
                        {}
                        <AssignmentHeader>
                            <PlusCircle size={20} />
                            <span>Assign Subjects</span>
                        </AssignmentHeader>
                        <AssignmentBody>
                            <SearchContainer>
                                <SearchInput 
                                    placeholder="Enter Subject Code (e.g. GE 101)" 
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                                {suggestions.length > 0 && (
                                    <SuggestionList>
                                        {suggestions.map(s => (
                                            <SuggestionItem key={s.id} onClick={() => handleSelectSuggestion(s)}>
                                                <strong>{s.subject_code}</strong> - {s.subject_name}
                                            </SuggestionItem>
                                        ))}
                                    </SuggestionList>
                                )}
                            </SearchContainer>
                            <Button onClick={handleAddSubject}>Add Subject</Button>
                            <OutlineButton onClick={handleClearAll} style={{color:'#ef4444', borderColor:'#ef4444'}}>
                                Clear All
                            </OutlineButton>
                        </AssignmentBody>
                    </AssignmentCard>

                    {renderSubjectTable(firstSemSubjects, 'First Semester', 'First Semester')}
                    {renderSubjectTable(secondSemSubjects, 'Second Semester', 'Second Semester')}
                    {otherSubjects.length > 0 && renderSubjectTable(otherSubjects, 'Other', 'Other Subjects')}

                    <SignatureSection>
                        <div className="sig-block">
                            <div className="line"></div>
                            <span>Registrar Signature</span>
                        </div>
                        <div className="sig-block">
                            <div className="line"></div>
                            <span>Authorized Personnel</span>
                        </div>
                    </SignatureSection>

                    <OfficialSeal>
                        <p>NOT VALID WITHOUT OFFICIAL SEAL</p>
                    </OfficialSeal>
                </PrintContainer>

                <style>{`
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
                            box-shadow: none;
                            border: none;
                        }
                        .no-print { display: none !important; }
                        .hidden-print { display: none !important; }
                        @page { size: auto; margin: 15mm; }
                    }
                `}</style>
            </DetailContainer>
        );
    }

    return (
        <Container>
            <Header>
                <div>
                    <h2><BookOpen size={32} /> Study Load Management</h2>
                    <p>Manage and view study loads by section</p>
                </div>
            </Header>

            <FilterBar>
                <FilterButton active={activeYear === 'All'} onClick={() => setActiveYear('All')}>
                    All Levels
                </FilterButton>
                {yearLevels.map(y => (
                    <FilterButton key={y} active={activeYear === y} onClick={() => setActiveYear(y)}>
                        {y}{getOrdinal(y)} Year
                    </FilterButton>
                ))}
            </FilterBar>

            {loading ? (
                <PageSkeleton variant="cards" count={4} />
            ) : filteredSections.length === 0 ? (
                <EmptyState>
                    <AlertCircle size={48} />
                    <p>No sections found for this year level.</p>
                </EmptyState>
            ) : (
                <Grid>
                    {filteredSections.map(section => (
                        <SectionCard key={section.id} onClick={() => handleSectionClick(section)}>
                            <CardHeader>
                                <SectionName>{section.section_name}</SectionName>
                                <StatusBadge $assigned={section.status === 'Assigned'}>
                                    {section.status === 'Assigned' ? 'Assigned' : 'Not Assigned'}
                                </StatusBadge>
                            </CardHeader>
                            <CardBody>
                                <DetailRow>
                                    <GraduationCap size={16} />
                                    <span>{section.course} {section.major}</span>
                                </DetailRow>
                                <DetailRow>
                                    <Layers size={16} />
                                    <span>{section.grade_level}{getOrdinal(section.grade_level)} Year</span>
                                </DetailRow>
                                <DetailRow>
                                    <BookOpen size={16} />
                                    <span>{section.subject_count} Subjects</span>
                                </DetailRow>
                            </CardBody>
                            <ClickHint>Click to view details</ClickHint>
                        </SectionCard>
                    ))}
                </Grid>
            )}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </Container>
    );
};

const Container = styled.div`
  max-width: 1400px; margin: 0 auto; animation: fadeIn 0.4s ease-out;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  display: flex; align-items: center; justify-content: space-between;
  h2 { font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 12px; svg { color: var(--accent-primary); } }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`;

const FilterBar = styled.div`
    display: flex; gap: 10px; margin-bottom: 2rem; overflow-x: auto; padding-bottom: 5px;
`;

const FilterButton = styled.button`
    padding: 8px 16px; border-radius: 20px; font-weight: 600; border: 1px solid var(--border-color); background: ${props => props.active ? 'var(--accent-primary)' : 'var(--bg-secondary)'}; color: ${props => props.active ? 'white' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s; white-space: nowrap;
    &:hover { transform: translateY(-1px); }
`;

const Grid = styled.div`
    display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;
`;

const SectionCard = styled.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 16px; padding: 1.5rem; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden;
    &:hover { transform: translateY(-4px); box-shadow: var(--shadow-md); border-color: var(--accent-primary); }
`;

const CardHeader = styled.div`
    display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;
`;

const SectionName = styled.h3`
    margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary);
`;

const StatusBadge = styled.span`
    font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; font-weight: 600;
    background: ${props => props.$assigned ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-tertiary)'};
    color: ${props => props.$assigned ? '#10b981' : 'var(--text-secondary)'};
`;

const CardBody = styled.div`
    display: flex; flex-direction: column; gap: 0.75rem;
`;

const DetailRow = styled.div`
    display: flex; align-items: center; gap: 10px; color: var(--text-secondary); font-size: 0.95rem; svg { opacity: 0.7; }
`;

const ClickHint = styled.div`
    margin-top: 1.5rem; font-size: 0.8rem; color: var(--accent-primary); font-weight: 600; text-align: right; opacity: 0; transition: opacity 0.2s;
    ${SectionCard}:hover & { opacity: 1; }
`;

const EmptyState = styled.div` padding: 3rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; color: var(--text-secondary); svg { opacity: 0.5; } `;

const DetailContainer = styled.div`
    max-width: 1000px; margin: 0 auto; background: var(--bg-primary); min-height: 80vh;
`;

const DetailHeader = styled.div`
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;
`;

const BackButton = styled.button`
    display: flex; align-items: center; gap: 8px; background: none; border: none; color: var(--text-secondary); font-weight: 600; cursor: pointer; font-size: 1rem;
    &:hover { color: var(--text-primary); }
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
    margin: 0 auto;

    @media print { 
        box-shadow: none; 
        padding: 0; 
        border: none;
        max-width: 100%;
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
`;

const HeaderText = styled.div`
    h1 { font-size: 2.2rem; font-weight: 900; margin: 0; color: #003366; letter-spacing: -0.5px; }
    p { font-size: 0.9rem; color: #64748b; margin: 5px 0; font-weight: 500; }
    h3 { font-size: 1.1rem; font-weight: 700; margin: 10px 0 0 0; color: #0056b3; text-transform: uppercase; letter-spacing: 2px; }
`;

const DocumentTitleSection = styled.div`
    text-align: center;
    margin-bottom: 3rem;
    h2 { font-size: 1.8rem; font-weight: 900; color: #1e293b; margin: 0; border-bottom: 2px solid #334155; display: inline-block; padding-bottom: 5px; }
    .semester-badge { 
        margin-top: 15px; 
        font-size: 1rem; 
        font-weight: 700; 
        color: #007bff; 
        text-transform: uppercase;
    }
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 4rem;
    background: #f8fafc;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
`;

const InfoBox = styled.div`
    grid-column: span ${props => props.$span || 1};
    display: flex;
    flex-direction: column;
    gap: 5px;
    
    label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    span { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
`;

const TableHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
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
    padding: 10px 20px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 0.9rem;
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
        font-size: 0.8rem;
        font-weight: 800;
        text-transform: uppercase;
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
    }

    td {
        padding: 1.25rem 1rem;
        font-size: 1rem;
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
    padding: 5px 10px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 0.9rem;
    color: #0056b3;
    border: 1px solid #e2e8f0;
`;

const DeleteAction = styled.button`
    background: none;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    transition: all 0.2s;
    &:hover { background: #fee2e2; transform: scale(1.1); }
`;

const TotalRow = styled.tr`
    background: #f8fafc;
    td { border-top: 2px solid #0f172a !important; border-bottom: none !important; }
`;

const SignatureSection = styled.div`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4rem;
    margin-top: 5rem;
    padding-top: 2rem;

    .sig-block {
        text-align: center;
        .line { border-bottom: 2px solid #1e293b; margin-bottom: 10px; }
        span { font-size: 0.9rem; font-weight: 700; text-transform: uppercase; color: #475569; }
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
        font-size: 0.8rem;
        letter-spacing: 2px;
    }
`;

const AssignmentCard = styled.div`
    background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;
    box-shadow: var(--shadow-sm);
`;

const AssignmentHeader = styled.div`
    display: flex; align-items: center; gap: 10px; margin-bottom: 1rem; color: var(--text-primary); font-weight: 700; font-size: 1.1rem;
`;

const AssignmentBody = styled.div`
    display: flex; align-items: center; gap: 10px;
`;

const SearchContainer = styled.div`
    flex: 1; position: relative;
`;

const SearchInput = styled.input`
    width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);
`;

const SuggestionList = styled.div`
    position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-primary); 
    border: 1px solid var(--border-color); border-radius: 8px; 
    margin-top: 5px; max-height: 200px; overflow-y: auto; z-index: 1000;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`;

const SuggestionItem = styled.div`
    padding: 10px 15px; cursor: pointer; color: var(--text-primary); border-bottom: 1px solid var(--border-color);
    &:hover { background: var(--bg-tertiary); }
    &:last-child { border-bottom: none; }
`;

const Button = styled.button`
    padding: 12px 20px; border-radius: 8px; border: none; background: var(--accent-primary); color: white; font-weight: 600; cursor: pointer; white-space: nowrap;
    &:hover { background: var(--accent-highlight); }
`;

const OutlineButton = styled.button`
    padding: 12px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary); font-weight: 600; cursor: pointer; white-space: nowrap;
    &:hover { background: var(--bg-tertiary); }
`;

export default StudyLoadView;
