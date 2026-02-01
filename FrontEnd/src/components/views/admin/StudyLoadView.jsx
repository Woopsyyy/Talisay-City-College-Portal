import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { AdminAPI } from '../../../services/api';
import Toast from '../../common/Toast';
import { BookOpen, GraduationCap, Download, Layers, Calendar, ArrowLeft, Hash, Users, Clock, AlertCircle, PlusCircle, Trash2, Search, Save } from 'lucide-react';

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
    
    
    const defaultSchedule = {
        day: 'Monday', 
        time_start: '00:00',
        time_end: '00:00',
        building: 'Main',
        room: 'TBA'
    };

    useEffect(() => {
        fetchSections();
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
        
        if (term.length > 0) {
            const filtered = allSubjects.filter(s => 
                s.subject_code.toLowerCase().includes(term.toLowerCase()) || 
                s.subject_name.toLowerCase().includes(term.toLowerCase())
            );
            setSuggestions(filtered.slice(0, 10)); 
        } else {
            setSuggestions([]);
        }
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

    const handleDeleteSubject = async (scheduleId) => {
        if (!window.confirm("Remove this subject from study load?")) return;
        try {
            await AdminAPI.deleteSchedule(scheduleId);
            const details = await AdminAPI.getSectionLoadDetails(selectedSection.id);
            setStudyLoadDetails(Array.isArray(details) ? details : []);
            setToast({ message: "Subject removed successfully", type: 'success' });
        } catch (err) {
            setToast({ message: "Failed to delete: " + err.message, type: 'error' });
        }
    };

    
    const filteredSections = activeYear === 'All' 
        ? sections 
        : sections.filter(s => String(s.grade_level) === String(activeYear));
    
    const yearLevels = ['1', '2', '3', '4'];

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

    
    const firstSemSubjects = studyLoadDetails.filter(s => s.semester === 'First Semester' || s.semester === '1st Semester');
    const secondSemSubjects = studyLoadDetails.filter(s => s.semester === 'Second Semester' || s.semester === '2nd Semester');
    const otherSubjects = studyLoadDetails.filter(s => 
        !['First Semester', '1st Semester', 'Second Semester', '2nd Semester'].includes(s.semester)
    );

    const renderSubjectTable = (subjects, validSem, title) => (
        <div className={`printable-section ${printingSem && printingSem !== validSem ? 'hidden-print' : ''}`}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'2rem', marginBottom:'1rem'}}>
                <h3 className="section-header">{title}</h3>
                <DownloadButton onClick={() => handleDownload(validSem)} disabled={subjects.length === 0} className="no-print">
                    <Download size={20} /> Download {title}
                </DownloadButton>
            </div>
            
            <SubjectTable>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Units</th>
                        <th>Days</th>
                        <th>Time</th>
                        <th>Instructor</th>
                        <th className="no-print" style={{ width: '50px' }}></th>
                    </tr>
                </thead>
                <tbody>
                    {detailsLoading ? (
                        <tr><td colSpan="7" className="text-center">Loading...</td></tr>
                    ) : subjects.length === 0 ? (
                        <tr><td colSpan="7" className="text-center empty">No subjects assigned for {title}.</td></tr>
                    ) : (
                        subjects.map((sub, idx) => (
                            <tr key={idx}>
                                <td><Code>{sub.subject_code}</Code></td>
                                <td>{sub.subject_title}</td>
                                <td>{sub.units}</td>
                                <td>{sub.day_of_week === 'Monday' && sub.time_start === '00:00:00' ? 'TBA' : (sub.day_of_week || 'TBA')}</td>
                                <td>{formatTime(sub.time_start) === 'TBA' ? 'TBA' : `${formatTime(sub.time_start)} - ${formatTime(sub.time_end)}`}</td>
                                <td>{sub.teacher || 'TBA'}</td>
                                <td className="no-print">
                                    <DeleteButton onClick={() => handleDeleteSubject(sub.id)} title="Remove Subject">
                                        <Trash2 size={16} />
                                    </DeleteButton>
                                </td>
                            </tr>
                        ))
                    )}
                    {!detailsLoading && subjects.length > 0 && (
                        <TotalRow>
                            <td colSpan="2"><strong>Total Units</strong></td>
                            <td><strong>{subjects.reduce((sum, s) => sum + parseFloat(s.units || 0), 0)}</strong></td>
                            <td colSpan="4"></td>
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

                <PrintableArea>
                    <DocHeader>
                        <h1>Talisay City College</h1>
                        <h3>Office of the Registrar</h3>
                        <h2>Official Study Load</h2>
                        {printingSem && <h3 style={{marginTop:'5px', color:'#555'}}>{printingSem}</h3>}
                    </DocHeader>

                    <SectionInfoCard>
                        <InfoRow>
                            <InfoLabel>Section:</InfoLabel>
                            <InfoValue>{selectedSection.section_name}</InfoValue>
                        </InfoRow>
                         <InfoRow>
                            <InfoLabel>Year Level:</InfoLabel>
                            <InfoValue>{selectedSection.grade_level} Year</InfoValue>
                        </InfoRow>
                        <InfoRow>
                            <InfoLabel>Course/Major:</InfoLabel>
                            <InfoValue>{selectedSection.course} {selectedSection.major ? `(${selectedSection.major})` : ''}</InfoValue>
                        </InfoRow>
                    </SectionInfoCard>

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

                    <FooterNote>
                        <p>This document serves as an official copy of the study load for the specified section.</p>
                        <p>Generated on {new Date().toLocaleDateString()}</p>
                    </FooterNote>
                </PrintableArea>

                <style>{`
                    .section-header { font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0; }
                    @media print {
                        .no-print { display: none !important; }
                        .hidden-print { display: none !important; }
                        body { background: white; margin: 0; padding: 20px; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
                <LoadingState>Loading sections...</LoadingState>
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

const LoadingState = styled.div` padding: 3rem; text-align: center; color: var(--text-secondary); `;
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

const DownloadButton = styled.button`
    display: flex; align-items: center; gap: 8px; background: var(--accent-primary); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;
    &:hover { background: var(--accent-highlight); }
    &:disabled { background: var(--bg-tertiary); color: var(--text-secondary); cursor: not-allowed; }
`;

const DeleteButton = styled.button`
    background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center;
    &:hover { background: rgba(239, 68, 68, 0.1); }
`;

const PrintableArea = styled.div`
    background: white; padding: 3rem; border-radius: 8px; box-shadow: var(--shadow-sm); color: black;
    @media print { box-shadow: none; padding: 0; }
`;

const DocHeader = styled.div`
    text-align: center; margin-bottom: 2.5rem; border-bottom: 2px solid #eee; padding-bottom: 1.5rem;
    h1 { font-size: 1.8rem; font-weight: 800; margin: 0 0 5px 0; color: #111; }
    h3 { font-size: 1.1rem; font-weight: 500; margin: 0 0 10px 0; color: #555; }
    h2 { font-size: 1.4rem; font-weight: 700; margin: 10px 0 0 0; color: #333; text-transform: uppercase; letter-spacing: 1px; }
`;

const SectionInfoCard = styled.div`
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem; background: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px solid #eee;
`;

const InfoRow = styled.div` display: flex; flex-direction: column; `;
const InfoLabel = styled.span` font-size: 0.8rem; text-transform: uppercase; color: #666; font-weight: 600; `;
const InfoValue = styled.span` font-size: 1.1rem; font-weight: 700; color: #111; `;

const SubjectTable = styled.table`
    width: 100%; border-collapse: collapse; margin-bottom: 2rem;
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; color: #333; }
    td { font-size: 0.95rem; color: #111; }
    tr.empty td { height: 100px; vertical-align: middle; color: #999; }
`;

const Code = styled.span` font-family: monospace; font-weight: 600; `;
const TotalRow = styled.tr` background: #f9fafb; td { font-weight: 700; } `;

const FooterNote = styled.div`
    margin-top: 3rem; font-size: 0.8rem; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 1rem;
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
