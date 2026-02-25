import React, { useCallback, useEffect, useMemo, useState } from "react";
import baseStyled from "styled-components";
const styled = baseStyled as any;
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Database,
  Filter,
  KeyRound,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserX,
  XCircle,
} from "lucide-react";
import { AdminAPI } from 'services/apis/admin';
import { APP_POLLING_GUARD } from "../../../config/runtimeGuards";
import Toast from "../../common/Toast";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import PageSkeleton from "../../loaders/PageSkeleton";

const PAGE_SIZE = 20;

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "login", label: "Login" },
  { value: "session_ip_rotated", label: "Session IP Rotated" },
  { value: "admin_login_ip_change_detected", label: "Admin IP Change" },
  { value: "account_update", label: "Account Update" },
  { value: "create_account", label: "Create Account" },
  { value: "reset_password", label: "Reset Password" },
  { value: "delete_account", label: "Delete Account" },
  { value: "account_role_update", label: "Role Update" },
  { value: "account_sub_role_update", label: "Sub-Role Update" },
  { value: "account_expired_cleanup", label: "Expired Cleanup" },
  { value: "account_expired_auto_delete", label: "Auto Expired Delete" },
  { value: "dashboard_cache_hit", label: "Cache Hit" },
  { value: "dashboard_cache_miss", label: "Cache Miss" },
  { value: "dashboard_cache_bypass", label: "Cache Bypass" },
  { value: "dashboard_cache_unauthorized", label: "Cache Unauthorized" },
  { value: "dashboard_cache_invoke_failed", label: "Cache Invoke Failed" },
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
  { value: "cache", label: "Cache" },
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
  if (normalized.includes("ip_change") || normalized.includes("security")) return "warning";
  if (normalized.includes("incomplete")) return "warning";
  if (normalized.includes("rotated")) return "warning";
  if (normalized.includes("unauthorized") || normalized.includes("failed")) return "danger";
  if (normalized.includes("bypass")) return "warning";
  if (normalized.includes("hit")) return "success";
  if (normalized.includes("miss")) return "info";
  if (normalized.includes("delete")) return "danger";
  if (normalized.includes("reset")) return "warning";
  if (normalized.includes("create")) return "success";
  if (normalized.includes("login")) return "info";
  if (normalized.includes("update")) return "accent";
  return "default";
};

const categoryTone = (category) => {
  const normalized = String(category || "").toLowerCase();
  if (normalized === "cache") return "info";
  if (normalized === "auth") return "success";
  if (normalized === "role") return "accent";
  if (normalized === "account") return "warning";
  if (normalized === "system") return "danger";
  return "default";
};

const getActionIcon = (action) => {
  const normalized = String(action || "").toLowerCase();
  if (normalized.includes("rotated")) return ShieldCheck;
  if (normalized.includes("login")) return KeyRound;
  if (normalized.includes("create")) return UserPlus;
  if (normalized.includes("delete")) return Trash2;
  if (normalized.includes("reset")) return ShieldCheck;
  if (normalized.includes("update")) return Pencil;
  if (normalized.includes("hit")) return CheckCircle2;
  if (normalized.includes("unauthorized") || normalized.includes("failed")) return XCircle;
  if (normalized.includes("miss") || normalized.includes("bypass")) return AlertTriangle;
  if (normalized.includes("expired")) return UserX;
  return Activity;
};

const getCategoryIcon = (category) => {
  const normalized = String(category || "").toLowerCase();
  if (normalized === "cache") return Database;
  if (normalized === "auth") return ShieldCheck;
  if (normalized === "system") return AlertTriangle;
  return Activity;
};

const actorLabel = (log) => {
  if (log?.actor_username) return log.actor_username;
  if (log?.actor_user_id) return `User #${log.actor_user_id}`;
  return "System";
};

const targetLabel = (log) => {
  if (log?.target_username) return log.target_username;
  if (log?.target_user_id) return `User #${log.target_user_id}`;
  return "unknown";
};

const cachePageContext = (log) => {
  const metadata =
    log?.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata)
      ? log.metadata
      : {};
  const pagePath = String(metadata?.page_path || "").trim();
  const pageQuery = String(metadata?.page_query || "").trim();
  const viewName = String(metadata?.view_name || "").trim();

  const page = pagePath ? `${pagePath}${pageQuery}` : "";
  if (page && viewName) return `${page} (${viewName})`;
  return page || viewName || "";
};

