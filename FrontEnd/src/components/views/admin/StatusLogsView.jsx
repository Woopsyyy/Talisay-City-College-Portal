import React, { useCallback, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { Activity, CalendarClock, Filter, RefreshCw, Search } from "lucide-react";
import { AdminAPI } from "../../../services/api";
import Toast from "../../common/Toast";
import useDebouncedValue from "../../../hooks/useDebouncedValue";

const PAGE_SIZE = 20;

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "login", label: "Login" },
  { value: "account_update", label: "Account Update" },
  { value: "create_account", label: "Create Account" },
  { value: "reset_password", label: "Reset Password" },
  { value: "delete_account", label: "Delete Account" },
  { value: "account_role_update", label: "Role Update" },
  { value: "account_sub_role_update", label: "Sub-Role Update" },
  { value: "account_expired_cleanup", label: "Expired Cleanup" },
  { value: "account_expired_auto_delete", label: "Auto Expired Delete" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "nt", label: "Non-Teaching" },
  { value: "system", label: "System" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "auth", label: "Auth" },
  { value: "account", label: "Account" },
  { value: "role", label: "Role" },
  { value: "system", label: "System" },
  { value: "general", label: "General" },
];

const INITIAL_FILTERS = {
  search: "",
  action: "",
  actor_role: "",
  category: "",
  date_from: "",
  date_to: "",
};

const humanize = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatRole = (value) => {
  const role = String(value || "")
    .trim()
    .toLowerCase();
  if (!role) return "Unknown";
  if (role === "nt") return "Non-Teaching";
  return humanize(role);
};

const actionTone = (action) => {
  const normalized = String(action || "").toLowerCase();
  if (normalized.includes("delete")) return "danger";
  if (normalized.includes("reset")) return "warning";
  if (normalized.includes("create")) return "success";
  if (normalized.includes("login")) return "info";
  if (normalized.includes("update")) return "accent";
  return "default";
};

const actorLabel = (log) => {
  if (log?.actor_username) return log.actor_username;
  if (log?.actor_user_id) return `User #${log.actor_user_id}`;
  return "System";
};

const targetLabel = (log) => {
  if (log?.target_username) return log.target_username;
  if (log?.target_user_id) return `User #${log.target_user_id}`;
  return "N/A";
};

