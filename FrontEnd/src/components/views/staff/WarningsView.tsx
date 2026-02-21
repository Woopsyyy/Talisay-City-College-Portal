import React, { useEffect, useMemo, useState } from "react";
import baseStyled from "styled-components";
import { AlertTriangle, Filter, Search, ShieldAlert, X } from "lucide-react";
import { AdminAPI } from "../../../services/api";
import { COURSE_MAJOR_CONFIG, YEAR_LEVEL_OPTIONS } from "../../../utils/constants";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";
const styled = baseStyled as any;

const WarningsView = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filters, setFilters] = useState({
    query: "",
    school_year: "",
    year: "",
    section: "",
    department: "",
  });
  const [form, setForm] = useState({
    offense_level: "minor",
    description: "",
  });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  const loadRecords = async (activeFilters = filters) => {
    try {
      setLoading(true);
      const data = await AdminAPI.getDisciplineRecords({
        school_year: activeFilters.school_year || null,
        year: activeFilters.year || null,
        section: activeFilters.section || null,
        department: activeFilters.department || null,
      });
      setRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(error.message || "Failed to load warning records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    const search = String(filters.query || "").trim().toLowerCase();
    if (!search) return records;
    return records.filter((row) => {
      const haystack = [
        row.full_name,
        row.username,
        row.school_id,
        row.section,
        row.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [records, filters.query]);

  const sectionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (records || [])
            .map((row) => String(row.section || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const openWarningModal = (record) => {
    if (!record?.assignment_id) {
      showToast("This student has no active assignment to update.", "error");
      return;
    }
    setSelectedRecord(record);
    setForm({
      offense_level: "minor",
      description: "",
    });
  };

  const closeWarningModal = () => {
    setSelectedRecord(null);
    setForm({
      offense_level: "minor",
      description: "",
    });
  };

  const submitWarning = async (event) => {
    event.preventDefault();
    if (!selectedRecord?.assignment_id) return;
    if (!String(form.description || "").trim()) {
      showToast("Description is required.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const result = await AdminAPI.issueStudentWarning(selectedRecord.assignment_id, {
        offense_level: form.offense_level,
        description: form.description,
        school_year: filters.school_year || selectedRecord.school_year || null,
      });

      if (result?.sanction_applied) {
        showToast(
          `Warning recorded. Auto-sanction applied (${result.sanction_level || "minor"} offense).`,
          "warning",
        );
      } else {
        showToast("Warning recorded successfully.");
      }

      closeWarningModal();
      await loadRecords(filters);
    } catch (error) {
      showToast(error.message || "Failed to record warning.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <AlertTriangle size={30} />
            Student Warnings
          </h2>
          <p>Issue warnings with required details. Every 3 warnings auto-applies a sanction.</p>
        </div>
      </Header>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      <Card>
        <FiltersRow>
          <FilterLabel>
            <Filter size={15} />
            Filters
          </FilterLabel>
          <FilterInput
            placeholder="Search student"
            value={filters.query}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, query: event.target.value }))
            }
          />
          <Select
            value={filters.department}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, department: event.target.value, section: "" }))
            }
          >
            <option value="">All Departments</option>
            {Object.keys(COURSE_MAJOR_CONFIG).map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </Select>
          <Select
            value={filters.year}
            onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
          >
            <option value="">All Year Levels</option>
            {YEAR_LEVEL_OPTIONS.map((year) => (
              <option key={year} value={String(year)}>
                {year} Year
              </option>
            ))}
          </Select>
          <Select
            value={filters.section}
            onChange={(event) => setFilters((prev) => ({ ...prev, section: event.target.value }))}
          >
            <option value="">All Sections</option>
            {sectionOptions.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </Select>
          <FilterInput
            placeholder="School Year (e.g. 2025-2026)"
            value={filters.school_year}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, school_year: event.target.value }))
            }
          />
          <ApplyButton type="button" onClick={() => loadRecords(filters)}>
            <Search size={16} />
            Apply
          </ApplyButton>
        </FiltersRow>

        {loading ? (
          <PageSkeleton variant="table" count={6} />
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Section</th>
                  <th>Department</th>
                  <th>Warnings</th>
                  <th>Sanctions</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No student records found.</td>
                  </tr>
                ) : (
                  filteredRecords.map((row) => (
                    <tr key={`${row.user_id}-${row.assignment_id || "none"}`}>
                      <td>
                        <strong>{row.full_name || row.username || `Student #${row.user_id}`}</strong>
                        <SmallText>{row.school_id || row.username || ""}</SmallText>
                      </td>
                      <td>{row.section || "-"}</td>
                      <td>{row.department || "-"}</td>
                      <td>
                        <CountBadge>{row.warning_count || 0}</CountBadge>
                      </td>
                      <td>
                        <CountBadge $danger>{row.sanction_count || 0}</CountBadge>
                      </td>
                      <td>
                        <WarnButton type="button" onClick={() => openWarningModal(row)}>
                          <ShieldAlert size={15} />
                          Issue Warning
                        </WarnButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </Card>

      {selectedRecord && (
        <ModalOverlay onClick={closeWarningModal}>
          <ModalContent onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <h3>Issue Warning</h3>
              <CloseButton type="button" onClick={closeWarningModal}>
                <X size={18} />
              </CloseButton>
            </ModalHeader>
            <form onSubmit={submitWarning}>
              <ModalBody>
                <p>
                  Student:{" "}
                  <strong>{selectedRecord.full_name || selectedRecord.username}</strong>
                </p>
                <FormGroup>
                  <label>Offense Level</label>
                  <Select
                    value={form.offense_level}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, offense_level: event.target.value }))
                    }
                  >
                    <option value="minor">Minor Offense</option>
                    <option value="major">Major Offense</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <label>Description</label>
                  <TextArea
                    rows={4}
                    required
                    placeholder="Enter why this warning is being issued."
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </FormGroup>
              </ModalBody>
              <ModalFooter>
                <SecondaryButton type="button" onClick={closeWarningModal}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Warning"}
                </PrimaryButton>
              </ModalFooter>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease;
`;

const Header = styled.div`
  margin-bottom: 1.5rem;
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.9rem;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-primary);
  }
  p {
    margin: 0;
    color: var(--text-secondary);
  }
