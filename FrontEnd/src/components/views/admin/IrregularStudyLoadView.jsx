import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { AdminAPI } from "../../../services/api";
import { BookOpen, Layers, PlusCircle, RefreshCw, Trash2, UserCheck } from "lucide-react";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";

const IrregularStudyLoadView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentLoad, setStudentLoad] = useState([]);
  const [subjectCode, setSubjectCode] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const selectedStudent = useMemo(
    () => students.find((item) => Number(item.user_id) === Number(selectedStudentId)) || null,
    [students, selectedStudentId],
  );

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const loadStudentCustomLoad = async (studentId) => {
    if (!studentId) {
      setStudentLoad([]);
      return;
    }
    try {
      const rows = await AdminAPI.getStudentCustomStudyLoad(studentId);
      setStudentLoad(Array.isArray(rows) ? rows : []);
    } catch (error) {
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
        mappedStudents.find((item) => Number(item.user_id) === Number(selectedStudentId))?.user_id ||
        mappedStudents[0]?.user_id ||
        null;

      setSelectedStudentId(nextSelectedId);
      await loadStudentCustomLoad(nextSelectedId);
    } catch (error) {
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

  const handleSelectStudent = async (studentId) => {
    setSelectedStudentId(studentId);
    setSubjectCode("");
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
    } catch (error) {
      showToast(error?.message || "Failed to add subject.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (id) => {
    if (!id) return;
    try {
      setSaving(true);
      await AdminAPI.removeStudentCustomStudyLoad(id);
      await loadStudentCustomLoad(selectedStudentId);
      showToast("Subject removed from custom study load.");
    } catch (error) {
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
            <BookOpen size={28} /> Irregular Study Load
          </h2>
          <p>Assign custom subjects for irregular students.</p>
        </div>
        <RefreshButton type="button" onClick={loadData} disabled={saving}>
          <RefreshCw size={16} />
          Refresh
        </RefreshButton>
      </Header>

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
            <UserCheck size={18} />
            <h3>Irregular Students ({students.length})</h3>
          </PanelHeader>
          {students.length === 0 ? (
            <EmptyState>No irregular students found.</EmptyState>
          ) : (
            <StudentList>
              {students.map((student) => {
                const isActive = Number(student.user_id) === Number(selectedStudentId);
                return (
                  <StudentItem
                    key={student.id || student.user_id}
                    $active={isActive}
                    onClick={() => handleSelectStudent(student.user_id)}
                  >
                    <strong>{student.full_name || student.username || "Unknown Student"}</strong>
                    <span>
                      {student.school_id || "No ID"} · {student.section || "No Section"}
                    </span>
                  </StudentItem>
                );
              })}
            </StudentList>
          )}
        </Panel>

        <Panel>
          <PanelHeader>
            <Layers size={18} />
            <h3>
              {selectedStudent
                ? `${selectedStudent.full_name || selectedStudent.username} - Custom Study Load`
                : "Custom Study Load"}
            </h3>
          </PanelHeader>

          {!selectedStudent ? (
            <EmptyState>Select an irregular student to manage custom study load.</EmptyState>
          ) : (
            <>
              <AssignRow>
                <Select
                  value={subjectCode}
                  onChange={(event) => setSubjectCode(event.target.value)}
                  disabled={saving}
                >
                  <option value="">Select subject to add</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.subject_code}>
                      {subject.subject_code} - {subject.subject_name || subject.title}
                    </option>
                  ))}
                </Select>
                <PrimaryButton type="button" onClick={handleAddSubject} disabled={saving}>
                  <PlusCircle size={16} />
                  Add
                </PrimaryButton>
              </AssignRow>

              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Semester</th>
                      <th>Units</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentLoad.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No custom subjects yet.</td>
                      </tr>
                    ) : (
                      studentLoad.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.subject_code}</strong>
                            <div>{row.subject_title}</div>
                          </td>
                          <td>{row.semester || "-"}</td>
                          <td>{row.units ?? "-"}</td>
                          <td>
                            <DangerButton
                              type="button"
                              onClick={() => handleRemoveSubject(row.id)}
                              disabled={saving}
                            >
                              <Trash2 size={14} />
                              Remove
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
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-out;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-primary);
    font-size: 1.7rem;
    font-weight: 800;
  }
  p {
    margin: 0.5rem 0 0;
    color: var(--text-secondary);
  }
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 1rem;
  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
`;

const PanelHeader = styled.div`
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  gap: 10px;
  h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
    font-weight: 700;
  }
`;

const EmptyState = styled.div`
  padding: 1.2rem;
  color: var(--text-secondary);
`;

const StudentList = styled.div`
  max-height: 520px;
  overflow: auto;
`;

const StudentItem = styled.button`
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: ${(props) => (props.$active ? "var(--bg-tertiary)" : "transparent")};
  color: var(--text-primary);
  text-align: left;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  strong {
    font-size: 0.92rem;
  }
  span {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
`;

const AssignRow = styled.div`
  padding: 1rem;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.6rem;
`;

const Select = styled.select`
  width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  background: var(--accent-primary);
  color: white;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TableWrapper = styled.div`
  padding: 0 1rem 1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 10px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    vertical-align: top;
  }
  th {
    font-size: 0.82rem;
    color: var(--text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  td div {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-top: 2px;
  }
`;

const DangerButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #ef4444;
  border-radius: 8px;
  padding: 6px 10px;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default IrregularStudyLoadView;

