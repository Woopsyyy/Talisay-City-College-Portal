import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { AdminAPI } from '../../../services/api';
import { YEAR_LEVEL_OPTIONS, COURSE_MAJOR_CONFIG } from '../../../Utils/constants';
import { Layers, PlusCircle, Edit2, Trash2, Save, X, LayoutGrid, AlertCircle, Calendar, XCircle, Building2, BookOpen } from 'lucide-react';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import PageSkeleton from '../../loaders/PageSkeleton';

const SectionsView = () => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editSectionRow, setEditSectionRow] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        id: null,
        name: ''
    });

    
    const [formData, setFormData] = useState({
        grade_level: '',
        section_name: '',
        school_year: '2025-2026',
        course: '',
        major: ''
    });

    useEffect(() => {
        fetchSections();
    }, []);

    useEffect(() => {
        if (editSectionRow) {
            setFormData({
                grade_level: editSectionRow.grade_level || editSectionRow.year || '',
                section_name: editSectionRow.section_name || editSectionRow.name || '',
                school_year: editSectionRow.school_year || '2025-2026',
                course: editSectionRow.course || '',
                major: editSectionRow.major || ''
            });
            setIsModalOpen(true);
        } else {
            setFormData({
                grade_level: '',
                section_name: '',
                school_year: '2025-2026',
                course: '',
                major: ''
            });
        }
    }, [editSectionRow]);

    const fetchSections = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getSections();
            setSections(data || []);
        } catch (err) {
            console.error("Error fetching sections:", err);
            setToast({ show: true, message: "Failed to load sections.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            
            if (name === 'course') {
                return { ...prev, [name]: value, major: '' };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleCreateClick = () => {
        setEditSectionRow(null);
        setFormData({ grade_level: '', section_name: '', school_year: '2025-2026', course: '', major: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (section) => {
        setEditSectionRow(section); 
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditSectionRow(null);
        setFormData({ grade_level: '', section_name: '', school_year: '2025-2026', course: '', major: '' });
    };

    const handleDelete = (id, name) => {
        setDeleteModal({
            isOpen: true,
            id,
            name
        });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, id: null, name: '' });
    };

    const confirmDelete = async () => {
        if (!deleteModal.id) return;
        
        try {
            await AdminAPI.deleteSection(deleteModal.id);
            
            fetchSections();
            setToast({ show: true, message: "Section deleted successfully", type: 'success' });
            closeDeleteModal();
        } catch (err) {
            setToast({ show: true, message: `Error deleting section: ${err.message}`, type: 'error' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            
            const payload = { ...formData };
            if (!payload.school_year) payload.school_year = '2025-2026';

            if (editSectionRow) {
                await AdminAPI.updateSection(editSectionRow.id, payload);
                setToast({ show: true, message: "Section updated successfully!", type: 'success' });
            } else {
                await AdminAPI.createSection(payload);
                setToast({ show: true, message: "Section created successfully!", type: 'success' });
            }
            handleCloseModal();
            fetchSections();
        } catch (err) {
            setToast({ show: true, message: `Error ${editSectionRow ? "updating" : "creating"} section: ${err.message}`, type: 'error' });
        }
    };

    const sectionsByYear = useMemo(() => sections.reduce((acc, section) => {
        const year = section.grade_level || section.year || 'Unknown';
        if (!acc[year]) acc[year] = [];
        acc[year].push(section);
        return acc;
    }, {}), [sections]);

    const getYearLabel = (yearNum) => {
        switch (String(yearNum)) {
            case '1': return '1st Year';
            case '2': return '2nd Year';
            case '3': return '3rd Year';
            case '4': return '4th Year';
            default: return `Grade ${yearNum}`;
        }
    };

    return (
        <StyledContainer>
            <HeaderSection>
                <div>
                    <h2><Layers size={32} /> Sections</h2>
                    <p>Create and manage academic sections for each year level.</p>
                </div>
                <Button onClick={handleCreateClick}>
                    <PlusCircle size={18} /> Create New Section
                </Button>
            </HeaderSection>
            
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(prev => ({ ...prev, show: false }))} 
                />
            )}

            {loading ? (
                <PageSkeleton variant="cards" count={4} />
            ) : sections.length === 0 ? (
                <MainCard>
                    <CardBody className="text-center py-5">
                         <AlertCircle size={48} className="text-secondary mb-3" />
                         <p className="text-secondary">No sections created yet.</p>
                         <Button onClick={handleCreateClick} className="mt-3">
                            Create First Section
                         </Button>
                    </CardBody>
                </MainCard>
            ) : (
                <div className="d-flex flex-column gap-4">
                    {Object.keys(sectionsByYear).sort().map(yearNum => (
                        <MainCard key={yearNum}>
                            <CardHeader>
                                <Calendar size={20} />
                                <h3>{getYearLabel(yearNum)}</h3>
                            </CardHeader>
                            <CardBody>
                                <SectionGrid>
                                    {sectionsByYear[yearNum].map(section => {
                                        const name = section.section_name || section.name || "";
                                        const firstLetter = name.trim().charAt(0).toUpperCase() || "?";
                                        return (
                                            <SectionCard key={section.id}>
                                                <SectionIcon>{firstLetter}</SectionIcon>
                                                <SectionInfo>
                                                    <h5>{name}</h5>
                                                    <small>{getYearLabel(yearNum)} • {section.school_year}</small>
                                                    {(section.course || section.major) && (
                                                        <CourseInfo>
                                                            {section.course && <span><Building2 size={12} /> {section.course}</span>}
                                                            {section.major && <span><BookOpen size={12} /> {section.major}</span>}
                                                        </CourseInfo>
                                                    )}
                                                </SectionInfo>
                                                <Actions>
                                                    <IconButton onClick={() => handleEdit(section)}>
                                                        <Edit2 size={16} />
                                                    </IconButton>
                                                    <IconButton danger onClick={() => handleDelete(section.id, name)}>
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </Actions>
                                            </SectionCard>
                                        );
                                    })}
                                </SectionGrid>
                            </CardBody>
                        </MainCard>
                    ))}
                </div>
            )}

            {}
            {isModalOpen && (
                <ModalOverlay onClick={handleCloseModal}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <h3><LayoutGrid size={20} /> {editSectionRow ? "Edit Section" : "Create New Section"}</h3>
                            <CloseButton onClick={handleCloseModal}><X size={20} /></CloseButton>
                        </ModalHeader>
                        <form onSubmit={handleSubmit}>
                            <ModalBody>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <FormGroup>
                                            <label><Calendar size={16} /> Grade Level</label>
                                            <Select
                                                name="grade_level"
                                                value={formData.grade_level}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select Grade...</option>
                                                {YEAR_LEVEL_OPTIONS.map(y => (
                                                    <option key={y} value={y}>{getYearLabel(y)}</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-6">
                                        <FormGroup>
                                            <label><Layers size={16} /> Section Name</label>
                                            <Input
                                                name="section_name"
                                                placeholder="e.g. Power, Benevolence"
                                                value={formData.section_name}
                                                onChange={handleInputChange}
                                                required
                                                autoComplete="off"
                                            />
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-6">
                                        <FormGroup>
                                            <label><Building2 size={16} /> Department/Course</label>
                                            <Select
                                                name="course"
                                                value={formData.course}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Select Department...</option>
                                                {Object.keys(COURSE_MAJOR_CONFIG).map(dept => (
                                                    <option key={dept} value={dept}>{dept}</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-6">
                                        <FormGroup>
                                            <label><BookOpen size={16} /> Major</label>
                                            <Select
                                                name="major"
                                                value={formData.major}
                                                onChange={handleInputChange}
                                                disabled={!formData.course}
                                            >
                                                <option value="">Select Major...</option>
                                                {formData.course && COURSE_MAJOR_CONFIG[formData.course]?.map(major => (
                                                    <option key={major} value={major}>{major}</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    {}
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <OutlineButton type="button" onClick={handleCloseModal}>
                                    <XCircle size={18} /> Cancel
                                </OutlineButton>
                                <Button type="submit">
                                    <Save size={18} /> {editSectionRow ? "Update Section" : "Create Section"}
                                </Button>
                            </ModalFooter>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}
            <DeleteModal
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                title="Delete Section"
                message="Are you sure you want to delete this section? This action cannot be undone."
                itemName={deleteModal.name}
            />
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

const FormGroup = styled.div`
  margin-bottom: 0.5rem;
  label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
  }
`;

const Input = styled.input`
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); outline: none; }
`;

const Select = styled.select`
    width: 100%;
    padding: 12px 16px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); outline: none; }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: var(--accent-highlight); transform: translateY(-1px); }
`;

const OutlineButton = styled.button`
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    color: var(--text-primary);
    cursor: pointer;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
    &:hover { background: var(--bg-tertiary); }
`;

const SectionGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
`;

const SectionCard = styled.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: transform 0.2s, box-shadow 0.2s;
    &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
        border-color: var(--accent-primary);
    }
`;

const SectionIcon = styled.div`
    width: 50px;
    height: 50px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent-primary), var(--accent-highlight));
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
`;

const SectionInfo = styled.div`
    flex: 1;
    h5 { margin: 0 0 4px; font-size: 1.1rem; color: var(--text-primary); font-weight: 700; }
    small { color: var(--text-secondary); }
`;

const CourseInfo = styled.div`
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-wrap: wrap;
    
    span {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
        
        svg {
            flex-shrink: 0;
            color: var(--accent-primary);
        }
    }
`;

const Actions = styled.div`
    display: flex;
    gap: 8px;
`;

const IconButton = styled.button`
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: transparent;
    color: ${props => props.danger ? '#ef4444' : 'var(--accent-primary)'};
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { 
        background: ${props => props.danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
        border-color: ${props => props.danger ? '#fecaca' : '#bae6fd'};
    }
`;


const ModalOverlay = styled.div`
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
`;

const ModalContent = styled.div`
    background: var(--bg-secondary);
    width: 90%; max-width: 600px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    border: 1px solid var(--border-color); /* Extra redundancy for safety */
`;

const ModalHeader = styled.div`
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    display: flex; justify-content: space-between; align-items: center;
    background: var(--bg-tertiary);
    border-radius: 16px 16px 0 0;
    h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
`;

const ModalBody = styled.div`
    padding: 1.5rem;
`;

const ModalFooter = styled.div`
    padding: 1.25rem 1.5rem;
    border-top: 1px solid var(--border-color);
    display: flex; justify-content: flex-end; gap: 1rem;
    background: var(--bg-tertiary);
    border-radius: 0 0 16px 16px;
`;

const CloseButton = styled.button`
    background: transparent; border: none; color: var(--text-secondary); cursor: pointer;
    &:hover { color: var(--text-primary); }
`;

export default SectionsView;

