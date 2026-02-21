import React, { useEffect, useMemo, useState } from "react";
import baseStyled from "styled-components";
import {
  BookOpen,
  FilterX,
  Layers,
  PlusCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  UserCheck,
} from "lucide-react";
import { AdminAPI } from "../../../services/api";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";

const styled = baseStyled as any;

const text = (value: unknown) => String(value ?? "").trim();
const lower = (value: unknown) => text(value).toLowerCase();
const semesterLabel = (value: unknown) => {
  const raw = lower(value);
  if (!raw) return "";
  if (raw.includes("1st") || raw.includes("first")) return "First Semester";
  if (raw.includes("2nd") || raw.includes("second")) return "Second Semester";
  return text(value);
};

const IrregularStudyLoadView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentLoad, setStudentLoad] = useState<any[]>([]);
  const [subjectCode, setSubjectCode] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [studentSearch, setStudentSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectSemesterFilter, setSubjectSemesterFilter] = useState("all");

  const [loadSearch, setLoadSearch] = useState("");
  const [loadSemesterFilter, setLoadSemesterFilter] = useState("all");

  const selectedStudent = useMemo(
    () => students.find((row) => Number(row.user_id) === Number(selectedStudentId)) || null,
    [students, selectedStudentId],
  );

  const sectionOptions = useMemo(
    () =>
      [...new Set(students.map((row) => text(row.section || row.section_name)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [students],
  );
  const yearOptions = useMemo(
    () => [...new Set(students.map((row) => text(row.year_level)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [students],
  );
  const departmentOptions = useMemo(
    () => [...new Set(students.map((row) => text(row.department)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [students],
  );

  const filteredStudents = useMemo(() => {
    const query = lower(studentSearch);
    return students
      .filter((row) => {
        const rowSection = text(row.section || row.section_name);
        const matchesSearch =
          !query ||
          lower(row.full_name).includes(query) ||
          lower(row.username).includes(query) ||
          lower(row.school_id).includes(query) ||
          lower(rowSection).includes(query);
        const matchesSection = sectionFilter === "all" || rowSection === sectionFilter;
        const matchesYear = yearFilter === "all" || text(row.year_level) === yearFilter;
        const matchesDepartment = departmentFilter === "all" || text(row.department) === departmentFilter;
        return matchesSearch && matchesSection && matchesYear && matchesDepartment;
      })
      .sort((a, b) => text(a.full_name || a.username).localeCompare(text(b.full_name || b.username)));
  }, [students, studentSearch, sectionFilter, yearFilter, departmentFilter]);

  const assignedCodes = useMemo(
    () => new Set(studentLoad.map((row) => lower(row.subject_code)).filter(Boolean)),
    [studentLoad],
  );

  const filteredSubjectOptions = useMemo(() => {
    const query = lower(subjectSearch);
    return subjects
      .filter((row) => !assignedCodes.has(lower(row.subject_code)))
      .filter((row) => {
        const sem = semesterLabel(row.semester);
        const matchesSearch = !query || lower(row.subject_code).includes(query) || lower(row.subject_name || row.title).includes(query);
        const matchesSemester = subjectSemesterFilter === "all" || sem === subjectSemesterFilter;
        return matchesSearch && matchesSemester;
      })
      .sort((a, b) => text(a.subject_code).localeCompare(text(b.subject_code)));
  }, [subjects, assignedCodes, subjectSearch, subjectSemesterFilter]);

  const subjectSemesterOptions = useMemo(
    () =>
      [...new Set(subjects.map((row) => semesterLabel(row.semester)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [subjects],
  );

  const filteredStudentLoad = useMemo(() => {
    const query = lower(loadSearch);
    return studentLoad
      .filter((row) => {
        const sem = semesterLabel(row.semester);
        const matchesSearch = !query || lower(row.subject_code).includes(query) || lower(row.subject_title).includes(query);
        const matchesSemester = loadSemesterFilter === "all" || sem === loadSemesterFilter;
        return matchesSearch && matchesSemester;
      })
      .sort((a, b) => text(a.subject_code).localeCompare(text(b.subject_code)));
  }, [studentLoad, loadSearch, loadSemesterFilter]);

  const loadSemesterOptions = useMemo(
    () =>
      [...new Set(studentLoad.map((row) => semesterLabel(row.semester)).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [studentLoad],
  );

  const selectedUnits = useMemo(
    () => studentLoad.reduce((sum, row) => sum + Number(row.units || 0), 0),
    [studentLoad],
  );

  const showToast = (message: string, type = "success") => {
    setToast({ show: true, message, type });
  };

  const loadStudentCustomLoad = async (studentId: number | null) => {
    if (!studentId) {
      setStudentLoad([]);
      return;
    }
    try {
      const rows = await AdminAPI.getStudentCustomStudyLoad(studentId);
      setStudentLoad(Array.isArray(rows) ? rows : []);
    } catch (error: any) {
      setStudentLoad([]);
      showToast(error?.message || "Failed to load custom study load.", "error");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [irregularStudents, subjectRows] = await Promise.all([
        AdminAPI.getIrregularStudents(),
        AdminAPI.getSubjects(),
      ]);

      const mappedStudents = Array.isArray(irregularStudents) ? irregularStudents : [];
      setStudents(mappedStudents);
      setSubjects(Array.isArray(subjectRows) ? subjectRows : []);

      const nextSelectedId =
        mappedStudents.find((row) => Number(row.user_id) === Number(selectedStudentId))?.user_id ||
        mappedStudents[0]?.user_id ||
        null;

      setSelectedStudentId(nextSelectedId ? Number(nextSelectedId) : null);
      await loadStudentCustomLoad(nextSelectedId ? Number(nextSelectedId) : null);
    } catch (error: any) {
      setStudents([]);
      setSubjects([]);
      setSelectedStudentId(null);
      setStudentLoad([]);
      showToast(error?.message || "Failed to load irregular study load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectStudent = async (studentId: number) => {
    setSelectedStudentId(studentId);
    setSubjectCode("");
    setLoadSearch("");
    setLoadSemesterFilter("all");
    await loadStudentCustomLoad(studentId);
  };

  const handleAddSubject = async () => {
    if (!selectedStudentId) {
      showToast("Please select an irregular student first.", "error");
      return;
    }
    if (!subjectCode) {
      showToast("Please select a subject.", "error");
      return;
    }

    try {
      setSaving(true);
      await AdminAPI.addStudentCustomStudyLoad({
        student_id: selectedStudentId,
        subject_code: subjectCode,
      });
      await loadStudentCustomLoad(selectedStudentId);
      setSubjectCode("");
      showToast("Custom study load subject added.");
    } catch (error: any) {
      showToast(error?.message || "Failed to add subject.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (id: number) => {
    if (!id) return;
    try {
      setSaving(true);
      await AdminAPI.removeStudentCustomStudyLoad(id);
      await loadStudentCustomLoad(selectedStudentId);
      showToast("Subject removed from custom study load.");
    } catch (error: any) {
      showToast(error?.message || "Failed to remove subject.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton variant="cards" />;

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <BookOpen size={24} /> Irregular Study Load
          </h2>
          <p>Staff workspace with filtering and quick custom-load management.</p>
        </div>
        <RefreshButton type="button" onClick={loadData} disabled={saving}>
          <RefreshCw size={16} />
          Refresh
        </RefreshButton>
      </Header>

      <StatsRow>
        <StatCard><span>Students</span><strong>{students.length}</strong></StatCard>
        <StatCard><span>Filtered</span><strong>{filteredStudents.length}</strong></StatCard>
        <StatCard><span>Selected Load</span><strong>{studentLoad.length}</strong></StatCard>
        <StatCard><span>Total Units</span><strong>{selectedUnits}</strong></StatCard>
      </StatsRow>

      {toast.show ? (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      ) : null}

      <ContentGrid>
        <Panel>
          <PanelHeader>
            <h3><UserCheck size={17} /> Irregular Students</h3>
          </PanelHeader>

          <Toolbar>
            <SearchBox>
              <Search size={14} />
              <input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search student, ID, section..."
              />
            </SearchBox>
            <Select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}>
              <option value="all">All Sections</option>
              {sectionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
            <Select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}>
              <option value="all">All Year Levels</option>
              {yearOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
            <Select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="all">All Departments</option>
              {departmentOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
            <GhostButton
              type="button"
              onClick={() => {
                setStudentSearch("");
                setSectionFilter("all");
                setYearFilter("all");
                setDepartmentFilter("all");
              }}
            >
              <FilterX size={13} /> Reset
            </GhostButton>
          </Toolbar>

          {students.length === 0 ? (
            <EmptyState>No irregular students found.</EmptyState>
          ) : filteredStudents.length === 0 ? (
            <EmptyState>No students match current filters.</EmptyState>
          ) : (
            <StudentList>
              {filteredStudents.map((student) => {
                const isActive = Number(student.user_id) === Number(selectedStudentId);
                return (
                  <StudentItem
                    key={`${student.id || "x"}-${student.user_id || "y"}`}
                    $active={isActive}
                    onClick={() => handleSelectStudent(Number(student.user_id))}
                  >
                    <strong>{text(student.full_name || student.username) || "Unknown Student"}</strong>
                    <span>{text(student.school_id) || "No ID"}</span>
                    <TagRow>
                      <Tag>{text(student.section || student.section_name) || "No Section"}</Tag>
                      <Tag>{text(student.year_level) || "No Year"}</Tag>
                      <Tag>{text(student.department) || "No Department"}</Tag>
                    </TagRow>
                  </StudentItem>
                );
              })}
            </StudentList>
          )}
        </Panel>

        <Panel>
          <PanelHeader>
            <h3><Layers size={17} /> {selectedStudent ? text(selectedStudent.full_name || selectedStudent.username) : "Custom Study Load"}</h3>
          </PanelHeader>

          {!selectedStudent ? (
            <EmptyState>Select an irregular student to manage custom study load.</EmptyState>
          ) : (
            <>
              <SubToolbar>
                <SearchBox>
                  <Search size={14} />
                  <input
                    value={subjectSearch}
                    onChange={(event) => setSubjectSearch(event.target.value)}
                    placeholder="Filter subjects to add..."
                  />
                </SearchBox>
                <Select value={subjectSemesterFilter} onChange={(event) => setSubjectSemesterFilter(event.target.value)}>
                  <option value="all">All Semesters</option>
                  {subjectSemesterOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </Select>
              </SubToolbar>

              <AssignRow>
                <Select
                  value={subjectCode}
                  onChange={(event) => setSubjectCode(event.target.value)}
                  disabled={saving || filteredSubjectOptions.length === 0}
                >
                  <option value="">{filteredSubjectOptions.length ? "Select subject to add" : "No available subjects"}</option>
                  {filteredSubjectOptions.map((subject) => (
                    <option key={`${subject.id}-${subject.subject_code}`} value={text(subject.subject_code)}>
                      {text(subject.subject_code)} - {text(subject.subject_name || subject.title)}
                    </option>
                  ))}
                </Select>
                <PrimaryButton type="button" onClick={handleAddSubject} disabled={saving || !subjectCode}>
                  <PlusCircle size={15} /> Add
                </PrimaryButton>
              </AssignRow>
              <Hint><SlidersHorizontal size={13} /> {filteredSubjectOptions.length} subject(s) available to add.</Hint>

              <SubToolbar>
                <SearchBox>
                  <Search size={14} />
                  <input
                    value={loadSearch}
                    onChange={(event) => setLoadSearch(event.target.value)}
                    placeholder="Search current custom load..."
                  />
                </SearchBox>
                <Select value={loadSemesterFilter} onChange={(event) => setLoadSemesterFilter(event.target.value)}>
                  <option value="all">All Semesters</option>
                  {loadSemesterOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </Select>
              </SubToolbar>

              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Semester</th>
                      <th>Units</th>
                      <th>School Year</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudentLoad.length === 0 ? (
                      <tr><td colSpan={5}>No custom subjects match current filters.</td></tr>
                    ) : (
                      filteredStudentLoad.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{text(row.subject_code)}</strong>
                            <div>{text(row.subject_title)}</div>
                          </td>
                          <td><SemesterPill>{semesterLabel(row.semester) || "-"}</SemesterPill></td>
                          <td>{row.units ?? "-"}</td>
                          <td>{text(row.school_year) || "-"}</td>
                          <td>
                            <DangerButton type="button" onClick={() => handleRemoveSubject(Number(row.id))} disabled={saving}>
                              <Trash2 size={14} /> Remove
                            </DangerButton>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </TableWrapper>
            </>
          )}
        </Panel>
      </ContentGrid>
    </Container>
  );
};

const Container = styled.div`
  max-width: 1450px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.9rem;
  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.45rem;
  }
  p { margin: 0.45rem 0 0; color: var(--text-secondary); }
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 1rem;
  @media (max-width: 980px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;

const StatCard = styled.div`
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 10px 12px;
  span { display: block; font-size: 0.74rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; }
  strong { display: block; margin-top: 4px; font-size: 1.15rem; }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 1rem;
  @media (max-width: 1120px) { grid-template-columns: 1fr; }
`;

const Panel = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-secondary);
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 0.95rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  h3 {
    margin: 0;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const Toolbar = styled.div`
  padding: 0.85rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
`;

const SubToolbar = styled.div`
  padding: 0.85rem 0.85rem 0;
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 8px;
  @media (max-width: 860px) { grid-template-columns: 1fr; }
`;

const SearchBox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 8px 10px;
  svg { color: var(--text-secondary); }
  input {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 0.86rem;
  }
`;

const Select = styled.select`
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 9px 10px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.84rem;
`;

const GhostButton = styled.button`
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  border-radius: 9px;
  padding: 7px 11px;
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.78rem;
  cursor: pointer;
`;

const StudentList = styled.div`
  max-height: 570px;
  overflow: auto;
`;

const StudentItem = styled.button`
  width: 100%;
  border: none;
  border-top: 1px solid var(--border-color);
  padding: 0.85rem 0.9rem;
  text-align: left;
  background: ${(props) => (props.$active ? "var(--bg-tertiary)" : "transparent")};
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
  span { font-size: 0.8rem; color: var(--text-secondary); }
`;

const TagRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  font-size: 0.72rem;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 2px 8px;
`;

const AssignRow = styled.div`
  padding: 0.85rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--accent-primary);
  color: white;
  font-weight: 700;
  cursor: pointer;
`;

const Hint = styled.div`
  padding: 0 0.85rem 0.8rem;
  color: var(--text-secondary);
  font-size: 0.78rem;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TableWrapper = styled.div`
  padding: 0.85rem;
  overflow: auto;
`;

const Table = styled.table`
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
  th, td {
    border-bottom: 1px solid var(--border-color);
    padding: 10px;
    vertical-align: top;
  }
  th {
    font-size: 0.78rem;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
  td div { margin-top: 2px; color: var(--text-secondary); font-size: 0.82rem; }
`;

const SemesterPill = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(34, 197, 94, 0.16);
  color: #22c55e;
`;

const DangerButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid #ef4444;
  border-radius: 8px;
  background: transparent;
  color: #ef4444;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
`;

const EmptyState = styled.div`
  padding: 1rem;
  color: var(--text-secondary);
`;

export default IrregularStudyLoadView;