const messageLine = (log) => {
  const text = String(log?.message || "").trim() || "-";
  const page = cachePageContext(log);
  if (!page) return text;
  return `${text} | Page: ${page}`;
};

const StatusLogsView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 350);

  const queryFilters = useMemo(
    () => ({
      action: filters.action,
      actor_role: filters.actor_role,
      category: filters.category,
      date_from: filters.date_from,
      date_to: filters.date_to,
      search: debouncedSearch,
      limit: 300,
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
        if (!silent) setLoading(true);

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
      }
    },
    [queryFilters],
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      loadLogs({ silent: true });
    }, APP_POLLING_GUARD.statusLogsRefreshIntervalMs);

    const handleFocus = () => {
      loadLogs({ silent: true });
    };

    const handleVisibility = () => {
      if (!document.hidden) loadLogs({ silent: true });
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>
                    <PageSkeleton variant="table" compact columns={4} />
                  </td>
                </tr>
              ) : pagedLogs.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <EmptyState>No logs found for the current filters.</EmptyState>
                  </td>
                </tr>
              ) : (
                pagedLogs.map((log) => {
                  const ActionIcon = getActionIcon(log.action);
                  const CategoryIcon = getCategoryIcon(log.category);
                  return (
                  <LogRow
                    key={log.id || `${log.created_at}-${log.action}-${log.message}`}
                    $tone={actionTone(log.action)}
                    tabIndex={0}
                    role="button"
                    onClick={() => setSelectedLog(log)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedLog(log);
                      }
                    }}
                  >
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>
                      <IdentityCell $variant="actor">
                        <CellText as="strong">{actorLabel(log)}</CellText>
                        <RoleBadge>{formatRole(log.actor_role)}</RoleBadge>
                      </IdentityCell>
                    </td>
                    <td>
                      <ActionStack>
                        <ActionBadge $tone={actionTone(log.action)}>
                          <ActionIcon size={12} />
                          <CellText>{humanize(log.action)}</CellText>
                        </ActionBadge>
                        <CategoryTag $tone={categoryTone(log.category)}>
                          <CategoryIcon size={11} />
                          <CellText>{humanize(log.category)}</CellText>
                        </CategoryTag>
                      </ActionStack>
                    </td>
                    <td>
                      <IdentityCell $variant="target">
                        <CellText as="strong">{targetLabel(log)}</CellText>
                        <RoleBadge>{formatRole(log.target_role)}</RoleBadge>
                      </IdentityCell>
                    </td>
                  </LogRow>
                );
                })
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

      {selectedLog ? (
        <DetailModalOverlay onClick={() => setSelectedLog(null)}>
          <DetailModalCard onClick={(event) => event.stopPropagation()}>
            <DetailHeader>
              <h3>Log Details</h3>
              <CloseDetailButton type="button" onClick={() => setSelectedLog(null)}>
                Close
              </CloseDetailButton>
            </DetailHeader>

            <DetailGrid>
              <DetailItem>
                <label>Timestamp</label>
                <strong>{formatDateTime(selectedLog?.created_at)}</strong>
              </DetailItem>
              <DetailItem>
                <label>Actor</label>
                <strong>
                  {actorLabel(selectedLog)} | {formatRole(selectedLog?.actor_role)}
                </strong>
              </DetailItem>
              <DetailItem>
                <label>Action</label>
                <strong>{humanize(selectedLog?.action)}</strong>
              </DetailItem>
              <DetailItem>
                <label>Category</label>
                <strong>{humanize(selectedLog?.category)}</strong>
              </DetailItem>
              <DetailItem>
                <label>Target</label>
                <strong>
                  {targetLabel(selectedLog)} | {formatRole(selectedLog?.target_role)}
                </strong>
              </DetailItem>
              <DetailItem>
                <label>Page Context</label>
                <strong>{cachePageContext(selectedLog) || "Unknown"}</strong>
              </DetailItem>
            </DetailGrid>

            <DetailMessage>
              <label>Message</label>
              <p>{messageLine(selectedLog)}</p>
            </DetailMessage>

            {selectedLog?.metadata ? (
              <DetailMeta>
                <label>Metadata</label>
                <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
              </DetailMeta>
            ) : null}
          </DetailModalCard>
        </DetailModalOverlay>
      ) : null}
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
  min-width: 860px;
  table-layout: fixed;

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
    vertical-align: middle;
    font-size: 0.88rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  tr:last-child td {
    border-bottom: none;
  }

  th:nth-child(1),
  td:nth-child(1) {
    width: 175px;
  }

  th:nth-child(2),
  td:nth-child(2) {
    width: 190px;
  }

  th:nth-child(3),
  td:nth-child(3) {
    width: 240px;
  }

  th:nth-child(4),
  td:nth-child(4) {
    width: 210px;
  }
