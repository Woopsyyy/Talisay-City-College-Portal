import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useLocation } from "react-router-dom";
import { TeacherAPI } from "../../../services/api";
import { Users, ChevronLeft, Save, Award, BookOpen, Calendar, Edit3 } from "lucide-react";
import PageSkeleton from "../../loaders/PageSkeleton";

const normalizeYearLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/\d+/);
  return match ? match[0] : raw;
};

const formatGradeDisplay = (value) => {
  if (value == null || value === "") return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toFixed(1);
};

const formatGradeInput = (value) => {
  if (value == null || value === "") return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(1);
};

const parseGradeForSave = (value, label) => {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error(`${label} is required.`);

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }

  if (parsed < 1 || parsed > 5) {
    throw new Error(`${label} must be between 1.0 and 5.0.`);
  }

  const scaled = parsed * 10;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
    throw new Error(`${label} must use one decimal place only (example: 1.0, 2.5, 5.0).`);
  }

  return Number(parsed.toFixed(1));
};

const buildSectionsFromSchedules = (scheduleRows = []) => {
  const grouped = new Map();

  scheduleRows.forEach((row) => {
    const sectionName = String(row?.section || "").trim();
    if (!sectionName) return;

    const key = row?.section_id ? `id:${row.section_id}` : `name:${sectionName.toLowerCase()}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: row?.section_id || null,
        name: sectionName,
        section_name: sectionName,
        year_level: normalizeYearLabel(row?.year),
        grade_level: normalizeYearLabel(row?.year),
        schedule_count: 0,
        subjects: [],
      });
    }

    const bucket = grouped.get(key);
    bucket.schedule_count += 1;

    const subjectCode = String(row?.subject || "").trim();
    if (!subjectCode) return;

    if (!bucket.subjects.some((item) => item.code === subjectCode)) {
      bucket.subjects.push({
        id: row?.subject_id || null,
        code: subjectCode,
        name: String(row?.subject_title || subjectCode).trim() || subjectCode,
      });
    }
  });

  return Array.from(grouped.values())
    .filter((section) => section.name && section.subjects.length > 0)
    .map((section) => ({
      ...section,
      subjects: [...section.subjects].sort((a, b) =>
        String(a.code || "").localeCompare(String(b.code || "")),
      ),
    }))
    .sort((a, b) => {
      const yearA = Number.parseInt(String(a.year_level || "").replace(/\D+/g, ""), 10);
      const yearB = Number.parseInt(String(b.year_level || "").replace(/\D+/g, ""), 10);
      const normalizedA = Number.isFinite(yearA) ? yearA : 999;
      const normalizedB = Number.isFinite(yearB) ? yearB : 999;

      if (normalizedA !== normalizedB) return normalizedA - normalizedB;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
};

const GradeSystemView = ({ isReadOnly = false }) => {
  const location = useLocation();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("");
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [gradeForm, setGradeForm] = useState({ prelim: "", midterm: "", finals: "" });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) =>
        String(a.full_name || "").localeCompare(String(b.full_name || "")),
      ),
    [students],
  );

  const loadMasterList = async (section, subjectCode, keepStudents = false) => {
    if (!section || !subjectCode) {
      setGrades({});
      if (!keepStudents) setStudents([]);
      return;
    }

    setLoadingDetails(true);
    try {
      let studentsData = students;
      if (!keepStudents) {
        studentsData = await TeacherAPI.getStudentsBySection({
          sectionId: section.id,
          sectionName: section.name,
          subjectCode,
        });
      }

      const gradesData = await TeacherAPI.getGrades({
        section_id: section.id,
        section: section.name,
        subject: subjectCode,
      });

      if (!keepStudents) {
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      }
      setGrades(gradesData || {});
    } catch (error) {
      console.error("Failed to load grade details:", error);
      if (!keepStudents) setStudents([]);
      setGrades({});
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSectionClick = async (section, preferredSubjectCode = "") => {
    const availableSubjectCodes = (section?.subjects || []).map((subject) => subject.code);
    const initialSubjectCode =
      availableSubjectCodes.find((code) => code === preferredSubjectCode) ||
      availableSubjectCodes[0] ||
      "";

    setSelectedSection(section);
    setSelectedSubjectCode(initialSubjectCode);
    setEditingStudent(null);
    setFormError("");

    await loadMasterList(section, initialSubjectCode, false);
  };

  const handleSubjectChange = async (event) => {
    const nextSubjectCode = String(event?.target?.value || "").trim();
    setSelectedSubjectCode(nextSubjectCode);
    setEditingStudent(null);
    setFormError("");
    await loadMasterList(selectedSection, nextSubjectCode, false);
  };

  const fetchSections = async () => {
    try {
      const scheduleRows = await TeacherAPI.getSchedule();
      setSections(buildSectionsFromSchedules(Array.isArray(scheduleRows) ? scheduleRows : []));
    } catch (error) {
      console.error("Error fetching scheduled sections:", error);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (loading || selectedSection || sections.length === 0) return;

    const params = new URLSearchParams(location.search);
    const requestedSection = String(params.get("section") || "").trim().toLowerCase();
    const requestedSubject = String(params.get("subject") || "").trim();
    if (!requestedSection) return;

    const matchedSection = sections.find(
      (section) => String(section.name || "").trim().toLowerCase() === requestedSection,
    );

    if (matchedSection) {
      handleSectionClick(matchedSection, requestedSubject);
    }
  }, [loading, sections, selectedSection, location.search]);

  const handleEditClick = (student) => {
    const studentGrades = grades[student.id] || {};
    setGradeForm({
      prelim: formatGradeInput(studentGrades.prelim_grade),
      midterm: formatGradeInput(studentGrades.midterm_grade),
      finals: formatGradeInput(studentGrades.finals_grade),
    });
    setFormError("");
    setEditingStudent(student);
  };

  const handleGradeInput = (field, value) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setGradeForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const normalizeInputOnBlur = (field) => {
    setGradeForm((prev) => {
      const raw = String(prev[field] ?? "").trim();
      if (!raw) return prev;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return prev;
      return { ...prev, [field]: parsed.toFixed(1) };
    });
  };

  const handleSaveGrades = async () => {
    if (!editingStudent || !selectedSection || !selectedSubjectCode) return;

    setIsSaving(true);
    setFormError("");

    try {
      const normalizedPrelim = parseGradeForSave(gradeForm.prelim, "Prelim grade");
      const normalizedMidterm = parseGradeForSave(gradeForm.midterm, "Midterm grade");
      const normalizedFinals = parseGradeForSave(gradeForm.finals, "Finals grade");

      await TeacherAPI.createGrade({
        student_id: editingStudent.id,
        section: selectedSection.name,
        subject: selectedSubjectCode,
        prelim: normalizedPrelim,
        midterm: normalizedMidterm,
        finals: normalizedFinals,
      });

      setGrades((prev) => ({
        ...prev,
        [editingStudent.id]: {
          ...prev[editingStudent.id],
          prelim_grade: normalizedPrelim,
          midterm_grade: normalizedMidterm,
          finals_grade: normalizedFinals,
        },
      }));

      setEditingStudent(null);
    } catch (error) {
      setFormError(error?.message || "Failed to save grades.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <PageSkeleton variant="cards" />;

  if (!selectedSection) {
    return (
      <Container>
        <Header>
          <div>
            <Title>{isReadOnly ? "Grade Monitoring" : "Grade Management"}</Title>
            <Subtitle>
              {isReadOnly
                ? "View grades for sections in your active teaching schedule."
                : "Select a scheduled section to open the master list and enter grades."}
            </Subtitle>
          </div>
          <BookOpen size={32} color="var(--accent-primary)" />
        </Header>

        {sections.length === 0 ? (
          <EmptyState>
            <Award size={48} />
            <p>No scheduled sections available for grading.</p>
          </EmptyState>
        ) : (
          <Grid>
            {sections.map((section) => (
              <SectionCard key={`${section.id || section.name}`} onClick={() => handleSectionClick(section)}>
                <CardHeader>
                  <Badge>
                    {section.year_level ? `Year ${section.year_level}` : "Section"} - {section.name}
                  </Badge>
                  <Users size={20} />
                </CardHeader>
                <CardBody>
                  <SubjectTitle>Scheduled Subjects</SubjectTitle>
                  <SubjectList>
                    {section.subjects.map((subject) => (
                      <SubjectItem key={`${section.name}-${subject.code}`}>
                        <BookOpen size={14} />
                        <span>
                          <strong>{subject.code}</strong> - {subject.name}
                        </span>
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
        <BackButton onClick={() => {
          setSelectedSection(null);
          setSelectedSubjectCode("");
          setStudents([]);
          setGrades({});
          setEditingStudent(null);
          setFormError("");
        }}>
          <ChevronLeft size={20} /> Back to Sections
        </BackButton>
        <DetailTitle>
          <h2>{selectedSection.name}</h2>
          <p>Master List</p>
        </DetailTitle>
      </DetailHeader>

      <FiltersCard>
        <FilterLabel>
          <Calendar size={16} />
          Subject
        </FilterLabel>
        <SubjectSelect value={selectedSubjectCode} onChange={handleSubjectChange} disabled={loadingDetails}>
          {(selectedSection.subjects || []).map((subject) => (
            <option key={subject.code} value={subject.code}>
              {subject.code} - {subject.name}
            </option>
          ))}
        </SubjectSelect>
      </FiltersCard>

      {loadingDetails ? (
        <PageSkeleton variant="table" compact columns={5} />
      ) : (
        <TableWrapper>
          <MasterListTable>
            <thead>
              <tr>
                <th>#</th>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Prelim</th>
                <th>Midterm</th>
                <th>Finals</th>
                {!isReadOnly && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 6 : 7}>No students found in this section.</td>
                </tr>
              ) : (
                sortedStudents.map((student, index) => {
                  const studentGrade = grades[student.id] || {};
                  return (
                    <tr key={student.id}>
                      <td>{index + 1}</td>
                      <td>{student.school_id || "-"}</td>
                      <td>{student.full_name || student.username || "Unknown Student"}</td>
                      <td>{formatGradeDisplay(studentGrade.prelim_grade)}</td>
                      <td>{formatGradeDisplay(studentGrade.midterm_grade)}</td>
                      <td>{formatGradeDisplay(studentGrade.finals_grade)}</td>
                      {!isReadOnly && (
                        <td>
                          <EditButton type="button" onClick={() => handleEditClick(student)}>
                            <Edit3 size={14} />
                            Edit Grades
                          </EditButton>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </MasterListTable>
        </TableWrapper>
      )}

      {editingStudent && (
        <ModalOverlay onClick={() => !isSaving && setEditingStudent(null)}>
          <ModalContent onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <h3>
                {editingStudent.full_name} ({editingStudent.school_id || "No ID"})
              </h3>
              <button type="button" onClick={() => setEditingStudent(null)} disabled={isSaving}>
                &times;
              </button>
            </ModalHeader>

            <ModalBody>
              <FormGroup>
                <label>Prelim Grade</label>
                <Input
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={gradeForm.prelim}
                  onChange={(event) => handleGradeInput("prelim", event.target.value)}
                  onBlur={() => normalizeInputOnBlur("prelim")}
                  placeholder="1.0 - 5.0"
                  inputMode="decimal"
                />
              </FormGroup>
              <FormGroup>
                <label>Midterm Grade</label>
                <Input
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={gradeForm.midterm}
                  onChange={(event) => handleGradeInput("midterm", event.target.value)}
                  onBlur={() => normalizeInputOnBlur("midterm")}
                  placeholder="1.0 - 5.0"
                  inputMode="decimal"
                />
              </FormGroup>
              <FormGroup>
                <label>Finals Grade</label>
                <Input
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={gradeForm.finals}
                  onChange={(event) => handleGradeInput("finals", event.target.value)}
                  onBlur={() => normalizeInputOnBlur("finals")}
                  placeholder="1.0 - 5.0"
                  inputMode="decimal"
                />
              </FormGroup>

              <HintText>Allowed values: 1.0 to 5.0 with one decimal place only.</HintText>
              {formError ? <ErrorText>{formError}</ErrorText> : null}
            </ModalBody>

            <ModalFooter>
              <Button $secondary type="button" onClick={() => setEditingStudent(null)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveGrades} disabled={isSaving}>
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Grades"}
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

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  font-size: 1.75rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  font-weight: 800;
`;

const Subtitle = styled.p`
  color: var(--text-secondary);
  margin: 0;
  font-size: 1rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const SectionCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-md);
    border-color: var(--accent-primary);
  }
`;

const CardHeader = styled.div`
  padding: 1.25rem;
  background: var(--bg-tertiary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);

  svg {
    color: var(--text-secondary);
  }
`;

const Badge = styled.span`
  background: var(--accent-primary);
  color: var(--text-inverse);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.85rem;
`;

const CardBody = styled.div`
  padding: 1.25rem;
`;

const SubjectTitle = styled.h3`
  font-size: 1rem;
  margin: 0 0 1rem 0;
  color: var(--text-primary);
`;

const SubjectList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const SubjectItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;

  strong {
    color: var(--text-primary);
  }

  svg {
    color: var(--accent-primary);
    flex-shrink: 0;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem;
  color: var(--text-secondary);
  gap: 1rem;
  background: var(--bg-secondary);
  border-radius: 16px;

  svg {
    opacity: 0.5;
  }
`;

const DetailHeader = styled.div`
  margin-bottom: 1rem;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 1rem;

  &:hover {
    color: var(--accent-primary);
  }
`;

const DetailTitle = styled.div`
  h2 {
    font-size: 2rem;
    margin: 0 0 0.25rem 0;
    color: var(--text-primary);
  }

  p {
    color: var(--text-secondary);
    font-size: 1rem;
    margin: 0;
  }
`;

const FiltersCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const FilterLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-primary);
  font-weight: 600;

  svg {
    color: var(--accent-primary);
  }
`;

const SubjectSelect = styled.select`
  min-width: 280px;
  max-width: 100%;
`;

const TableWrapper = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: auto;
`;

const MasterListTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;

  thead th {
    text-align: left;
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.85rem 1rem;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
  }

  tbody td {
    padding: 0.8rem 1rem;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 0.95rem;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody tr:hover {
    background: var(--bg-tertiary);
  }
`;

const EditButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 0.4rem 0.65rem;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;

  &:hover {
    border-color: var(--accent-primary);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
`;

const ModalContent = styled.div`
  background: var(--bg-secondary);
  width: 90%;
  max-width: 520px;
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.05rem;
  }

  button {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);
    line-height: 1;

    &:hover {
      color: var(--text-primary);
    }
  }
`;

const ModalBody = styled.div`
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
  }
`;

const Input = styled.input`
  padding: 0.72rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
`;

const HintText = styled.p`
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
`;

const ErrorText = styled.p`
  margin: 0.15rem 0 0;
  color: #dc2626;
  font-size: 0.85rem;
  font-weight: 600;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem 1.25rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

const Button = styled.button`
  padding: 0.7rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s;

  background: ${(props) => (props.$secondary ? "transparent" : "var(--accent-primary)")};
  color: ${(props) => (props.$secondary ? "var(--text-secondary)" : "var(--text-inverse)")};
  border: ${(props) => (props.$secondary ? "1px solid var(--border-color)" : "none")};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.04);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export default GradeSystemView;