`;

const Card = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.25rem;
`;

const FiltersRow = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const FilterLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 700;
`;

const FilterInput = styled.input`
  width: 100%;
  padding: 0.62rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const Select = styled.select`
  width: 100%;
  padding: 0.62rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const ApplyButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  background: var(--accent-primary);
  color: var(--text-inverse);
  font-weight: 600;
  cursor: pointer;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  th,
  td {
    padding: 0.78rem 0.55rem;
    border-bottom: 1px solid var(--border-color);
    text-align: left;
  }
  th {
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 700;
  }
  td {
    color: var(--text-primary);
  }
`;

const SmallText = styled.div`
  color: var(--text-secondary);
  font-size: 0.8rem;
  margin-top: 2px;
`;

const CountBadge = styled.span`
  display: inline-flex;
  min-width: 28px;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: ${(props) => (props.$danger ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.14)")};
  color: ${(props) => (props.$danger ? "#ef4444" : "#d97706")};
  font-weight: 700;
`;

const WarnButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 520px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  h3 {
    margin: 0;
    color: var(--text-primary);
  }
`;

const CloseButton = styled.button`
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
`;

const ModalBody = styled.div`
  padding: 1rem 1.2rem;
  p {
    margin-top: 0;
    color: var(--text-secondary);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 0.9rem;
  label {
    display: block;
    margin-bottom: 0.4rem;
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 0.65rem 0.75rem;
  resize: vertical;
`;

const ModalFooter = styled.div`
  padding: 0.95rem 1.2rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

const SecondaryButton = styled.button`
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  border-radius: 8px;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
`;

const PrimaryButton = styled.button`
  border: none;
  background: var(--accent-primary);
  color: var(--text-inverse);
  border-radius: 8px;
  padding: 0.55rem 0.95rem;
  cursor: pointer;
  font-weight: 600;
`;

export default WarningsView;


