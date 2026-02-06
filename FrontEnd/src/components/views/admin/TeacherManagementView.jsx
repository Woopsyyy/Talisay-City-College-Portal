import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { AdminAPI } from '../../../services/api';
import { 
  UserPlus, CalendarPlus, Filter, List, Trash2, CheckCircle, 
  MapPin, Clock, Users, BookOpen, User, Layers, Info, CalendarCheck, X, ArrowLeft
} from 'lucide-react';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import useDebouncedValue from '../../../hooks/useDebouncedValue';

const TeacherManagementView = () => {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [sections, setSections] = useState([]);
  
  
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [subjectSuggestions, setSubjectSuggestions] = useState([]);
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
  const [teacherSubjectSuggestions, setTeacherSubjectSuggestions] = useState([]);
  const [showTeacherSubjectSuggestions, setShowTeacherSubjectSuggestions] = useState(false);
  
  
  const [teacherSuggestions, setTeacherSuggestions] = useState([]);
  const [showTeacherSuggestions, setShowTeacherSuggestions] = useState(false);
  
  
  const [deleteModal, setDeleteModal] = useState({
      isOpen: false,
      type: null, 
      id: null,
      title: ''
  });
  
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false); 

  
  const openScheduleModal = () => setIsScheduleModalOpen(true);
  const closeScheduleModal = () => setIsScheduleModalOpen(false);

  
  const [assignForm, setAssignForm] = useState({
    teacherId: '',
    teacherName: '',
    subjectCode: ''
  });
  
  const [scheduleForm, setScheduleForm] = useState({
    subject: '',
    year: '',
    section: '',
    day: '',
    time_start: '',
    time_end: '',
    building: '',
    room: '',
    class_type: 'day'
  });

  const debouncedTeacherQuery = useDebouncedValue(assignForm.teacherName, 200);
  const debouncedAssignSubjectQuery = useDebouncedValue(assignForm.subjectCode, 200);
  const debouncedScheduleSubjectQuery = useDebouncedValue(scheduleForm.subject, 200);

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        assignmentsData, 
        subjectsData, 
        usersData, 
        schedulesData, 
        buildingsData,
        sectionsData
      ] = await Promise.all([
        AdminAPI.getTeacherAssignments(),
        AdminAPI.getSubjects(),
        AdminAPI.getUsers(),
        AdminAPI.getSchedules(),
        AdminAPI.getBuildings(),
        AdminAPI.getSections()
      ]);

      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setTeachers(Array.isArray(usersData) ? usersData.filter(u => u.role === 'teacher') : []);
      setSchedules(Array.isArray(schedulesData) ? schedulesData : []);
      
      const normalizedBuildings = Array.isArray(buildingsData) 
        ? buildingsData.map(b => (
            typeof b === 'string' 
              ? { name: b, floors: 4, rooms_per_floor: 4 } 
              : { 
                  name: b.name || b.building || '', 
                  floors: b.floors || 4, 
                  rooms_per_floor: b.rooms_per_floor || 4 
                }
          )).filter(b => b.name)
        : [];
      setBuildings(normalizedBuildings);
      
      setSections(Array.isArray(sectionsData) ? sectionsData.map(s => ({
          ...s,
          name: s.section_name, 
          year: s.grade_level   
      })) : []);
      
    } catch (err) {
      console.error("Error loading teacher management data:", err);
      showToast("Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  
  const teachersList = useMemo(() => teachers.map(t => ({
    id: t.id,
    name: t.full_name || t.username
  })).sort((a, b) => a.name.localeCompare(b.name)), [teachers]);

  const sortedInstructorNames = useMemo(() => {
    const allInstructors = new Set();
    assignments.forEach(a => { if (a.teacher_name || a.full_name) allInstructors.add(a.teacher_name || a.full_name); });
    schedules.forEach(s => { if (s.instructor) allInstructors.add(s.instructor); });
    teachers.forEach(t => { if (t.full_name || t.username) allInstructors.add(t.full_name || t.username); });
    return Array.from(allInstructors).sort();
  }, [assignments, schedules, teachers]);

  
  const availableRooms = useMemo(() => {
    if (!scheduleForm.building) return [];
    
    const selectedBuilding = buildings.find(b => b.name === scheduleForm.building);
    if (!selectedBuilding) return [];
    
    const floors = selectedBuilding.floors || 4;
    const roomsPerFloor = selectedBuilding.rooms_per_floor || 4;
    const rooms = [];
    
    for (let floor = 1; floor <= floors; floor++) {
      for (let room = 1; room <= roomsPerFloor; room++) {
        const roomNumber = floor * 100 + room;
        rooms.push(roomNumber.toString());
      }
    }
    
    return rooms;
  }, [scheduleForm.building, buildings]);

  
  const filteredSchedules = useMemo(() => schedules.filter(s => {
    if (selectedTeacherFilter && s.instructor !== selectedTeacherFilter) return false;
    if (yearFilter && String(s.year) !== yearFilter) return false;
    if (sectionFilter && s.section !== sectionFilter) return false;
    return true;
  }).sort((a, b) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayA = days.indexOf(a.day);
    const dayB = days.indexOf(b.day);
    if (dayA !== dayB) return dayA - dayB;
    return (a.time_start || "").localeCompare(b.time_start || "");
  }), [schedules, selectedTeacherFilter, yearFilter, sectionFilter]);

  
  const filteredAssignments = useMemo(() => assignments.filter(ta => {
      if (!assignForm.teacherName) return false; 
      const tName = (ta.full_name || ta.teacher_name || '').toLowerCase();
      const q = assignForm.teacherName.toLowerCase();
      return tName.includes(q);
  }), [assignments, assignForm.teacherName]);

  
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.teacherName || !assignForm.subjectCode) {
      showToast("Please select a teacher and subject code", "error");
      return;
    }

    try {
      setLoading(true);
      await AdminAPI.createTeacherAssignment({
        teacher_name: assignForm.teacherName,
        subject_code: assignForm.subjectCode,
        user_id: assignForm.teacherId || null
      });
      await fetchData();
      
      // Open Schedule Modal with pre-filled subject
      setScheduleForm(prev => ({ ...prev, subject: assignForm.subjectCode }));
      setIsScheduleModalOpen(true);
      
      setAssignForm({ teacherId: '', teacherName: '', subjectCode: '' });
      showToast("Teacher assigned. Please add schedule.");
    } catch (err) {
      showToast(`Error creating assignment: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteAssignmentModal = (assignment) => {
      setDeleteModal({
          isOpen: true,
          type: 'assignment',
          id: assignment.id,
          title: `Assignment: ${assignment.full_name || assignment.teacher_name} - ${assignment.subject_code}`
      });
  };

  const openDeleteScheduleModal = (schedule) => {
      setDeleteModal({
          isOpen: true,
          type: 'schedule',
          id: schedule.id,
          title: `Schedule: ${schedule.subject} (${schedule.day} ${formatTime(schedule.time_start)})`
      });
  };

  const closeDeleteModal = () => {
      setDeleteModal({ isOpen: false, type: null, id: null, title: '' });
  };

  const confirmDelete = async () => {
      if (!deleteModal.id) return;
      
      try {
          if (deleteModal.type === 'assignment') {
            await AdminAPI.deleteTeacherAssignment(deleteModal.id);
            showToast("Assignment deleted");
          } else if (deleteModal.type === 'schedule') {
            await AdminAPI.deleteSchedule(deleteModal.id);
            showToast("Schedule deleted");
          }
          await fetchData();
          closeDeleteModal();
      } catch (err) {
          showToast(`Error deleting ${deleteModal.type}: ${err.message}`, "error");
      }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const assignment = assignments.find(a => a.subject_code === scheduleForm.subject);
      const instructor = assignment ? (assignment.full_name || assignment.teacher_name) : null;

      await AdminAPI.createSchedule({
        ...scheduleForm,
        instructor: instructor || null,
        section: scheduleForm.section || null,
        building: scheduleForm.building || null,
        room: scheduleForm.room || null
      });
      
      await fetchData();
      setScheduleForm({
        subject: '',
        year: '',
        section: '',
        day: '',
        time_start: '',
        time_end: '',
        building: '',
        room: '',
        class_type: 'day'
      });
      showToast("Schedule created successfully");
      setIsScheduleModalOpen(false);
    } catch (err) {
      showToast(`Error creating schedule: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  
  const handleTeacherSearch = (val) => {
    setAssignForm(prev => ({ ...prev, teacherName: val }));
  };

  
  const handleAssignSubjectSearch = (val) => {
    setAssignForm(prev => ({ ...prev, subjectCode: val }));
  };

  const handleScheduleSubjectSearch = (val) => {
    setScheduleForm(prev => ({ ...prev, subject: val }));
  };

  useEffect(() => {
    const q = debouncedTeacherQuery.trim().toLowerCase();
    if (!q) {
      setTeacherSuggestions([]);
      return;
    }
    const matches = teachersList
      .filter(t => t.name.toLowerCase().includes(q))
      .slice(0, 10);
    setTeacherSuggestions(matches);
  }, [debouncedTeacherQuery, teachersList]);

  useEffect(() => {
    const q = debouncedAssignSubjectQuery.trim().toLowerCase();
    if (!q) {
      setTeacherSubjectSuggestions([]);
      return;
    }
    const matches = subjects
      .filter(s => {
        const code = (s.subject_code || '').toLowerCase();
        const title = (s.title || s.subject_name || '').toLowerCase();
        return code.includes(q) || title.includes(q);
      })
      .slice(0, 10);
    setTeacherSubjectSuggestions(matches);
  }, [debouncedAssignSubjectQuery, subjects]);

  useEffect(() => {
    const q = debouncedScheduleSubjectQuery.trim().toLowerCase();
    if (!q) {
      setSubjectSuggestions([]);
      return;
    }
    const matches = subjects
      .filter(s => {
        const code = (s.subject_code || '').toLowerCase();
        const title = (s.title || s.subject_name || '').toLowerCase();
        return code.includes(q) || title.includes(q);
      })
      .map(s => {
        const assign = assignments.find(a => a.subject_code === s.subject_code);
        return {
           ...s,
           teacher: assign ? (assign.full_name || assign.teacher_name) : null
        };
      })
      .slice(0, 10);
    setSubjectSuggestions(matches);
  }, [debouncedScheduleSubjectQuery, subjects, assignments]);

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return new Date("2000-01-01T" + timeStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
    <StyledContainer>
      <HeaderSection>
        <div>
          <h2><Users size={32} /> Teacher Management</h2>
          <p>Assign teachers to subjects and manage academic schedules.</p>
        </div>
      </HeaderSection>

      {toast.show && (
          <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(prev => ({ ...prev, show: false }))} 
          />
      )}

      {}
      <div className="row g-4 mb-4">
        {}
        <div className="col-12 col-xl-5">
            <Card>
                <CardHeader>
                    <UserPlus size={20} />
                    <h3>Assign Teacher to Subject</h3>
                </CardHeader>
                <CardBody>
                    <form onSubmit={handleAssignSubmit}>
                        <FormGroup className="position-relative">
                            <label><User size={16} /> Teacher Name</label>
                            <Input 
                                type="text"
                                placeholder="Type teacher name..."
                                value={assignForm.teacherName}
                                onChange={(e) => handleTeacherSearch(e.target.value)}
                                onFocus={() => assignForm.teacherName && setShowTeacherSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowTeacherSuggestions(false), 300)} 
                                required
                            />
                            {showTeacherSuggestions && teacherSuggestions.length > 0 && (
                                <SuggestionsList>
                                    {teacherSuggestions.map(t => (
                                        <SuggestionItem key={t.id} onClick={() => {
                                            setAssignForm(prev => ({ 
                                                ...prev, 
                                                teacherName: t.name, 
                                                teacherId: t.id 
                                            }));
                                            setShowTeacherSuggestions(false);
                                        }}>
                                            <strong>{t.name}</strong>
                                        </SuggestionItem>
                                    ))}
                                </SuggestionsList>
                            )}
                            <Hint><Info size={12} /> Start typing to search for a teacher.</Hint>
                        </FormGroup>

                        <FormGroup className="position-relative">
                            <label><BookOpen size={16} /> Subject Code</label>
                            <Input 
                                type="text"
                                placeholder="Type subject code..."
                                value={assignForm.subjectCode}
                                onChange={(e) => handleAssignSubjectSearch(e.target.value)}
                                onBlur={() => setTimeout(() => setShowTeacherSubjectSuggestions(false), 300)}
                                onFocus={() => assignForm.subjectCode && setShowTeacherSubjectSuggestions(true)}
                                required
                            />
                            {showTeacherSubjectSuggestions && teacherSubjectSuggestions.length > 0 && (
                                <SuggestionsList>
                                    {teacherSubjectSuggestions.map(s => (
                                        <SuggestionItem key={s.id} onClick={() => {
                                            setAssignForm(prev => ({ ...prev, subjectCode: s.subject_code }));
                                            setShowTeacherSubjectSuggestions(false);
                                        }}>
                                            <strong>{s.subject_code}</strong> - {s.title}
                                        </SuggestionItem>
                                    ))}
                                </SuggestionsList>
                            )}
                            <Hint><Info size={12} /> Start typing to search by subject code or title.</Hint>
                        </FormGroup>
                        <Button type="submit" className="w-100 mt-3" disabled={loading}>
                            <CheckCircle size={18} /> Assign Teacher
                        </Button>
                    </form>
                </CardBody>
            </Card>
        </div>

        {}
        <div className="col-12 col-xl-7">
            <Card className="h-100">
                <CardHeader>
                    <List size={20} />
                    <h3>Current Assignments</h3>
                    <Badge>{assignments.length}</Badge>
                </CardHeader>
                <div className="table-responsive">
                    <Table>
                        <thead>
                            <tr>
                                <th>Teacher</th>
                                <th>Subject</th>
                                <th className="text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAssignments.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="text-center py-4 text-muted">
                                        {assignForm.teacherName 
                                            ? `No assignments found matching "${assignForm.teacherName}".`
                                            : "Enter a teacher name to view their current assignments."}
                                    </td>
                                </tr>
                            ) : filteredAssignments.map(ta => {
                                const subject = subjects.find(s => s.subject_code === ta.subject_code);
                                return (
                                    <tr key={ta.id}>
                                        <td className="fw-bold">{ta.full_name || ta.teacher_name}</td>
                                        <td>
                                            <div className="d-flex flex-column">
                                                <span 
                                                    className="badge bg-primary bg-opacity-10 text-primary w-fit" 
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => {
                                                        setScheduleForm(prev => ({ ...prev, subject: ta.subject_code }));
                                                        setIsScheduleModalOpen(true);
                                                    }}
                                                    title="Click to add schedule"
                                                >
                                                    {ta.subject_code}
                                                </span>
                                                <small className="text-secondary">{subject?.title || ta.subject_title}</small>
                                            </div>
                                        </td>
                                        <td className="text-end">
                                            <OutlineButton onClick={() => openDeleteAssignmentModal(ta)}>
                                                <Trash2 size={16} />
                                            </OutlineButton>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>
            </Card>
        </div>
      </div>

      {}

      {}
      <div className="row g-4">
        <div className="col-12">
            <Card>
                <CardHeader className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                   <div className="d-flex align-items-center gap-2">
                       {selectedTeacherFilter && (
                            <OutlineButton onClick={() => setSelectedTeacherFilter('')} title="Back to Teachers" className="me-2">
                                <ArrowLeft size={16} /> Back
                            </OutlineButton>
                       )}
                       <Filter size={20} />
                       <h3>{selectedTeacherFilter ? `${selectedTeacherFilter}'s Schedule` : 'Teacher Schedules'}</h3>
                   </div>
                   {selectedTeacherFilter && (
                       <div className="d-flex gap-2 align-items-center flex-wrap">
                            <Select 
                                value={yearFilter} 
                                onChange={e => setYearFilter(e.target.value)}
                                style={{ margin: 0, minWidth: '100px' }}
                            >
                                <option value="">All Years</option>
                                {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
                            </Select>
                            <Select 
                                value={sectionFilter} 
                                onChange={e => setSectionFilter(e.target.value)}
                                style={{ margin: 0, minWidth: '120px' }}
                            >
                                <option value="">All Sections</option>
                                {sections.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </Select>
                            {(yearFilter || sectionFilter) && (
                                <OutlineButton onClick={() => { setYearFilter(''); setSectionFilter(''); }} title="Clear Filters">
                                    <X size={16} />
                                </OutlineButton>
                            )}
                       </div>
                   )}
                </CardHeader>
                <CardBody>
                    {!selectedTeacherFilter ? (
                        <TeacherGrid>
                             {sortedInstructorNames.length > 0 ? sortedInstructorNames.map(name => {
                                 const hasAssignments = assignments.some(a => 
                                     (a.teacher_name && a.teacher_name === name) || 
                                     (a.full_name && a.full_name === name)
                                 );
                                 return (
                                     <TeacherCardItem 
                                         key={name} 
                                         onClick={() => setSelectedTeacherFilter(name)}
                                         $isUnassigned={!hasAssignments}
                                     >
                                         <User size={20} />
                                         <span>{name}</span>
                                     </TeacherCardItem>
                                 );
                             }) : (
                                 <div className="text-center w-100 text-muted col-span-3">No teachers found.</div>
                             )}
                        </TeacherGrid>
                    ) : (
                        <div className="table-responsive">
                            <Table>
                                <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Details</th>
                                    <th>Schedule</th>
                                    <th>Location</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredSchedules.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-5 text-muted">No schedules found.</td></tr>
                                ) : filteredSchedules.map(s => {
                                    const teacherAssign = assignments.find(ta => ta.subject_code === s.subject);
                                    const teacherName = s.instructor || teacherAssign?.full_name || teacherAssign?.teacher_name || "N/A";
                                    const isUnassigned = s.time_start === '00:00:00' && s.time_end === '00:00:00' && s.day === 'Monday';

                                    return (
                                        <tr key={s.id} style={isUnassigned ? { backgroundColor: 'rgba(245, 158, 11, 0.05)' } : {}}>
                                            <td>
                                                <div className="d-flex flex-column">
                                                    <span className="fw-bold" style={isUnassigned ? { color: '#d97706' } : {}}>{s.subject}</span>
                                                    <small className="text-secondary">{teacherName}</small>
                                                </div>
                                            </td>
                                            {isUnassigned ? (
                                                <td colSpan="3" className="text-center">
                                                    <span style={{ color: '#d97706', fontWeight: 600, letterSpacing: '0.5px' }}>
                                                        NOT ASSIGNED
                                                    </span>
                                                </td>
                                            ) : (
                                                <>
                                                    <td>
                                                        <div className="d-flex gap-2 flex-wrap">
                                                            <Badge bg="var(--bg-tertiary)" color="var(--text-primary)">{s.year || '?'} Year</Badge>
                                                            <Badge bg="var(--bg-tertiary)" color="var(--text-primary)">{s.section || 'No Section'}</Badge>
                                                            <Badge bg={s.class_type === 'night' ? '#1f2937' : '#f59e0b'} color="#fff">
                                                                {s.class_type === 'night' ? 'Night' : 'Day'}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <CalendarCheck size={14} className="text-muted"/> 
                                                            <span>{s.day}</span>
                                                            <Clock size={14} className="text-muted ms-2"/> 
                                                            <span>{formatTime(s.time_start)} - {formatTime(s.time_end)}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-1">
                                                            <MapPin size={14} className="text-muted" />
                                                            <span>{s.building || '?'}-{s.room || '?'}</span>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                            <td className="text-end">
                                                <OutlineButton onClick={() => openDeleteScheduleModal(s)}>
                                                    <Trash2 size={16} />
                                                </OutlineButton>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
      </div>


    </StyledContainer>

    {}
      {isScheduleModalOpen && (
                <ModalOverlay onClick={closeScheduleModal}>
                    <ModalContent onClick={e => e.stopPropagation()}>
                        <ModalHeader>
                            <h3><CalendarPlus size={20} /> Add Class Schedule</h3>
                            <CloseButton onClick={closeScheduleModal}><X size={24} /></CloseButton>
                        </ModalHeader>
                        <form onSubmit={handleScheduleSubmit}>
                            <ModalBody>
                                <div className="row g-3">
                                    <div className="col-md-6 position-relative">
                                        <FormGroup>
                                            <label>Subject</label>
                                            <Input 
                                                type="text" placeholder="Search subject..."
                                                value={scheduleForm.subject}
                                                onChange={(e) => handleScheduleSubjectSearch(e.target.value)}
                                                onBlur={() => setTimeout(() => setShowSubjectSuggestions(false), 300)}
                                                onFocus={() => scheduleForm.subject && setShowSubjectSuggestions(true)}
                                                required
                                            />
                                            {showSubjectSuggestions && subjectSuggestions.length > 0 && (
                                                <SuggestionsList>
                                                    {subjectSuggestions.map(s => (
                                                        <SuggestionItem key={s.id} onClick={() => {
                                                            setScheduleForm(prev => ({ ...prev, subject: s.subject_code }));
                                                            setShowSubjectSuggestions(false);
                                                        }}>
                                                            <strong>{s.subject_code}</strong> {s.teacher && <span className="text-muted">({s.teacher})</span>}
                                                        </SuggestionItem>
                                                    ))}
                                                </SuggestionsList>
                                            )}
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-3">
                                        <FormGroup>
                                            <label>Year</label>
                                            <Select 
                                                value={scheduleForm.year} 
                                                onChange={(e) => setScheduleForm({...scheduleForm, year: e.target.value})} 
                                                required
                                            >
                                                <option value="">Select...</option>
                                                {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y}</option>)}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-3">
                                        <FormGroup>
                                            <label>Section</label>
                                            <Select
                                                value={scheduleForm.section}
                                                onChange={(e) => setScheduleForm({...scheduleForm, section: e.target.value})}
                                            >
                                                <option value="">Select...</option>
                                                {sections.filter(s => !scheduleForm.year || String(s.year) === String(scheduleForm.year)).map(s => (
                                                    <option key={s.id} value={s.name}>{s.name} ({s.year})</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-4">
                                        <FormGroup>
                                            <label>Day</label>
                                            <Select 
                                                value={scheduleForm.day}
                                                onChange={(e) => setScheduleForm({...scheduleForm, day: e.target.value})}
                                                required
                                            >
                                                <option value="">Select...</option>
                                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(d => <option key={d} value={d}>{d}</option>)}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-4">
                                        <FormGroup>
                                            <label>Type</label>
                                            <Select
                                                value={scheduleForm.class_type}
                                                onChange={(e) => setScheduleForm({...scheduleForm, class_type: e.target.value})}
                                            >
                                                <option value="day">Day</option>
                                                <option value="night">Night</option>
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-4">
                                         {}
                                    </div>
                                    
                                    <div className="col-md-6">
                                        <FormGroup>
                                            <label>Time Start</label>
                                            <Input type="time" required value={scheduleForm.time_start} onChange={e => setScheduleForm({...scheduleForm, time_start: e.target.value})} />
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-6">
                                        <FormGroup>
                                            <label>Time End</label>
                                            <Input type="time" required value={scheduleForm.time_end} onChange={e => setScheduleForm({...scheduleForm, time_end: e.target.value})} />
                                        </FormGroup>
                                    </div>
                                    
                                    <div className="col-md-6">
                                        <FormGroup>
                                            <label>Building</label>
                                            <Select 
                                                value={scheduleForm.building} 
                                                onChange={e => setScheduleForm({...scheduleForm, building: e.target.value, room: ''})}>
                                                <option value="">Select...</option>
                                                {buildings.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                    <div className="col-md-6">
                                        <FormGroup>
                                            <label>Room</label>
                                            <Select 
                                                value={scheduleForm.room} 
                                                onChange={e => setScheduleForm({...scheduleForm, room: e.target.value})}
                                                disabled={!scheduleForm.building}>
                                                <option value="">Select room...</option>
                                                {availableRooms.map(room => (
                                                    <option key={room} value={room}>{room}</option>
                                                ))}
                                            </Select>
                                        </FormGroup>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <SecondaryButton type="button" onClick={closeScheduleModal}>Cancel</SecondaryButton>
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Saving...' : <><CheckCircle size={18} /> Save Schedule</>}
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
        title={`Delete ${deleteModal.type === 'assignment' ? 'Assignment' : 'Schedule'}`}
        message={`Are you sure you want to delete this ${deleteModal.type}?`}
        itemName={deleteModal.title}
      />
    </>
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

const Card = styled.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  /* overflow: hidden; Removed to allow suggestion dropdowns to overflow */
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
   color: var(--text-secondary);
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
  label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
      svg { color: var(--accent-primary); width: 14px; height: 14px; }
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
`;

const Select = styled.select`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary); 
    color: var(--text-primary);
    font-size: 0.95rem;
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
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const OutlineButton = styled.button`
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 6px;
    border-radius: 6px;
    color: #ef4444; 
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: rgba(239, 68, 68, 0.1); border-color: #fecaca; }
`;

const SuggestionsList = styled.div`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-top: 4px;
    box-shadow: var(--shadow-md);
    z-index: 1000;
    max-height: 200px;
    overflow-y: auto;
`;

const SuggestionItem = styled.div`
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    &:hover { background: var(--bg-tertiary); }
    &:last-child { border-bottom: none; }
    strong { color: var(--text-primary); font-size: 0.9rem; }
`;

const Hint = styled.div`
    display: flex; gap: 6px; align-items: center;
    color: var(--text-secondary); font-size: 0.8rem; margin-top: 4px;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    th {
        text-align: left;
        padding: 1rem;
        color: var(--text-secondary);
        font-weight: 600;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-tertiary);
    }
    td {
        padding: 1rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
    }
    tr:last-child td { border-bottom: none; }
`;

const Badge = styled.span`
    background: ${props => props.bg || 'var(--accent-primary)'};
    color: ${props => props.color || 'white'};
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
`;

const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px);
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
  /* overflow: hidden; Removed to allow dropdowns */
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border: 1px solid var(--border-color);
`;

const ModalHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--border-color);
  display: flex; justify-content: space-between; align-items: center;
  background: var(--bg-tertiary);
  h3 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0; display: flex; align-items: center; gap: 8px; }
`;

const CloseButton = styled.button`
  background: transparent; border: none; color: var(--text-tertiary); cursor: pointer; padding: 4px; border-radius: 50%;
  &:hover { background: var(--bg-tertiary); color: var(--text-secondary); }
`;

const ModalBody = styled.div`
  padding: 2rem;
`;

const ModalFooter = styled.div`
  padding: 1.25rem 2rem;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-color);
  display: flex; justify-content: flex-end; gap: 1rem;
`;

const SecondaryButton = styled(Button)`
  background: transparent; border: 1px solid var(--border-color); color: var(--text-primary);
  &:hover { background: var(--bg-tertiary); transform: translateY(-1px); }
`;

const TeacherGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    // padding: 1rem; // Optional
`;

const TeacherCardItem = styled.div`
    background: var(--bg-tertiary);
    border: 2px solid ${props => props.$isUnassigned ? '#f59e0b' : 'var(--border-color)'};
    border-radius: 12px;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 10px;
    &:hover { background: var(--bg-primary); transform: translateY(-2px); border-color: ${props => props.$isUnassigned ? '#d97706' : 'var(--accent-primary)'}; }
    svg { color: ${props => props.$isUnassigned ? '#f59e0b' : 'var(--accent-primary)'}; }
    span { font-weight: 600; color: var(--text-primary); }
`;

export default TeacherManagementView;
