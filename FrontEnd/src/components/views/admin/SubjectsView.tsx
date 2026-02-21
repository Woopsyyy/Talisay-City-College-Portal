import React, { useState, useEffect, useMemo } from 'react';
import baseStyled from 'styled-components';
const styled = baseStyled as any;
import { AdminAPI } from '../../../services/api';
import { COURSE_MAJOR_CONFIG, SEMESTER_OPTIONS, YEAR_LEVEL_OPTIONS } from '../../../utils/constants';
import { formatOrdinal } from '../../../utils/formatting';
import { BookOpen, PlusCircle, Trash2, Edit2, Search, Filter, Book, Hash, GraduationCap, Calendar, Clock, Save, XCircle, X } from 'lucide-react';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import PageSkeleton from '../../loaders/PageSkeleton';

const SubjectsView = () => {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editSubjectRow, setEditSubjectRow] = useState(null);

    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState(null);

    
    const [formData, setFormData] = useState({
        subject_code: '',
        subject_name: '',
        units: '',
        course: '',
        major: '',
        year_level: '',
        semester: 'All Semesters'
    });

    
    const [filters, setFilters] = useState({
        course: '',
        major: '',
        year: '',
        semester: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 200);

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (editSubjectRow) {
            setFormData({
                subject_code: editSubjectRow.subject_code || '',
                subject_name: editSubjectRow.subject_name || '',
                units: editSubjectRow.units || '',
                course: editSubjectRow.course || '',
                major: editSubjectRow.major || '',
                year_level: editSubjectRow.year_level || '',
                semester: editSubjectRow.semester || 'All Semesters'
            });
        } else {
            setFormData({
                subject_code: '',
                subject_name: '',
                units: '',
                course: '',
                major: '',
                year_level: '',
                semester: 'All Semesters'
            });
        }
    }, [editSubjectRow]);

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getSubjects();
            
            setSubjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching subjects:", err);
            setSubjects([]); 
            setToast({ show: true, message: "Failed to load subjects.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'course') {
                newData.major = ''; 
            }
            return newData;
        });
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const openAddModal = () => {
        setEditSubjectRow(null);
        setIsModalOpen(true);
    };

    const openEditModal = (subject) => {
        setEditSubjectRow(subject);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditSubjectRow(null);
    };

    const openDeleteModal = (subject) => {
        setSubjectToDelete(subject);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setSubjectToDelete(null);
    };

    const confirmDelete = async () => {
        if (!subjectToDelete) return;
        try {
            await AdminAPI.deleteSubject(subjectToDelete.id);
            setSubjects(prev => prev.filter(s => s.id !== subjectToDelete.id));
            setToast({ show: true, message: "Subject deleted successfully", type: 'success' });
            closeDeleteModal();
        } catch (err) {
            setToast({ show: true, message: `Error deleting subject: ${err.message}`, type: 'error' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                units: parseFloat(formData.units) || 0,
                year_level: parseInt(formData.year_level),
            };

            if (editSubjectRow) {
                await AdminAPI.updateSubject(editSubjectRow.id, payload);
                setToast({ show: true, message: "Subject updated successfully!", type: 'success' });
            } else {
                await AdminAPI.createSubject(payload);
                setToast({ show: true, message: "Subject created successfully!", type: 'success' });
            }
            closeModal();
            fetchSubjects();
        } catch (err) {
            setToast({ show: true, message: `Error ${editSubjectRow ? "updating" : "creating"} subject: ${err.message}`, type: 'error' });
        }
    };

    
    const filteredSubjects = useMemo(() => subjects.filter(subject => {
        const q = debouncedSearchTerm.trim().toLowerCase();
        if (q) {
            const code = (subject.subject_code || '').toLowerCase();
            const name = (subject.subject_name || subject.title || '').toLowerCase();
            if (!code.includes(q) && !name.includes(q)) return false;
        }
        if (filters.course && subject.course !== filters.course) return false;
        if (filters.major && subject.major !== filters.major) return false;
        if (filters.year && parseInt(subject.year_level) !== parseInt(filters.year)) return false;
        if (filters.semester && subject.semester !== filters.semester) return false;
        return true;
    }), [subjects, debouncedSearchTerm, filters.course, filters.major, filters.year, filters.semester]);

    const getMajorsForCourse = (courseValue) => {
        if (!courseValue || courseValue === 'All Courses') return [];
        return COURSE_MAJOR_CONFIG[courseValue] || [];
    };

    const allMajors = useMemo(() => {
        const all = [];
        Object.values(COURSE_MAJOR_CONFIG).forEach(majors => {
            majors.forEach(m => {
                if (!all.includes(m)) all.push(m);
            });
        });
        return all;
    }, []);

    const currentFormMajors = useMemo(
        () => getMajorsForCourse(formData.course),
        [formData.course]
    );
    const filterMajors = useMemo(
        () => (filters.course ? getMajorsForCourse(filters.course) : allMajors),
        [filters.course, allMajors]
    );

    return (
        <StyledContainer>
            <HeaderSection>
                <div>
                    <h2><BookOpen size={32} /> Subject Catalog</h2>
                    <p>Centralize subject codes, titles, and units to avoid typos when building study loads.</p>
                </div>
                <CreateButton onClick={openAddModal}>
                    <PlusCircle size={20} /> Add Subject
                </CreateButton>
            </HeaderSection>
            
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(prev => ({ ...prev, show: false }))} 
                />
            )}

            <MainCard>
                <CardHeader>
                        <div className="d-flex align-items-center gap-2">
                        <Filter size={20} />
                        <h3>Subject List <span className="text-secondary opacity-75">({filteredSubjects.length})</span></h3>
                    </div>
                </CardHeader>
                
                <div className="p-3 border-bottom border-light">
                        <div className="row g-2">
                        <div className="col-12 col-md-4">
                            <Input
                                placeholder="Search code or title..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="col-12 col-md-2">
                            <Select
                                name="course"
                                value={filters.course}
                                onChange={handleFilterChange}
                                className="sm"
                            >
                                <option value="">All Courses</option>
                                {Object.keys(COURSE_MAJOR_CONFIG).map(key => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 col-md-2">
                            <Select
                                name="major"
                                value={filters.major}
                                onChange={handleFilterChange}
                                className="sm"
                            >
                                <option value="">All Majors</option>
                                {filterMajors.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 col-md-2">
                                <Select
                                name="year"
                                value={filters.year}
                                onChange={handleFilterChange}
                                className="sm"
                            >
                                <option value="">All Years</option>
                                {YEAR_LEVEL_OPTIONS.map(y => (
                                    <option key={y} value={y}>{formatOrdinal(y)} Year</option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 col-md-2">
                            <Select
                                name="semester"
                                value={filters.semester}
                                onChange={handleFilterChange}
                                className="sm"
                            >
                                <option value="">All Semesters</option>
                                    {SEMESTER_OPTIONS.map(sem => (
                                    <option key={sem} value={sem}>{sem}</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>

                <CardBody className="p-0">
                    <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <Table>
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Title</th>
                                    <th>Units</th>
                                    <th>Details</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5}><PageSkeleton variant="table" compact columns={5} /></td></tr>
                                ) : filteredSubjects.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-5 text-secondary">No subjects found matching your filters.</td></tr>
                                ) : (
                                    filteredSubjects.map(subject => (
                                        <tr key={subject.id}>
                                            <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{subject.subject_code}</td>
                                            <td>{subject.subject_name}</td>
                                            <td style={{ fontFamily: 'monospace' }}>{subject.units}</td>
                                            <td>
                                                <div className="text-secondary small">
                                                    <div>{subject.course} {subject.major && `(${subject.major})`}</div>
                                                    <div>{formatOrdinal(subject.year_level)} Year • {subject.semester === 'First Semester' ? '1st' : subject.semester === 'Second Semester' ? '2nd' : 'All'} Sem</div>
                                                </div>
                                            </td>
                                            <td className="text-end">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <IconButton onClick={() => openEditModal(subject)}>
                                                        <Edit2 size={16} />
                                                    </IconButton>
                                                    <IconButton danger onClick={() => openDeleteModal(subject)}>
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </CardBody>
            </MainCard>

            {}
            {isModalOpen && (
                <ModalOverlay onClick={closeModal}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <h3>{editSubjectRow ? "Edit Subject" : "Add New Subject"}</h3>
                            <CloseButton onClick={closeModal}><X size={24} /></CloseButton>
                        </ModalHeader>
                        <form onSubmit={handleSubmit}>
                            <ModalBody>
                                <FormGroup>
                                    <label><Hash size={16} /> Subject Code</label>
                                    <Input
                                        name="subject_code"
                                        placeholder="e.g. IT101"
                                        value={formData.subject_code}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </FormGroup>

                                <FormGroup>
                                    <label><Book size={16} /> Descriptive Title</label>
                                    <Input
                                        name="subject_name"
                                        placeholder="Introduction to Computing"
                                        value={formData.subject_name}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </FormGroup>

                                <div className="row g-3">
                                    <div className="col-12 col-md-4">
                                        <FormGroup>
                                            <label><Clock size={16} /> Units</label>
                                            <Input
                                                name="units"
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={formData.units}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </FormGroup>
                                    </div>
                                    <div className="col-12 col-md-8">
                                            <FormGroup>
                                            <label><GraduationCap size={16} /> Course</label>
                                            <Select
                                                name="course"
                                                value={formData.course}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select course...</option>
                                                <option value="All Courses">All Courses</option>
                                                {Object.keys(COURSE_MAJOR_CONFIG).map(key => (
                                                    <option key={key} value={key}>{key}</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <FormGroup>
                                            <label>Major</label>
                                            <Select
                                                name="major"
                                                value={formData.major}
                                                onChange={handleInputChange}
                                                disabled={!formData.course || currentFormMajors.length === 0}
                                            >
                                                <option value="">Select major...</option>
                                                {currentFormMajors.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <FormGroup>
                                            <label>Year</label>
                                            <Select
                                                name="year_level"
                                                value={formData.year_level}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Select...</option>
                                                {YEAR_LEVEL_OPTIONS.map(y => (
                                                    <option key={y} value={y}>{formatOrdinal(y)}</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-6 col-md-3">
                                        <FormGroup>
                                            <label>Sem</label>
                                            <Select
                                                name="semester"
                                                value={formData.semester}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="All Semesters">All</option>
                                                {SEMESTER_OPTIONS.map(sem => (
                                                    <option key={sem} value={sem}>{sem === 'First Semester' ? '1st' : sem === 'Second Semester' ? '2nd' : sem}</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <OutlineButton type="button" onClick={closeModal} className="justify-content-center">
                                    Cancel
                                </OutlineButton>
                                <Button type="submit" className="justify-content-center">
                                    {editSubjectRow ? <Save size={18} /> : <PlusCircle size={18} />}
                                    {editSubjectRow ? "Save Changes" : "Add Subject"}
                                </Button>
                            </ModalFooter>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}

            {}
            <DeleteModal 
                isOpen={isDeleteModalOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                title="Confirm Subject Deletion"
                message="Are you sure you want to delete this subject? This might affect existing study loads."
                itemName={subjectToDelete?.subject_code}
                isLoading={false}
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
  height: 100%;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`;

const CardBody = styled.div`
   padding: 1.5rem;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
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
    font-size: 0.95rem;
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
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); outline: none; }
    
    &.sm {
        padding: 8px 12px;
        font-size: 0.85rem;
    }
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);

  &:hover {
    background: var(--accent-secondary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
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

const Table = styled.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    thead th {
        position: sticky;
        top: 0;
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        font-weight: 600;
        padding: 1rem 1.5rem;
        border-bottom: 2px solid var(--border-color);
        z-index: 10;
    }
    td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
        vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
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
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--bg-secondary);
  width: 90%; max-width: 700px;
  border-radius: 20px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-color);
`;

const ModalHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
  h3 { margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }
`;

const CloseButton = styled.button`
  background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 50%;
  &:hover { background: var(--bg-tertiary); color: var(--text-primary); }
`;

const ModalBody = styled.div` padding: 2rem; `;

const ModalFooter = styled.div`
  padding: 1.25rem 2rem;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  display: flex; justify-content: flex-end; gap: 1rem;
`;

export default SubjectsView;


