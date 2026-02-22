import React, { useState, useEffect, useRef, useMemo } from 'react';
import baseStyled from 'styled-components';
const styled = baseStyled as any;
import { AdminAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { COURSE_MAJOR_CONFIG, YEAR_LEVEL_OPTIONS } from '../../../utils/constants';
import { Search, UserPlus, Users, Layers, BookOpen, GraduationCap, X, Check, Save, Trash2, Filter, AlertCircle, Edit, ShieldAlert, CreditCard, UserCheck, RefreshCw, MapPin, Clock3, Eraser } from 'lucide-react';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import SkeletonLoader from '../../loaders/SkeletonLoader';

const NO_SECTION_FILTER_VALUE = '__NO_SECTION__';

const ManageStudentsView = ({ mode = null, onOpenIrregularStudyLoad = null }) => {
    const { user: authUser } = useAuth();
    const userRoles = Array.isArray(authUser?.roles) ? authUser.roles : [authUser?.role || 'student'];
    const isActualAdmin = userRoles.includes('admin');

    const isOsas = mode === 'osas';
    const isTreasury = mode === 'treasury';
    const isDeanOrNt = mode === 'dean' || mode === 'nt';
    const isDefault = !mode || mode === 'admin';
    const isAdmin = isActualAdmin && isDefault;
    const showAcademicFields = isDefault || isDeanOrNt;
    
    // Determine what to show
    const showPayments = (isDefault && isActualAdmin) || isTreasury;
    const showSanctions = (isDefault && isActualAdmin) || isOsas;
    
    // In strict mode (which the user requested), if we have a specific mode, we ONLY show that.
    // However, for the default admin view, we originally showed everything.
    // The user said "separate them both make them own button", implying they want separate views even for admin.
    
    const [assignments, setAssignments] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [isSanctionModalOpen, setIsSanctionModalOpen] = useState(false);
    const [sanctionDetails, setSanctionDetails] = useState({ days: '', reason: '' });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        id: null
    });

    const [assignForm, setAssignForm] = useState({
        id: null,
        full_name: '',
        existing_user_id: '',
        year: '3',
        section: '',
        department: '',
        major: '',
        gender: '',
        lacking_payment: 'no', 
        amount_lacking: '',
        has_sanction: 'no',    
        sanction_reason: '',
        student_status: 'Regular'
    });

    const [userSuggestions, setUserSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchTimeoutRef = useRef(null);

    const [filters, setFilters] = useState({
        query: '',
        year: '',
        section: '',
        department: '',
        major: '',
        gender: '',
        lacking_payment: 'all', // 'all' | 'paid' | 'lacking'
        has_sanctions: 'all'    // 'all' | 'with' | 'without'
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [fetchedAssignments, fetchedSections] = await Promise.all([
                AdminAPI.getUserAssignments(),
                AdminAPI.getSections()
            ]);
            setAssignments(Array.isArray(fetchedAssignments) ? fetchedAssignments : []);
            setSections(Array.isArray(fetchedSections) ? fetchedSections : []);
        } catch (err) {
            console.error("Error loading manage students data:", err);
            showToast("Failed to load data.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAssignInputChange = (e) => {
        const { name, value } = e.target;
        setAssignForm(prev => {
             const newData = { ...prev, [name]: value };
             
             if (name === 'section') {
                 const selectedSection = sections.find(s => s.section_name === value);
                 if (selectedSection) {
                     newData.year = getYearFromLevel(selectedSection.grade_level);
                     newData.department = selectedSection.course || selectedSection.department || '';
                     newData.major = selectedSection.major || '';
                 }
             }

             if (name === 'lacking_payment' && value === 'no') {
                 newData.amount_lacking = ''; 
             }

             if (name === 'department') {
                 if (!value) {
                     newData.major = '';
                 } else {
                     const allowedMajors = COURSE_MAJOR_CONFIG[value] || [];
                     if (!allowedMajors.includes(newData.major)) {
                         newData.major = '';
                     }
                 }
             }
             
             if (name === 'has_sanction' && value === 'yes') {
                 const existingReason = prev.sanction_reason || '';
                 const daysMatch = existingReason.match(/(\d+)\s*days?/i);
                 const days = daysMatch ? daysMatch[1] : '';
                 const reason = existingReason.replace(/^\d+\s*days?:\s*/i, '').trim();
                 
                 setSanctionDetails({ days, reason });
                 setTimeout(() => setIsSanctionModalOpen(true), 100); 
             }
             if (name === 'has_sanction' && value === 'no') {
                 newData.sanction_reason = ''; 
                 setSanctionDetails({ days: '', reason: '' });
             }
             return newData;
        });
    };

    const handleUserSearch = async (e) => {
        const query = e.target.value;
        setAssignForm(prev => ({ ...prev, full_name: query, existing_user_id: '' })); 
        
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (query.length < 2) {
            setUserSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const suggestions = await AdminAPI.getUserSuggestions(query);
                setUserSuggestions(suggestions || []);
                setShowSuggestions(true);
            } catch (err) {
                console.error("Error searching users:", err);
            }
        }, 300);
    };

    const selectUser = (user) => {
        setAssignForm(prev => ({
            ...prev,
            full_name: user.full_name || user.username,
            existing_user_id: user.id
        }));
        setShowSuggestions(false);
    };

    const openAssignmentModal = () => {
        if (!assignForm.full_name) {
            showToast("Please select or enter a user first.", "error");
            return;
        }
        setIsAssignmentModalOpen(true);
    };

    const handleEdit = (assignment) => {
        setAssignForm({
            id: assignment.id || null,
            full_name: assignment.full_name || assignment.username,
            existing_user_id: assignment.user_id,
            year: assignment.year ? String(assignment.year) : '3',
            section: assignment.section || '',
            department: assignment.department || '',
            major: assignment.major || '',
            gender: assignment.gender || '',
            lacking_payment: assignment.payment === 'owing' ? 'yes' : 'no',
            amount_lacking: assignment.amount_lacking || '',
            has_sanction: assignment.sanctions || assignment.sanctions === 1 ? 'yes' : 'no',
            sanction_reason: assignment.sanction_reason || '',
            student_status: assignment.student_status || 'Regular'
        });
        setIsAssignmentModalOpen(true);
    };

    const parseSanctionReason = (rawReason = '') => {
        const cleanReason = String(rawReason || '').trim();
        const daysMatch = cleanReason.match(/(\d+)\s*days?/i);
        const days = daysMatch ? Number(daysMatch[1]) : 0;
        const reason = cleanReason.replace(/^\d+\s*days?:\s*/i, '').trim();
        return {
            days,
            reason,
            hasDays: days > 0
        };
    };

    const handleViewSanction = (assignment) => {
        const existingReason = assignment.sanction_reason || '';
        const parsed = parseSanctionReason(existingReason);
        
        setAssignForm(prev => ({ ...prev, id: assignment.id, sanction_reason: existingReason }));
        setSanctionDetails({ days: parsed.days ? String(parsed.days) : '', reason: parsed.reason });
        setIsSanctionModalOpen(true);
    };

    const closeAssignmentModal = () => {
        setIsAssignmentModalOpen(false);
        setAssignForm({
            id: null,
            full_name: '',
            existing_user_id: '',
            year: '3',
            section: '',
            department: '',
            major: '',
            gender: '',
            lacking_payment: 'no',
            amount_lacking: '',
            has_sanction: 'no',
            sanction_reason: '',
            student_status: 'Regular'
        });
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();

        if (assignForm.has_sanction === 'yes' && !assignForm.sanction_reason) {
            showToast("Please details (days and reason) for the sanction.", "error");
            setSanctionDetails({ days: '', reason: '' }); 
            setIsSanctionModalOpen(true);
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...assignForm,
                user_id: assignForm.existing_user_id || null,
                section: assignForm.section,
                department: assignForm.department,
                major: assignForm.major,
                gender: assignForm.gender || null,
                payment: assignForm.lacking_payment === 'yes' ? 'owing' : 'paid',
                amount_lacking: assignForm.lacking_payment === 'yes' ? assignForm.amount_lacking : null,
                sanctions: assignForm.has_sanction === 'yes',
                sanction_reason: assignForm.has_sanction === 'yes' ? assignForm.sanction_reason : '',
                student_status: assignForm.student_status
            };

            if (assignForm.id) {
                await AdminAPI.updateUserAssignment(assignForm.id, payload);
                showToast("Assignment updated successfully!");
            } else {
                await AdminAPI.createUserAssignment(payload);
                showToast("User assigned successfully!");
            }
            
            closeAssignmentModal();
            fetchData();
        } catch (err) {
            showToast(`Error saving assignment: ${err.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value,
            ...(name === 'department' ? { major: '' } : {})
        }));
        setCurrentPage(1); // Reset to page 1 on filter change
    };

    const handleResetFilters = () => {
        setFilters({
            query: '',
            year: '',
            section: '',
            department: '',
            major: '',
            gender: '',
            lacking_payment: 'all',
            has_sanctions: 'all'
        });
        setCurrentPage(1);
    };

    const handleDelete = (id) => {
        setDeleteModal({
            isOpen: true,
            id
        });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ isOpen: false, id: null });
    };

    const handleSaveSanction = async () => {
        if (!sanctionDetails.days || !sanctionDetails.reason) {
            showToast('Please enter both days and reason for sanction', 'error');
            return;
        }
        
        const formattedReason = `${sanctionDetails.days} days: ${sanctionDetails.reason}`;
        
        if (assignForm.id && !isAssignmentModalOpen) {
            try {
                setLoading(true);
                const payload = {
                    sanctions: true,
                    sanction_reason: formattedReason
                };
                await AdminAPI.updateUserAssignment(assignForm.id, payload);
                showToast('Sanction updated successfully');
                setIsSanctionModalOpen(false);
                fetchData();
            } catch (err) {
                showToast(`Error updating sanction: ${err.message}`, 'error');
            } finally {
                setLoading(false);
            }
        } else {
            setAssignForm(prev => ({ ...prev, sanction_reason: formattedReason }));
            setIsSanctionModalOpen(false);
            showToast('Sanction details saved');
        }
    };

    const handleClearSanction = async (assignmentId) => {
        try {
            setLoading(true);
            const payload = {
                sanctions: false,
                sanction_reason: ''
            };
            await AdminAPI.updateUserAssignment(assignmentId, payload);
            showToast('Sanction cleared');
            fetchData();
        } catch (err) {
            showToast(`Error clearing sanction: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReduceSanctionDays = async (assignment) => {
        const parsed = parseSanctionReason(assignment?.sanction_reason || '');
        if (!assignment?.id || !parsed.hasDays) {
            showToast('No sanction days to reduce for this student.', 'error');
            return;
        }

        const nextDays = parsed.days - 1;
        if (nextDays <= 0) {
            await handleClearSanction(assignment.id);
            return;
        }

        const nextReason = `${nextDays} days: ${parsed.reason || 'Sanction active'}`;
        try {
            setLoading(true);
            await AdminAPI.updateUserAssignment(assignment.id, {
                sanctions: true,
                sanction_reason: nextReason
            });
            showToast('Sanction days reduced.');
            fetchData();
        } catch (err) {
            showToast(`Error reducing sanction days: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPaid = async (assignmentId) => {
        try {
            setLoading(true);
            const payload = {
                payment: 'paid',
                amount_lacking: 0
            };
            await AdminAPI.updateUserAssignment(assignmentId, payload);
            showToast('Marked as paid');
            fetchData();
        } catch (err) {
            showToast(`Error updating payment: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const confirmDelete = async () => {
        if (!deleteModal.id) return;

        try {
            await AdminAPI.deleteUserAssignment(deleteModal.id);
            setAssignments(prev => prev.filter(a => a.id !== deleteModal.id));
            showToast("Assignment deleted.");
            closeDeleteModal();
        } catch (err) {
            showToast(`Error deleting assignment: ${err.message}`, "error");
        }
    };

    const getSectionName = (assignment) => String(assignment?.section || assignment?.section_name || '').trim();
    const hasSection = (assignment) => Boolean(getSectionName(assignment));

    const availableSections = useMemo(
        () =>
            [...new Set(sections.map((s) => String(s.section_name || '').trim()).filter(Boolean))].sort(),
        [sections]
    );
    const availableDepartments = useMemo(() => Object.keys(COURSE_MAJOR_CONFIG), []);
    const availableGenders = useMemo(
        () =>
            Array.from(
                new Set(
                    (assignments || [])
                        .map((assignment) => String(assignment?.gender || '').trim())
                        .filter(Boolean),
                ),
            ).sort((a, b) => a.localeCompare(b)),
        [assignments],
    );
    const filterMajorsOptions = useMemo(
        () => (filters.department ? COURSE_MAJOR_CONFIG[filters.department] : []),
        [filters.department]
    );

    const assignmentsWithoutSectionCount = useMemo(
        () => assignments.filter((assignment) => !hasSection(assignment)).length,
        [assignments]
    );
    const assignmentsWithSectionCount = useMemo(
        () => assignments.filter((assignment) => hasSection(assignment)).length,
        [assignments]
    );
    const assignmentsWithOwingCount = useMemo(
        () => assignments.filter((assignment) => assignment?.payment === 'owing').length,
        [assignments]
    );
    const assignmentsWithSanctionCount = useMemo(
        () => assignments.filter((assignment) => assignment?.sanctions === true || assignment?.sanctions === 1).length,
        [assignments]
    );
    
    const getYearFromLevel = (level) => {
        if (!level) return '';
        const match = String(level).match(/^(\d)/);
        return match ? match[1] : level;
    };

    const modalSections = useMemo(
        () =>
            sections
                .slice()
                .sort((a, b) => a.section_name.localeCompare(b.section_name)),
        [sections],
    );

    const modalMajorOptions = useMemo(
        () => (assignForm.department ? COURSE_MAJOR_CONFIG[assignForm.department] || [] : []),
        [assignForm.department],
    );

    const modalSectionsByScope = useMemo(() => {
        return modalSections.filter((section) => {
            const sectionYear = getYearFromLevel(section.grade_level);
            const sectionDepartment = section.course || section.department || '';
            if (assignForm.year && String(sectionYear) !== String(assignForm.year)) return false;
            if (assignForm.department && String(sectionDepartment) !== String(assignForm.department)) return false;
            return true;
        });
    }, [modalSections, assignForm.year, assignForm.department]);

     const filteredAssignments = useMemo(() => assignments.filter(a => {
        if (filters.query) {
            const q = filters.query.toLowerCase();
            const matchName = a.username?.toLowerCase().includes(q) || a.full_name?.toLowerCase().includes(q);
            const sectionName = getSectionName(a);
            const matchSection = sectionName.toLowerCase().includes(q);
            const matchDept = a.department?.toLowerCase().includes(q);
            const matchMajor = a.major?.toLowerCase().includes(q);
            const matchGender = String(a.gender || '').toLowerCase().includes(q);
            if (!(matchName || matchSection || matchDept || matchMajor || matchGender)) return false;
        }
        if (filters.year && String(a.year) !== String(filters.year)) return false;
        const currentSection = getSectionName(a);
        if (filters.section === NO_SECTION_FILTER_VALUE && currentSection) return false;
        if (filters.section && filters.section !== NO_SECTION_FILTER_VALUE && currentSection !== filters.section) return false;
        if (filters.department && a.department !== filters.department) return false;
        if (filters.major && a.major !== filters.major) return false;
        if (filters.gender && String(a.gender || '').toLowerCase() !== String(filters.gender || '').toLowerCase()) return false;
        
        // Detailed Payment Filter
        if (filters.lacking_payment === 'lacking' && a.payment !== 'owing') return false;
        if (filters.lacking_payment === 'paid' && a.payment === 'owing') return false;
        
        // Detailed Sanction Filter
        if (filters.has_sanctions === 'with' && !a.sanctions) return false;
        if (filters.has_sanctions === 'without' && a.sanctions) return false;
        
        return true;
    }), [assignments, filters]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
    const paginatedAssignments = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAssignments.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAssignments, currentPage, itemsPerPage]);

    return (
        <StyledContainer>
            <HeaderSection>
                <div>
                    <h2>
                        {isOsas ? <ShieldAlert size={32} /> : isTreasury ? <CreditCard size={32} /> : isDeanOrNt ? <UserCheck size={32} /> : <Users size={32} />}
                        {isOsas ? " Sanction Management" : isTreasury ? " Financial Status" : isDeanOrNt ? " Student Assignments" : " Manage Students"}
                    </h2>
                    <p>
                        {isOsas ? "Monitor and manage student disciplinary sanctions." : 
                         isTreasury ? "Manage student payment statuses and financial balances." : 
                         isDeanOrNt ? "Assign student sections and academic status." :
                         "Manage student assignments, financial status, and sanctions."}
                    </p>
                </div>
                {isDeanOrNt && typeof onOpenIrregularStudyLoad === 'function' && (
                    <Button type="button" onClick={onOpenIrregularStudyLoad}>
                        <BookOpen size={18} /> Irregular Study Load
                    </Button>
                )}
            </HeaderSection>
            
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(prev => ({ ...prev, show: false }))} 
                />
            )}

            <StatsGrid>
                <StatCard>
                    <StatIcon><Users size={20} /></StatIcon>
                    <div>
                        <StatValue>{assignments.length}</StatValue>
                        <StatLabel>Total Tracked Students</StatLabel>
                    </div>
                </StatCard>
                <StatCard>
                    <StatIcon><Layers size={20} /></StatIcon>
                    <div>
                        <StatValue>{assignmentsWithSectionCount}</StatValue>
                        <StatLabel>With Section</StatLabel>
                    </div>
                </StatCard>
                <StatCard className="warn">
                    <StatIcon><MapPin size={20} /></StatIcon>
                    <div>
                        <StatValue>{assignmentsWithoutSectionCount}</StatValue>
                        <StatLabel>No Section Assigned</StatLabel>
                    </div>
                </StatCard>
                {showPayments && (
                    <StatCard className="danger">
                        <StatIcon><CreditCard size={20} /></StatIcon>
                        <div>
                            <StatValue>{assignmentsWithOwingCount}</StatValue>
                            <StatLabel>With Balance</StatLabel>
                        </div>
                    </StatCard>
                )}
                {showSanctions && (
                    <StatCard className="danger">
                        <StatIcon><ShieldAlert size={20} /></StatIcon>
                        <div>
                            <StatValue>{assignmentsWithSanctionCount}</StatValue>
                            <StatLabel>With Sanctions</StatLabel>
                        </div>
                    </StatCard>
                )}
            </StatsGrid>

            <div className="row g-4 mb-5">
                {(isActualAdmin && isDefault) || isDeanOrNt ? (
                    <div className="col-12">
                        <Card style={{ overflow: 'visible' }}>
                            <CardHeader>
                                <UserPlus size={20} />
                                <h3>Assign New Student</h3>
                            </CardHeader>
                            <CardBody className="p-4 d-flex gap-3 align-items-end flex-wrap">
                                <div className="flex-grow-1 position-relative" style={{ minWidth: '300px' }}>
                                    <FormLabel>Search User</FormLabel>
                                    <SearchInputWrapper>
                                        <Search size={18} className="search-icon"/>
                                        <Input 
                                            type="text" 
                                            placeholder="Type name or username..." 
                                            value={assignForm.full_name}
                                            onChange={handleUserSearch}
                                            style={{ paddingLeft: '38px' }}
                                        />
                                    </SearchInputWrapper>
                                    {showSuggestions && userSuggestions.length > 0 && (
                                        <SuggestionsList>
                                            {userSuggestions.map(user => (
                                                <SuggestionItem 
                                                    key={user.id} 
                                                    onClick={() => selectUser(user)}
                                                >
                                                    <strong>{user.full_name || user.username}</strong>
                                                    <small>{user.username}</small>
                                                </SuggestionItem>
                                            ))}
                                        </SuggestionsList>
                                    )}
                                </div>
                                <Button onClick={openAssignmentModal} disabled={!assignForm.full_name}>
                                    Continue <Check size={18} />
                                </Button>
                            </CardBody>
                        </Card>
                    </div>
                ) : null}

                <div className="col-12">
                    <Card>
                        <CardHeader>
                            <CardHeaderTitle>
                                <FilterIconWrapper><Filter size={20} /></FilterIconWrapper>
                                <h3>Filter Records</h3>
                            </CardHeaderTitle>
                            <HeaderActions>
                                <FilterHint>{filteredAssignments.length} result{filteredAssignments.length === 1 ? '' : 's'}</FilterHint>
                                <OutlineButton type="button" onClick={handleResetFilters} title="Reset all filters">
                                    <RefreshCw size={15} />
                                    Reset
                                </OutlineButton>
                            </HeaderActions>
                        </CardHeader>
                        <CardBody className="p-4">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <FieldLabel>
                                        <Search size={14} />
                                        Search
                                    </FieldLabel>
                                     <Input
                                        type="text"
                                        name="query"
                                        placeholder="Search by full name, section, department, major, or gender..."
                                        value={filters.query}
                                        onChange={handleFilterChange}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <FieldLabel>
                                        <GraduationCap size={14} />
                                        Year
                                    </FieldLabel>
                                    <Select name="year" value={filters.year} onChange={handleFilterChange}>
                                        <option value="">All Years</option>
                                        {YEAR_LEVEL_OPTIONS.map(y => <option key={y} value={y}>{y} Year</option>)}
                                    </Select>
                                </div>
                                <div className="col-md-3">
                                    <FieldLabel>
                                        <MapPin size={14} />
                                        Section
                                    </FieldLabel>
                                    <Select name="section" value={filters.section} onChange={handleFilterChange}>
                                        <option value="">All Sections</option>
                                        <option value={NO_SECTION_FILTER_VALUE}>No Section Assigned</option>
                                        {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                                    </Select>
                                </div>
                                {showAcademicFields && (
                                    <>
                                        <div className="col-md-3">
                                            <FieldLabel>
                                                <BookOpen size={14} />
                                                Department
                                            </FieldLabel>
                                            <Select name="department" value={filters.department} onChange={handleFilterChange}>
                                                <option value="">All Departments</option>
                                                {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                            </Select>
                                        </div>
                                        <div className="col-md-3">
                                            <FieldLabel>
                                                <Layers size={14} />
                                                Major
                                            </FieldLabel>
                                            <Select name="major" value={filters.major} onChange={handleFilterChange}>
                                                <option value="">All Majors</option>
                                                {filterMajorsOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                            </Select>
                                        </div>
                                        <div className="col-md-3">
                                            <FieldLabel>
                                                <UserCheck size={14} />
                                                Gender
                                            </FieldLabel>
                                            <Select name="gender" value={filters.gender} onChange={handleFilterChange}>
                                                <option value="">All Genders</option>
                                                {availableGenders.map((gender) => (
                                                    <option key={gender} value={gender}>
                                                        {gender}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>
                                    </>
                                )}
                                 <div className="col-12 d-flex gap-4 pt-2">
                                    {showPayments && (
                                        <div style={{ flex: 1 }}>
                                            <FieldLabel>
                                                <CreditCard size={14} />
                                                Payment Filter
                                            </FieldLabel>
                                            <Select name="lacking_payment" value={filters.lacking_payment} onChange={handleFilterChange}>
                                                <option value="all">All Financial Status</option>
                                                <option value="paid">Paid (No debt)</option>
                                                <option value="lacking">Lacking Payment</option>
                                            </Select>
                                        </div>
                                    )}
                                    {showSanctions && (
                                        <div style={{ flex: 1 }}>
                                            <FieldLabel>
                                                <ShieldAlert size={14} />
                                                Sanction Filter
                                            </FieldLabel>
                                            <Select name="has_sanctions" value={filters.has_sanctions} onChange={handleFilterChange}>
                                                <option value="all">All Disciplines</option>
                                                <option value="with">Sanctioned Students</option>
                                                <option value="without">Without Sanctions</option>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <div className="col-12">
                     <Card>
                        <CardHeader>
                            <CardHeaderTitle>
                                <FilterIconWrapper><Users size={18} /></FilterIconWrapper>
                                <h3>User Assignments ({filteredAssignments.length})</h3>
                            </CardHeaderTitle>
                        </CardHeader>
                        <div className="table-responsive">
                             <Table>
                                <thead>
                                    <tr>
                                        <th>
                                            <HeaderCellLabel>
                                                <Users size={14} />
                                                Full Name
                                            </HeaderCellLabel>
                                        </th>
                                        {isActualAdmin && isDefault && <th>Brief Role</th>}
                                        <th>
                                            <HeaderCellLabel>
                                                <GraduationCap size={14} />
                                                Year
                                            </HeaderCellLabel>
                                        </th>
                                        <th>
                                            <HeaderCellLabel>
                                                <MapPin size={14} />
                                                Section
                                            </HeaderCellLabel>
                                        </th>
                                        {showAcademicFields && <th>Department</th>}
                                        {showAcademicFields && <th>Major</th>}
                                        {showAcademicFields && <th>Gender</th>}
                                        {isDeanOrNt && <th>Status</th>}
                                        {isTreasury && <th>Payment</th>}
                                        {isOsas && (
                                            <th>
                                                <HeaderCellLabel>
                                                    <ShieldAlert size={14} />
                                                    Sanctions
                                                </HeaderCellLabel>
                                            </th>
                                        )}
                                        {isDefault && isActualAdmin && (
                                            <>
                                                <th>Status</th>
                                            </>
                                        )}
                                        <th className="text-end">
                                            <HeaderCellLabel className="justify-end">
                                                <Filter size={14} />
                                                Actions
                                            </HeaderCellLabel>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                     {loading && !isAssignmentModalOpen ? (
                                        <tr>
                                            <td colSpan={14} className="p-4">
                                                <SkeletonLoader />
                                                <SkeletonLoader />
                                            </td>
                                        </tr>
                                    ) : paginatedAssignments.length === 0 ? (
                                        <tr>
                                            <td colSpan={14} className="text-center py-5 text-muted">
                                                <AlertCircle className="mb-2" size={32} style={{ opacity: 0.5 }} />
                                                <div>No assignments found.</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedAssignments.map(a => (
                                            <tr key={a.id}>
                                                <td>
                                                    <StudentCell>
                                                        <StudentIcon>
                                                            <Users size={14} />
                                                        </StudentIcon>
                                                        <div>
                                                            <strong>{a.username || a.full_name || "N/A"}</strong>
                                                            {a.school_id ? <SmallMuted>{a.school_id}</SmallMuted> : null}
                                                        </div>
                                                    </StudentCell>
                                                </td>
                                                {isDefault && isActualAdmin && (
                                                    <td>
                                                        <span className={`badge ${a.user_role === 'admin' ? 'bg-danger' : a.user_role === 'teacher' ? 'bg-info' : 'bg-success'}`}>
                                                            {a.user_role || 'student'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td>{a.year}</td>
                                                <td>
                                                    {getSectionName(a) ? (
                                                        getSectionName(a)
                                                    ) : (
                                                        <StatusBadge className="neutral">No section</StatusBadge>
                                                    )}
                                                </td>
                                                {showAcademicFields && <td>{a.department || '-'}</td>}
                                                {showAcademicFields && <td>{a.major || '-'}</td>}
                                                {showAcademicFields && <td>{a.gender || '-'}</td>}
                                                {isDeanOrNt && <td>{a.student_status || 'Regular'}</td>}
                                                {showPayments && (
                                                    <td>
                                                        {a.payment === 'owing' ? <StatusBadge className="warning">₱{a.amount_lacking || '0'}</StatusBadge> : <span className="text-success small">Paid</span>}
                                                    </td>
                                                )}
                                                {showSanctions && (
                                                    <td>
                                                        {(a.sanctions === 1 || a.sanctions === true) ? (
                                                            <>
                                                                <StatusBadge className="danger">Sanctioned</StatusBadge>
                                                                {parseSanctionReason(a.sanction_reason || '').hasDays ? (
                                                                    <SmallMuted>{parseSanctionReason(a.sanction_reason || '').days} day(s)</SmallMuted>
                                                                ) : null}
                                                            </>
                                                        ) : (
                                                            <span className="text-muted small">None</span>
                                                        )}
                                                    </td>
                                                )}
                                                {isDefault && isActualAdmin && (
                                                    <>
                                                        <td>{a.student_status || 'Regular'}</td>
                                                    </>
                                                )}
                                                <td className="text-end">
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                        {isOsas ? (
                                                            <>
                                                                <OutlineButton
                                                                    type="button"
                                                                    style={{ color: '#f59e0b', borderColor: '#f59e0b' }}
                                                                    disabled={!(a.sanctions === 1 || a.sanctions === true)}
                                                                    onClick={() => handleReduceSanctionDays(a)}
                                                                    title="Reduce sanction by one day"
                                                                >
                                                                    <Clock3 size={14} />
                                                                    Reduce Day
                                                                </OutlineButton>
                                                                <OutlineButton
                                                                    type="button"
                                                                    style={{ color: '#10b981', borderColor: '#10b981' }}
                                                                    disabled={!(a.sanctions === 1 || a.sanctions === true)}
                                                                    onClick={() => handleClearSanction(a.id)}
                                                                    title="Clear sanction"
                                                                >
                                                                    <Eraser size={14} />
                                                                    Clear
                                                                </OutlineButton>
                                                            </>
                                                        ) : isTreasury && filters.lacking_payment === 'paid' ? (
                                                            <Button style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem', background: '#f59e0b' }} onClick={() => {
                                                                setAssignForm(prev => ({ ...prev, id: a.id, full_name: a.full_name, lacking_payment: 'yes' }));
                                                                setIsAssignmentModalOpen(true);
                                                            }}>
                                                                <CreditCard size={14} /> Add Debt
                                                            </Button>
                                                        ) : isTreasury && filters.lacking_payment === 'lacking' ? (
                                                            <Button style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem', background: '#10b981' }} onClick={() => handleMarkPaid(a.id)}>
                                                                <UserCheck size={14} /> Mark Paid
                                                            </Button>
                                                        ) : (
                                                            <>
                                                                <OutlineButton 
                                                                    style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }} 
                                                                    onClick={() => handleEdit(a)} 
                                                                    title="Edit Details"
                                                                >
                                                                    <Edit size={16} />
                                                                </OutlineButton>
                                                                {(isDefault || isOsas) && (a.sanctions === 1 || a.sanctions === true) && (
                                                                <OutlineButton style={{ color: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => handleViewSanction(a)} title="View/Edit Sanction">
                                                                    <AlertCircle size={16} />
                                                                </OutlineButton>
                                                                )}
                                                                {isActualAdmin && isDefault && a.id && (
                                                                <OutlineButton onClick={() => handleDelete(a.id)} title="Remove Assignment">
                                                                    <Trash2 size={16} />
                                                                </OutlineButton>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                             </Table>
                        </div>
                        {/* Pagination UI */}
                        {totalPages > 1 && (
                            <PaginationWrapper>
                                <PaginationButton 
                                    disabled={currentPage === 1} 
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                >
                                    Previous
                                </PaginationButton>
                                <PageInfo>Page {currentPage} of {totalPages}</PageInfo>
                                <PaginationButton 
                                    disabled={currentPage === totalPages} 
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                >
                                    Next
                                </PaginationButton>
                            </PaginationWrapper>
                        )}
                    </Card>
                </div>
            </div>

            {isAssignmentModalOpen && (
                <ModalOverlay onClick={closeAssignmentModal}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <h3>{isAdmin ? "Full Assignment Details" : isOsas ? "Update Sanction" : isTreasury ? "Update Payment Info" : "Update Academic Status"}</h3>
                            <CloseButton onClick={closeAssignmentModal}><X size={24} /></CloseButton>
                        </ModalHeader>
                        <form onSubmit={handleAssignSubmit}>
                            <ModalBody>
                                <div className="mb-4">
                                    <label className="d-block mb-1 font-weight-bold">Selected User</label>
                                    <SelectedUserBox>
                                        <h4>{assignForm.full_name}</h4>
                                    </SelectedUserBox>
                                </div>

                                <div className="row g-3">
                                    {showAcademicFields && (
                                        <>
                                            <div className="col-md-6">
                                                <FormLabel>Year</FormLabel>
                                                <Select
                                                    name="year"
                                                    value={assignForm.year}
                                                    onChange={handleAssignInputChange}
                                                    required
                                                >
                                                    <option value="">Select Year</option>
                                                    {YEAR_LEVEL_OPTIONS.map((year) => (
                                                        <option key={year} value={String(year)}>
                                                            {year} Year
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="col-md-6">
                                                <FormLabel>Department</FormLabel>
                                                <Select
                                                    name="department"
                                                    value={assignForm.department}
                                                    onChange={handleAssignInputChange}
                                                    required
                                                >
                                                    <option value="">Select Department</option>
                                                    {availableDepartments.map((department) => (
                                                        <option key={department} value={department}>
                                                            {department}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="col-12">
                                                <FormLabel>Section</FormLabel>
                                                <Select
                                                    name="section"
                                                    value={assignForm.section}
                                                    onChange={handleAssignInputChange}
                                                    required
                                                >
                                                    <option value="">Select Section</option>
                                                    {modalSectionsByScope.map(s => (
                                                        <option key={s.id} value={s.section_name}>
                                                            {s.section_name} ({getYearFromLevel(s.grade_level)} - {s.course || s.department || 'Gen'})
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="col-md-6">
                                                <FormLabel>Major</FormLabel>
                                                <Select
                                                    name="major"
                                                    value={assignForm.major}
                                                    onChange={handleAssignInputChange}
                                                    disabled={!assignForm.department}
                                                >
                                                    <option value="">Select Major</option>
                                                    {modalMajorOptions.map((major) => (
                                                        <option key={major} value={major}>
                                                            {major}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="col-md-6">
                                                <FormLabel>Gender</FormLabel>
                                                <Select
                                                    name="gender"
                                                    value={assignForm.gender}
                                                    onChange={handleAssignInputChange}
                                                >
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </Select>
                                            </div>
                                            <div className="col-12">
                                                <FormLabel>Student Status</FormLabel>
                                                <Select name="student_status" value={assignForm.student_status} onChange={handleAssignInputChange}>
                                                    <option value="Regular">Regular</option>
                                                    <option value="Irregular">Irregular</option>
                                                </Select>
                                            </div>
                                        </>
                                    )}
                                    
                                    {(isDefault || isTreasury) && (
                                        <div className="col-12">
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <FormLabel>Lacking Payment?</FormLabel>
                                                    <Select name="lacking_payment" value={assignForm.lacking_payment} onChange={handleAssignInputChange}>
                                                        <option value="no">No (Paid/OK)</option>
                                                        <option value="yes">Yes (Lacking)</option>
                                                    </Select>
                                                </div>
                                                {assignForm.lacking_payment === 'yes' && (
                                                    <div className="col-md-6 fade-in">
                                                        <FormLabel>Amount Lacking (₱)</FormLabel>
                                                        <Input type="number" name="amount_lacking" placeholder="e.g. 500" value={assignForm.amount_lacking} onChange={handleAssignInputChange} required />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(isDefault || isOsas) && (
                                        <div className="col-12">
                                            <FormLabel>Has Sanction?</FormLabel>
                                            <Select name="has_sanction" value={assignForm.has_sanction} onChange={handleAssignInputChange}>
                                                <option value="no">No</option>
                                                <option value="yes">Yes</option>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <SecondaryButton type="button" onClick={closeAssignmentModal}>Cancel</SecondaryButton>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : <><Save size={18} /> Update Record</>}
                                </Button>
                            </ModalFooter>
                        </form>
                    </ModalContent>
                </ModalOverlay>
            )}

            {isSanctionModalOpen && (
                <ModalOverlay onClick={() => setIsSanctionModalOpen(false)}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <h3><AlertCircle size={24} /> Sanction Details</h3>
                            <CloseButton onClick={() => setIsSanctionModalOpen(false)}>
                                <X size={20} />
                            </CloseButton>
                        </ModalHeader>
                        <ModalBody>
                            <p className="text-muted mb-4">Enter the sanction duration and reason below</p>
                            
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <FormLabel>Days Remaining*</FormLabel>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 3"
                                        value={sanctionDetails.days}
                                        onChange={(e) => setSanctionDetails(prev => ({ ...prev, days: e.target.value }))}
                                        autoFocus
                                    />
                                </div>
                                <div className="col-md-8">
                                    <FormLabel>Reason*</FormLabel>
                                    <Input
                                        type="text"
                                        placeholder="e.g. no haircut, improper uniform"
                                        value={sanctionDetails.reason}
                                        onChange={(e) => setSanctionDetails(prev => ({ ...prev, reason: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button type="button" style={{ background: '#6c757d' }} onClick={() => setIsSanctionModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleSaveSanction}>
                                <Save size={18} /> Save Sanction
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </ModalOverlay>
            )}
            <DeleteModal 
                isOpen={deleteModal.isOpen}
                onClose={closeDeleteModal}
                onConfirm={confirmDelete}
                title="Remove Student Assignment"
                message="Are you sure you want to remove this student's assignment record?"
                itemName="student assignment"
                isLoading={loading}
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
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
  padding: 1.4rem 1.6rem;
  border-radius: 18px;
  border: 1px solid var(--border-color);
  background:
    radial-gradient(120% 100% at 0% 0%, rgba(59, 130, 246, 0.16) 0%, rgba(59, 130, 246, 0.02) 42%, transparent 72%),
    var(--bg-secondary);
  
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

  @media (max-width: 768px) {
    padding: 1rem;
    h2 {
      font-size: 1.35rem;
    }
    p {
      font-size: 0.95rem;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 1rem;
`;

const StatCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  box-shadow: var(--shadow-sm);

  &.warn {
    border-color: rgba(245, 158, 11, 0.4);
    background: linear-gradient(145deg, rgba(245, 158, 11, 0.08), transparent 70%), var(--bg-secondary);
  }

  &.danger {
    border-color: rgba(239, 68, 68, 0.35);
    background: linear-gradient(145deg, rgba(239, 68, 68, 0.07), transparent 70%), var(--bg-secondary);
  }
`;

const StatIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.2);
`;

const StatValue = styled.div`
  color: var(--text-primary);
  font-weight: 800;
  font-size: 1.25rem;
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: 0.82rem;
  color: var(--text-secondary);
`;

const Card = styled.div`
  background: var(--bg-secondary);
  border-radius: 18px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: linear-gradient(180deg, var(--bg-tertiary) 0%, rgba(127, 127, 127, 0.04) 100%);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 18px 18px 0 0;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const CardHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const FilterHint = styled.span`
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 600;
`;

const CardBody = styled.div`
    color: var(--text-secondary);
`;

const FormLabel = styled.label`
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
`;

const FieldLabel = styled(FormLabel)`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    margin-bottom: 0.35rem;
    svg { color: var(--accent-primary); }
`;

const SearchInputWrapper = styled.div`
    position: relative;
    .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-tertiary);
        z-index: 5;
    }
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); outline: none; }
    &::placeholder { color: var(--text-secondary); opacity: 0.7; }
`;

const Select = styled.select`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
    transition: all 0.2s;
    &:focus { border-color: var(--accent-primary); outline: none; }
`;

const SuggestionsList = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-top: 4px;
    box-shadow: var(--shadow-md);
    z-index: 50;
    max-height: 250px;
    overflow-y: auto;
`;

const SuggestionItem = styled.div`
    padding: 10px 16px;
    cursor: pointer;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    color: var(--text-primary);
    transition: background 0.2s;
    &:hover { background: var(--hover-color); }
    &:last-child { border-bottom: none; }
    strong { font-size: 0.9rem; }
    small { color: var(--text-secondary); font-size: 0.8rem; }
`;

const CheckboxWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    input { width: 16px; height: 16px; accent-color: var(--accent-primary); cursor: pointer; }
    label { cursor: pointer; color: var(--text-primary); font-size: 0.9rem; }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  height: 44px;
  &:hover { background: var(--accent-highlight); transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const OutlineButton = styled.button`
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 7px 12px;
    border-radius: 6px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    &:hover { background: var(--bg-tertiary); border-color: var(--accent-primary); }
    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

const FilterIconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--bg-primary); 
    border-radius: 6px;
    border: 1px solid var(--border-color);
    color: var(--text-tertiary);
`;

const HeaderCellLabel = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    &.justify-end {
        justify-content: flex-end;
    }
`;

const Table = styled.table`
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    th {
        text-align: left;
        padding: 1rem 1.5rem;
        color: var(--text-secondary);
        font-weight: 600;
        border-bottom: 2px solid var(--border-color);
        background: var(--bg-tertiary);
    }
    td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
        vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
`;

const StudentCell = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const StudentIcon = styled.span`
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    background: rgba(59, 130, 246, 0.12);
    border: 1px solid rgba(59, 130, 246, 0.22);
`;

const SmallMuted = styled.div`
    color: var(--text-secondary);
    font-size: 0.76rem;
    margin-top: 2px;
`;

const StatusBadge = styled.span`
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    &.warning { background: rgba(245, 158, 11, 0.15); color: #d97706; }
    &.danger { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    &.neutral { background: rgba(59, 130, 246, 0.12); color: var(--accent-primary); }
`;


const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
  display: flex; padding: 20px; z-index: 1000;
  overflow-y: auto;
`;

const ModalContent = styled.div`
  background: var(--bg-secondary);
  width: 90%; max-width: 900px;
  margin: auto; 
  display: flex;
  flex-direction: column;
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
  background: var(--bg-tertiary);
  h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; }
`;

const CloseButton = styled.button`
  background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 50%;
  &:hover { background: var(--bg-tertiary); color: var(--text-secondary); }
`;

const ModalBody = styled.div`
  padding: 2rem;
`;

const SelectedUserBox = styled.div`
    padding: 1rem;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    h4 { margin: 0; color: var(--accent-primary); font-weight: 700; }
`;

const ModalFooter = styled.div`
  padding: 1.25rem 2rem;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  display: flex; justify-content: flex-end; gap: 1rem;
`;

const SecondaryButton = styled(Button)`
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  border: 1px solid var(--border-color);
  &:hover { background: var(--border-color); transform: translateY(-1px); }
`;

const PaginationWrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1.5rem;
    gap: 1rem;
    border-top: 1px solid var(--border-color);
    background: var(--bg-tertiary);
`;

const PaginationButton = styled.button`
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
    
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    &:hover:not(:disabled) {
        border-color: var(--accent-primary);
        color: var(--accent-primary);
    }
`;

const PageInfo = styled.span`
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 500;
`;

export default ManageStudentsView;