`;

const LogRow = styled.tr`
  transition: background-color 0.18s ease;
  cursor: pointer;

  td:first-child {
    border-left: 3px solid
      ${(props) =>
        props.$tone === "danger"
          ? "#ef4444"
          : props.$tone === "warning"
            ? "#f59e0b"
            : props.$tone === "success"
              ? "#10b981"
              : props.$tone === "info"
                ? "#3b82f6"
                : props.$tone === "accent"
                  ? "var(--accent-primary)"
                  : "transparent"};
  }

  &:hover {
    background: color-mix(in srgb, var(--accent-primary) 6%, var(--bg-secondary));
  }

  &:focus-within {
    outline: 1px solid color-mix(in srgb, var(--accent-primary) 45%, transparent);
    outline-offset: -1px;
  }
`;

const IdentityCell = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  min-width: 0;
  border: 1px solid
    ${(props) =>
      props.$variant === "actor"
        ? "rgba(88, 165, 255, 0.34)"
        : props.$variant === "target"
          ? "rgba(176, 134, 255, 0.34)"
          : "var(--border-color)"};
  border-radius: 10px;
  background:
    ${(props) =>
      props.$variant === "actor"
        ? "rgba(48, 96, 165, 0.18)"
        : props.$variant === "target"
          ? "rgba(88, 59, 153, 0.16)"
          : "rgba(31, 44, 80, 0.14)"};
  padding: 7px 8px;
`;

const CellText = styled.span`
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ActionStack = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
`;

const RoleBadge = styled.span`
  border: 1px solid rgba(149, 178, 247, 0.34);
  border-radius: 999px;
  background: rgba(66, 89, 142, 0.25);
  color: rgba(224, 233, 255, 0.95);
  padding: 3px 8px;
  font-size: 0.72rem;
  font-weight: 700;
  width: fit-content;
`;

const ActionBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
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
      color: #fbbf24;
      background: rgba(251, 191, 36, 0.16);
      border-color: rgba(251, 191, 36, 0.38);
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
  gap: 5px;
  max-width: 100%;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 0.7rem;
  color: var(--text-secondary);
  background: var(--bg-tertiary);

  ${(props) =>
    props.$tone === "danger" &&
    `
      color: #ef4444;
      background: rgba(239, 68, 68, 0.10);
      border-color: rgba(239, 68, 68, 0.25);
    `}

  ${(props) =>
    props.$tone === "warning" &&
    `
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.10);
      border-color: rgba(245, 158, 11, 0.25);
    `}

  ${(props) =>
    props.$tone === "success" &&
    `
      color: #10b981;
      background: rgba(16, 185, 129, 0.10);
      border-color: rgba(16, 185, 129, 0.25);
    `}

  ${(props) =>
    props.$tone === "info" &&
    `
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.10);
      border-color: rgba(59, 130, 246, 0.25);
    `}

  ${(props) =>
    props.$tone === "accent" &&
    `
      color: var(--accent-primary);
      background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--accent-primary) 25%, transparent);
    `}
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

const DetailModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1900;
  background: rgba(8, 12, 22, 0.62);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
`;

const DetailModalCard = styled.div`
  width: min(760px, 100%);
  max-height: calc(100vh - 36px);
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-secondary);
  box-shadow: 0 18px 42px rgba(1, 4, 14, 0.55);
`;

const DetailHeader = styled.div`
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.02rem;
  }
`;

const CloseDetailButton = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 7px 11px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: var(--bg-tertiary);
  }
`;

const DetailGrid = styled.div`
  padding: 14px 16px 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const DetailItem = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 9px 10px;

  label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.74rem;
    margin-bottom: 4px;
  }

  strong {
    color: var(--text-primary);
    font-size: 0.84rem;
    line-height: 1.35;
    word-break: break-word;
  }
`;

const DetailMessage = styled.div`
  margin: 0 16px 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 10px;

  label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.74rem;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.86rem;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const DetailMeta = styled.div`
  margin: 0 16px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 10px;

  label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.74rem;
    margin-bottom: 4px;
  }

  pre {
    margin: 0;
    color: var(--text-primary);
    font-size: 0.76rem;
    line-height: 1.35;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

export default StatusLogsView;