const StatusLogsView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const queryFilters = useMemo(
    () => ({
      action: filters.action,
      actor_role: filters.actor_role,
      category: filters.category,
      date_from: filters.date_from,
      date_to: filters.date_to,
      search: debouncedSearch,
      limit: 1000,
    }),
    [
      debouncedSearch,
      filters.action,
      filters.actor_role,
      filters.category,
      filters.date_from,
      filters.date_to,
    ],
  );

  const loadLogs = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

        const rows = await AdminAPI.getStatusLogs(queryFilters);
        setLogs(Array.isArray(rows) ? rows : []);
      } catch (error) {
        setToast({
          show: true,
          message: error.message || "Failed to load status logs.",
          type: "error",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryFilters],
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [queryFilters]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(logs.length / PAGE_SIZE)),
    [logs.length],
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedLogs = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return logs.slice(start, end);
  }, [currentPage, logs, totalPages]);

  const range = useMemo(() => {
    if (!logs.length) return { from: 0, to: 0 };
    const safePage = Math.min(currentPage, totalPages);
    const from = (safePage - 1) * PAGE_SIZE + 1;
    const to = Math.min(logs.length, safePage * PAGE_SIZE);
    return { from, to };
  }, [currentPage, logs.length, totalPages]);

  const resetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
  };

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <Activity size={28} />
            Status Logs
          </h2>
          <p>Track login activity, account updates, role changes, and admin actions.</p>
        </div>
        <HeaderActions>
          <RefreshButton type="button" onClick={() => loadLogs({ silent: true })} disabled={refreshing}>
            <RefreshCw size={16} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </RefreshButton>
        </HeaderActions>
      </Header>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      <FilterCard>
        <FilterHead>
          <h3>
            <Filter size={16} />
            Filter Logs
          </h3>
        </FilterHead>

        <FilterGrid>
          <SearchWrap>
            <Search size={15} />
            <input
              type="text"
              placeholder="Search action, actor, target, or message"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </SearchWrap>

          <select
            value={filters.action}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, action: event.target.value }))
            }
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value || "all-action"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.actor_role}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, actor_role: event.target.value }))
            }
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value || "all-role"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, category: event.target.value }))
            }
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value || "all-category"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <DateInput>
            <CalendarClock size={14} />
            <input
              type="date"
              value={filters.date_from}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, date_from: event.target.value }))
              }
            />
          </DateInput>

          <DateInput>
            <CalendarClock size={14} />
            <input
              type="date"
              value={filters.date_to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, date_to: event.target.value }))
              }
            />
          </DateInput>
        </FilterGrid>

        <FilterActions>
          <ClearButton type="button" onClick={resetFilters}>
            Clear Filters
          </ClearButton>
        </FilterActions>
      </FilterCard>

      <LogsCard>
        <CardMeta>
          <span>
            {logs.length} event(s) | Showing {range.from}-{range.to}
          </span>
          <small>Page {Math.min(currentPage, totalPages)} of {totalPages}</small>
        </CardMeta>

        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>Loading status logs...</EmptyState>
                  </td>
                </tr>
              ) : pagedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState>No logs found for the current filters.</EmptyState>
                  </td>
                </tr>
              ) : (
                pagedLogs.map((log) => (
                  <tr key={log.id || `${log.created_at}-${log.action}-${log.message}`}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>
                      <IdentityCell>
                        <strong>{actorLabel(log)}</strong>
                        <RoleBadge>{formatRole(log.actor_role)}</RoleBadge>
                      </IdentityCell>
                    </td>
                    <td>
                      <ActionBadge $tone={actionTone(log.action)}>
                        {humanize(log.action)}
                      </ActionBadge>
                      <CategoryTag>{humanize(log.category)}</CategoryTag>
                    </td>
                    <td>
                      <IdentityCell>
                        <strong>{targetLabel(log)}</strong>
                        <RoleBadge>{formatRole(log.target_role)}</RoleBadge>
                      </IdentityCell>
                    </td>
                    <td>{log.message || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>

        {!loading && logs.length > 0 && (
          <PaginationRow>
            <PageButton
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </PageButton>
            <PageButton
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </PageButton>
          </PaginationRow>
        )}
      </LogsCard>
    </Container>
  );
};

const Container = styled.div`
  max-width: 1300px;
  margin: 0 auto;
  color: var(--text-primary);
`;

const Header = styled.div`
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 6px 0;
    font-size: 2rem;
    font-weight: 800;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
  }

  @media (max-width: 820px) {
    flex-direction: column;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const RefreshButton = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 9px 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const FilterCard = styled.section`
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-secondary);
  margin-bottom: 14px;
  overflow: hidden;
`;

const FilterHead = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);

  h3 {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
  }
`;

const FilterGrid = styled.div`
  padding: 14px 16px;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;

  select {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 9px 10px;
    font-size: 0.85rem;
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`;

const SearchWrap = styled.div`
  position: relative;
  min-width: 0;

  svg {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }

  input {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 9px 11px 9px 33px;
    font-size: 0.9rem;
  }
`;

const DateInput = styled.div`
  position: relative;

  svg {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
  }

  input {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 9px 11px 9px 31px;
    font-size: 0.86rem;
  }
`;

const FilterActions = styled.div`
  border-top: 1px solid var(--border-color);
  padding: 10px 16px;
  display: flex;
  justify-content: flex-end;
`;

const ClearButton = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 11px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: var(--bg-tertiary);
  }
`;

const LogsCard = styled.section`
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-secondary);
  overflow: hidden;
`;

const CardMeta = styled.div`
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.82rem;
`;

const TableWrap = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 950px;

  th {
    text-align: left;
    font-size: 0.82rem;
    color: var(--text-secondary);
    font-weight: 700;
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-tertiary);
  }

  td {
    padding: 12px;
    border-bottom: 1px solid var(--border-color);
    vertical-align: top;
    font-size: 0.88rem;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

const IdentityCell = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
`;

const RoleBadge = styled.span`
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 3px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  width: fit-content;
`;

const ActionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid transparent;
  margin-right: 6px;

  ${(props) =>
    props.$tone === "danger" &&
    `
      color: #ef4444;
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.28);
    `}

  ${(props) =>
    props.$tone === "warning" &&
    `
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.28);
    `}

  ${(props) =>
    props.$tone === "success" &&
    `
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.28);
    `}

  ${(props) =>
    props.$tone === "info" &&
    `
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.12);
      border-color: rgba(59, 130, 246, 0.28);
    `}

  ${(props) =>
    props.$tone === "accent" &&
    `
      color: var(--accent-primary);
      background: color-mix(in srgb, var(--accent-primary) 14%, transparent);
      border-color: color-mix(in srgb, var(--accent-primary) 30%, transparent);
    `}

  ${(props) =>
    props.$tone === "default" &&
    `
      color: var(--text-secondary);
      background: var(--bg-tertiary);
      border-color: var(--border-color);
    `}
`;

const CategoryTag = styled.span`
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--bg-tertiary);
`;

const EmptyState = styled.div`
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
`;

const PaginationRow = styled.div`
  border-top: 1px solid var(--border-color);
  padding: 10px 14px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const PageButton = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 8px 12px;
  font-size: 0.83rem;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default StatusLogsView;
