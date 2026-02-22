import React, { useState, useEffect, useMemo } from 'react';
import baseStyled from 'styled-components';
import { AdminAPI } from '../../../services/api';
import { formatOrdinal } from '../../../utils/formatting';
import { BookOpen, Filter, Calendar, Layers, Trash2, Search, User, Award, AlertCircle } from 'lucide-react';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import PageSkeleton from '../../loaders/PageSkeleton';
const styled = baseStyled as any;

const GradeSystemView = () => {
  const [loading, setLoading] = useState(true);
  
  
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [userAssignments, setUserAssignments] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  
  const [deleteModal, setDeleteModal] = useState({
      isOpen: false,
      gradeIds: [],
      studentName: ''
  });

  
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gradesData, studentsData, assignmentsData] = await Promise.all([
        AdminAPI.getGrades().catch(() => []),
        AdminAPI.getUsers({ role: 'student' }).catch(() => []),
        AdminAPI.getUserAssignments().catch(() => [])
      ]);

      setGrades(Array.isArray(gradesData) ? gradesData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setUserAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    } catch (err) {
      console.error("Error loading grade system data:", err);
      setToast({ show: true, message: "Failed to load grade data.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllGrades = (gradeIds, studentName) => {
    setDeleteModal({
        isOpen: true,
        gradeIds,
        studentName
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, gradeIds: [], studentName: '' });
  };

  const confirmDelete = async () => {
    const { gradeIds, studentName } = deleteModal;
    if (!gradeIds || gradeIds.length === 0) return;

    try {
      setLoading(true);
      
      await Promise.all(gradeIds.map(id => AdminAPI.deleteGrade(id)));
      await fetchData(); 
      setToast({ show: true, message: `All grades for ${studentName} deleted successfully.`, type: 'success' });
      closeDeleteModal();
    } catch (err) {
      setToast({ show: true, message: `Error deleting grades: ${err.message}`, type: 'error' });
    } finally {
      
      
      
      
      
      setLoading(false); 
    }
  };

  

  const availableYears = useMemo(
    () => [...new Set(grades.map(g => g.year).filter(Boolean))].sort(),
    [grades]
  );
  const availableSections = useMemo(
    () => [...new Set(userAssignments.map(a => a.section).filter(Boolean))].sort(),
    [userAssignments]
  );

  const studentsById = useMemo(() => {
    const map = new Map();
    students.forEach(s => {
      if (s.id != null) map.set(String(s.id), s);
    });
    return map;
  }, [students]);

  const studentsByUsername = useMemo(() => {
    const map = new Map();
    students.forEach(s => {
      if (s.username) map.set(String(s.username), s);
    });
    return map;
  }, [students]);

  const assignmentsByKey = useMemo(() => {
    const map = new Map();
    userAssignments.forEach(a => {
      if (a.user_id != null) map.set(`id:${String(a.user_id)}`, a);
      if (a.username) map.set(`un:${String(a.username)}`, a);
    });
    return map;
  }, [userAssignments]);

  const groupedGrades = useMemo(() => {
    const grouped: Record<string, Record<string, any>> = {};

    grades.forEach(grade => {
      if (selectedYear && grade.year !== selectedYear) return;

      const student =
        grade.user_id != null
          ? studentsById.get(String(grade.user_id))
          : studentsByUsername.get(String(grade.username || ''));

      if (selectedSection) {
        if (!student) return;
        const assignment =
          student.id != null
            ? assignmentsByKey.get(`id:${String(student.id)}`)
            : assignmentsByKey.get(`un:${String(student.username || '')}`);
        if (!assignment || assignment.section !== selectedSection) return;
      }

      const yearKey = grade.year || "Unknown";
      if (!grouped[yearKey]) grouped[yearKey] = {};

      const studentKey = grade.user_id || grade.username;
      if (!grouped[yearKey][studentKey]) {
        let imagePath = null;
        if (student && student.image_path) {
          let rawPath = student.image_path;
          if (rawPath.startsWith("/TCC/public/")) rawPath = rawPath.replace("/TCC/public/", "");
          else if (rawPath.startsWith("/TCC/database/pictures/")) rawPath = rawPath.replace("/TCC/database/pictures/", "database/pictures/");

          imagePath = rawPath.startsWith("http") || rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
        }

        grouped[yearKey][studentKey] = {
          studentObj: student,
          displayName: grade.student_name || grade.username || (student ? (student.full_name || student.username) : "Unknown"),
          imagePath: imagePath,
          semesters: { "First Semester": [], "Second Semester": [] }
        };
      }

      const semKey = grade.semester === "Second Semester" ? "Second Semester" : "First Semester";
      grouped[yearKey][studentKey].semesters[semKey].push(grade);
    });

    return grouped;
  }, [grades, selectedYear, selectedSection, studentsById, studentsByUsername, assignmentsByKey]);

  const calculateStats = (gradeList) => {
    let scoreSum = 0;
    let scoreCount = 0;
    
    gradeList.forEach(g => {
       const parts = [g.prelim_grade, g.midterm_grade, g.finals_grade]
         .map(v => parseFloat(v))
         .filter(v => !isNaN(v));
       
       if (parts.length > 0) {
         const subjectAvg = parts.reduce((a,b)=>a+b,0) / parts.length;
         scoreSum += subjectAvg;
         scoreCount++;
       }
    });

    return {
      count: gradeList.length,
      average: scoreCount > 0 ? (Math.round((scoreSum / scoreCount) * 10) / 10).toFixed(1) : null
    };
  };

  return (
    <StyledContainer>
      <HeaderSection>
          <div>
              <h2><BookOpen size={32} /> Grade System</h2>
              <p>Manage student grades and academic records (Read-Only View)</p>
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
      <MainCard className="mb-4">
          <CardHeader>
              <Filter size={20} />
              <h3>Filter by Level & Section</h3>
          </CardHeader>
          <CardBody>
              <div className="row g-4">
                  <div className="col-12">
                      <FilterGroup>
                          <h4>Year Level</h4>
                          <FilterOptions>
                              <FilterButton 
                                  active={!selectedYear} 
                                  onClick={() => setSelectedYear('')}
                              >
                                  All Years
                              </FilterButton>
                              {availableYears.map(y => (
                                  <FilterButton 
                                      key={y}
                                      active={selectedYear === y}
                                      onClick={() => setSelectedYear(y)}
                                  >
                                      {formatOrdinal(y)} Year
                                  </FilterButton>
                              ))}
                          </FilterOptions>
                      </FilterGroup>
                  </div>
                  <div className="col-12">
                      <FilterGroup>
                          <h4>Section</h4>
                          <FilterOptions>
                              <FilterButton 
                                  active={!selectedSection} 
                                  onClick={() => setSelectedSection('')}
                              >
                                  All Sections
                              </FilterButton>
                              {availableSections.map(s => (
                                  <FilterButton 
                                      key={s}
                                      active={selectedSection === s}
                                      onClick={() => setSelectedSection(s)}
                                  >
                                      {s}
                                  </FilterButton>
                              ))}
                          </FilterOptions>
                      </FilterGroup>
                  </div>
              </div>
          </CardBody>
      </MainCard>

      {}
      {loading ? (
           <PageSkeleton variant="cards" count={4} />
      ) : Object.keys(groupedGrades).length === 0 ? (
          <MainCard>
              <CardBody className="text-center py-5">
                   <AlertCircle size={48} className="text-secondary mb-3" />
                   <p className="text-secondary">No grade records found matching filters.</p>
              </CardBody>
          </MainCard>
      ) : (
          <div className="d-flex flex-column gap-4">
              {Object.keys(groupedGrades).sort().map(year => (
                   <MainCard key={year}>
                      <CardHeader>
                          <Calendar size={20} />
                          <h3>{formatOrdinal(year)} Year Records</h3>
                      </CardHeader>
                      <CardBody>
                          <StudentGrid>
                              {Object.values(groupedGrades[year] as Record<string, any>).map((studentGroup: any) => {
                                  const sem1Stats = calculateStats(studentGroup.semesters["First Semester"]);
                                  const sem2Stats = calculateStats(studentGroup.semesters["Second Semester"]);
                                  const allGrades = [...studentGroup.semesters["First Semester"], ...studentGroup.semesters["Second Semester"]];
                                  const overallStats = calculateStats(allGrades);
                                  const allGradeIds = allGrades.map(g => g.id);

                                  return (
                                      <StudentCard key={studentGroup.displayName}>
                                          <StudentHeader>
                                              <Avatar loading="lazy">
                                                  {studentGroup.imagePath ? 
                                                      <img loading="lazy"
                                                        src={studentGroup.imagePath}
                                                        alt={studentGroup.displayName}
                                                        onError={(e) => {
                                                          const image = e.currentTarget as HTMLImageElement;
                                                          image.style.display = 'none';
                                                        }}
                                                      /> : 
                                                      <User size={24} />
                                                  }
                                              </Avatar>
                                              <StudentInfo>
                                                  <h5>{studentGroup.displayName}</h5>
                                                  <small>{overallStats.count} subjects recorded</small>
                                              </StudentInfo>
                                          </StudentHeader>
                                          
                                          <StatsRow>
                                              <Badge className={sem1Stats.count > 0 ? '' : 'muted'}>
                                                  1st Sem {sem1Stats.average && <strong>{sem1Stats.average}</strong>}
                                              </Badge>
                                              <Badge className={sem2Stats.count > 0 ? '' : 'muted'}>
                                                  2nd Sem {sem2Stats.average && <strong>{sem2Stats.average}</strong>}
                                              </Badge>
                                          </StatsRow>
                                          
                                          {overallStats.average && (
                                              <OverallBadge>
                                                 <Award size={14} /> GWA: {overallStats.average}
                                              </OverallBadge>
                                          )}

                                          {allGradeIds.length > 0 && (
                                              <DeleteButton onClick={() => handleDeleteAllGrades(allGradeIds, studentGroup.displayName)}>
                                                  <Trash2 size={16} /> Delete Records
                                              </DeleteButton>
                                          )}
                                      </StudentCard>
                                  );
                              })}
                          </StudentGrid>
                      </CardBody>
                   </MainCard> 
              ))}
          </div>
      )}

      <DeleteModal 
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title="Delete All Grades"
          message="Are you sure you want to delete ALL grades for this student? This action cannot be undone."
          itemName={deleteModal.studentName}
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
  &.mb-4 { margin-bottom: 1.5rem; }
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

const FilterGroup = styled.div`
    h4 {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--text-secondary);
        margin-bottom: 0.75rem;
        font-weight: 700;
    }
`;

const FilterOptions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
`;

const FilterButton = styled.button`
    background: ${props => props.active ? 'var(--accent-primary)' : 'transparent'};
    color: ${props => props.active ? 'var(--text-inverse)' : 'var(--text-primary)'};
    border: 1px solid ${props => props.active ? 'var(--accent-primary)' : 'var(--border-color)'};
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    &:hover {
        background: ${props => props.active ? 'var(--accent-secondary)' : 'var(--bg-tertiary)'};
    }
`;

const StudentGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
`;

const StudentCard = styled.div`
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    transition: transform 0.2s;
    &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
    }
`;

const StudentHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 1rem;
`;

const Avatar = styled.div`
    width: 48px; height: 48px;
    border-radius: 50%;
    background: var(--bg-tertiary);
    overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    img { width: 100%; height: 100%; object-fit: cover; }
`;

const StudentInfo = styled.div`
    flex: 1;
    overflow: hidden;
    h5 { margin: 0 0 2px; font-size: 1rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    small { color: var(--text-secondary); font-size: 0.8rem; }
`;

const StatsRow = styled.div`
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const Badge = styled.div`
    background: var(--bg-tertiary);
    color: var(--text-primary);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8rem;
    border: 1px solid var(--border-color);
    &.muted { opacity: 0.6; }
    strong { margin-left: 4px; color: var(--accent-primary); }
`;

const OverallBadge = styled.div`
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
    border: 1px solid rgba(59, 130, 246, 0.2);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 6px;
`;

const DeleteButton = styled.button`
    width: 100%;
    margin-top: auto;
    background: transparent;
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
    padding: 0.6rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
    &:hover { background: rgba(239, 68, 68, 0.1); }
`;

export default GradeSystemView;


