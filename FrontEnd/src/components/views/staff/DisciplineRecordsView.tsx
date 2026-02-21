import React, { useEffect, useMemo, useState } from "react";
import baseStyled from "styled-components";
import { BookOpenCheck, Filter, Search, ShieldAlert, X } from "lucide-react";
import { AdminAPI } from "../../../services/api";
import { COURSE_MAJOR_CONFIG, YEAR_LEVEL_OPTIONS } from "../../../Utils/constants";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";
const styled = baseStyled as any;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const titleFromAction = (action) => {
  const text = String(action || "").trim().toLowerCase();
  if (!text) return "Record";
  if (text.includes("warning")) return "Warning";
  if (text.includes("sanction")) return "Sanction";
  return text.replace(/_/g, " ");
};

const DisciplineRecordsView = () => {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [filters, setFilters] = useState({
    query: "",
    school_year: "",
    year: "",
    section: "",
    department: "",
  });

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
      showToast(error.message || "Failed to load discipline records.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

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

  const openStudentRecord = async (row) => {
    if (!row?.user_id) return;
    try {
      setDetailsLoading(true);
      const details = await AdminAPI.getDisciplineRecordForStudent(row.user_id, {
        school_year: filters.school_year || row.school_year || null,
      });
      setSelectedRecord(details || row);
    } catch (error) {
      showToast(error.message || "Failed to open student record.", "error");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => setSelectedRecord(null);

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <BookOpenCheck size={30} />
            OSAS Records
          </h2>
          <p>Review warning and sanction history by school year, section, and department.</p>
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
                  <th>Latest Level</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No discipline records found.</td>
                  </tr>
                ) : (
                  filteredRecords.map((row) => (
                    <tr key={`${row.user_id}-${row.assignment_id || "none"}`}>
                      <td>
                        <NameButton type="button" onClick={() => openStudentRecord(row)}>
                          {row.full_name || row.username || `Student #${row.user_id}`}
                        </NameButton>
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
                        {row.last_sanction_level ? (
                          <LevelBadge $major={row.last_sanction_level === "major"}>
                            {row.last_sanction_level}
                          </LevelBadge>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </Card>

      {(selectedRecord || detailsLoading) && (
        <ModalOverlay onClick={closeModal}>
          <ModalContent onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <h3>Student Discipline Record</h3>
              <CloseButton type="button" onClick={closeModal}>
                <X size={18} />
              </CloseButton>
            </ModalHeader>
            {detailsLoading ? (
              <ModalBody>
                <PageSkeleton variant="cards" count={2} />
              </ModalBody>
            ) : (
              <ModalBody>
                <SummaryGrid>
                  <SummaryCard>
                    <label>Warnings</label>
                    <strong>{selectedRecord?.warning_count || 0}</strong>
                  </SummaryCard>
                  <SummaryCard>
                    <label>Sanctions</label>
                    <strong>{selectedRecord?.sanction_count || 0}</strong>
                  </SummaryCard>
                  <SummaryCard>
                    <label>Latest Level</label>
                    <strong>{selectedRecord?.last_sanction_level || "none"}</strong>
                  </SummaryCard>
                </SummaryGrid>

                <Timeline>
                  {(selectedRecord?.events || []).length === 0 ? (
                    <TimelineItem>No warning/sanction events logged for this scope.</TimelineItem>
                  ) : (
                    selectedRecord.events.map((event) => (
                      <TimelineItem key={event.id || `${event.action}-${event.created_at}`}>
                        <div>
                          <strong>{titleFromAction(event.action)}</strong>
                          <p>{event.message || "-"}</p>
                        </div>
                        <small>{formatDateTime(event.created_at)}</small>
                      </TimelineItem>
                    ))
                  )}
                </Timeline>
              </ModalBody>
            )}
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

const NameButton = styled.button`
  border: none;
  background: transparent;
  color: var(--accent-primary);
  font-weight: 700;
  padding: 0;
  cursor: pointer;
  text-align: left;
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

const LevelBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 700;
  background: ${(props) =>
    props.$major ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.14)"};
  color: ${(props) => (props.$major ? "#ef4444" : "#d97706")};
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
  max-width: 700px;
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
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 1rem;
`;

const SummaryCard = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 0.7rem;
  label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.8rem;
  }
  strong {
    color: var(--text-primary);
    font-size: 1rem;
  }
`;

const Timeline = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
`;

const TimelineItem = styled.div`
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  &:last-child {
    border-bottom: none;
  }
  strong {
    display: block;
    color: var(--text-primary);
    text-transform: capitalize;
  }
  p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
  small {
    color: var(--text-tertiary);
    white-space: nowrap;
  }
`;

export default DisciplineRecordsView;

