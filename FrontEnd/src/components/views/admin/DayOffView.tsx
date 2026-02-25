import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { Activity, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Toast from "../../common/Toast";
import { AdminAPI } from "services/apis/admin";
import { getAvatarUrl } from "../../../services/apis/avatar";
import { supabase } from "../../../supabaseClient";
import PageSkeleton from "../../loaders/PageSkeleton";

type DayOffStatus = "present" | "on_leave" | "on_holiday" | "absent";
type DayOffRow = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  roleTokens: string[];
  avatarUrl: string;
  dayOffStatus: DayOffStatus;
  statusUpdatedAt: string | null;
};

const DAY_OFF_STATUSES: DayOffStatus[] = ["present", "on_leave", "on_holiday", "absent"];
const FALLBACK_AVATAR = "/images/tcc-logo.png";
const PAGE_SIZE = 8;

const normalizeDayOffStatus = (value: unknown): DayOffStatus => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "on_leave") return "on_leave";
  if (normalized === "on_holiday") return "on_holiday";
  if (normalized === "absent") return "absent";
  return "present";
};

const parseRoleTokens = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean);
  }
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return [];
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry || "").trim().toLowerCase())
          .filter(Boolean);
      }
    } catch (_) {
      // fallback to plain token parsing below
    }
  }
  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }
  return [raw];
};

const normalizeRoleKey = (value: unknown) => {
  const role = String(value || "").trim().toLowerCase();
  if (!role) return "";
  if (role === "go") return "nt";
  if (role === "staff") return "nt";
  if (role === "non-teaching" || role === "non_teaching" || role === "non teaching") return "nt";
  return role;
};

const formatRoleLabel = (value: string) => {
  const role = normalizeRoleKey(value);
  if (!role) return "Staff";
  if (role === "nt") return "Non-Teaching";
  if (role === "osas") return "OSAS";
  if (role === "treasury") return "Treasury";
  if (role === "dean") return "Dean";
  if (role === "admin") return "Admin";
  if (role === "faculty") return "Faculty";
  if (role === "teacher") return "Teacher";
  if (role === "staff") return "Staff";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const formatDayOffStatus = (value: DayOffStatus) => {
  if (value === "on_leave") return "On Leave";
  if (value === "on_holiday") return "On Holiday";
  if (value === "absent") return "Absent";
  return "Present";
};

const isEligible = (user: any) => {
  const roles = Array.from(
    new Set([
      ...parseRoleTokens(user?.role),
      ...parseRoleTokens(user?.roles),
      ...parseRoleTokens(user?.sub_role),
      ...parseRoleTokens(user?.sub_roles),
    ]),
  )
    .map(normalizeRoleKey)
    .filter(Boolean);

  if (!roles.length) return false;
  return roles.some((role) => role !== "student");
};

const DayOffView = () => {
  const [rows, setRows] = useState<DayOffRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "warning";
  }>({
    show: false,
    message: "",
    type: "success",
  });
  const refreshTimerRef = useRef<number | null>(null);
  const avatarCacheRef = useRef<Map<number, { imagePath: string; url: string }>>(new Map());

  const loadRoster = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      if (silent) setSyncing(true);

      const [usersResult, logsResult] = await Promise.all([
        AdminAPI.getUsers({ compact: true }).catch(() => []),
        AdminAPI.getStatusLogs({ category: "attendance", limit: 400 }).catch(() => []),
      ]);

      const users = Array.isArray(usersResult) ? usersResult : [];
      const statusLogs = Array.isArray(logsResult) ? logsResult : [];

      const eligibleUsers = users.filter(isEligible);
      const latestStatusByUser = new Map<number, { status: DayOffStatus; updatedAt: string | null }>();

      statusLogs.forEach((entry) => {
        const action = String(entry?.action || "").trim().toLowerCase();
        if (!["day_off_status_set", "day_off_status_cleared"].includes(action)) return;

        const userId = Number(entry?.target_user_id);
        if (!Number.isFinite(userId) || userId <= 0) return;
        if (latestStatusByUser.has(userId)) return;

        const metadata =
          entry?.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
            ? entry.metadata
            : {};

        const status =
          action === "day_off_status_cleared"
            ? "present"
            : normalizeDayOffStatus(metadata?.day_off_status);

        latestStatusByUser.set(userId, {
          status,
          updatedAt: String(entry?.created_at || "").trim() || null,
        });
      });

      const rowsWithAvatar = await Promise.all(
        eligibleUsers.map(async (user) => {
          const userId = Number(user?.id);
          if (!Number.isFinite(userId) || userId <= 0) return null;

          const latest = latestStatusByUser.get(userId);
          const tableStatus = normalizeDayOffStatus((user as any)?.day_off_status);
          const dayOffStatus = latest?.status || tableStatus;
          const statusUpdatedAt = latest?.updatedAt || null;

          const imagePath = String(user?.image_path || "").trim();
          const cachedAvatar = avatarCacheRef.current.get(userId);
          let avatarUrl = cachedAvatar?.url || FALLBACK_AVATAR;

          if (!cachedAvatar || cachedAvatar.imagePath !== imagePath) {
            try {
              const resolved = await getAvatarUrl(userId, imagePath);
              avatarUrl = String(resolved || "").trim() || FALLBACK_AVATAR;
            } catch (_) {
              avatarUrl = FALLBACK_AVATAR;
            }
            avatarCacheRef.current.set(userId, { imagePath, url: avatarUrl });
          }

          const roleTokens = Array.from(
            new Set([
              ...parseRoleTokens(user?.role),
              ...parseRoleTokens(user?.roles),
              ...parseRoleTokens(user?.sub_role),
              ...parseRoleTokens(user?.sub_roles),
            ]),
          )
            .map(normalizeRoleKey)
            .filter((entry) => Boolean(entry) && entry !== "student");

          const roleLabel = roleTokens.length
            ? roleTokens.map((token) => formatRoleLabel(token)).join(" | ")
            : "Staff";

          return {
            id: userId,
            username: String(user?.username || `user-${userId}`),
            fullName: String(user?.full_name || user?.username || `User ${userId}`),
            role: roleLabel,
            roleTokens,
            avatarUrl,
            dayOffStatus,
            statusUpdatedAt,
          } as DayOffRow;
        }),
      );

      const nextRows = rowsWithAvatar
        .filter(Boolean)
        .sort((a, b) => String(a?.fullName || "").localeCompare(String(b?.fullName || ""))) as DayOffRow[];
      setRows(nextRows);
    } catch (error: any) {
      setToast({
        show: true,
        type: "error",
        message: error?.message || "Failed to load Day Off roster.",
      });
    } finally {
      if (!silent) setLoading(false);
      if (silent) setSyncing(false);
    }
  }, []);

  const queueRealtimeRefresh = useCallback(() => {
    if (refreshTimerRef.current != null) return;
    refreshTimerRef.current = window.setTimeout(async () => {
      refreshTimerRef.current = null;
      await loadRoster({ silent: true });
    }, 250);
  }, [loadRoster]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  useEffect(() => {
    const channel = supabase
      .channel("day-off-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        queueRealtimeRefresh();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "status_logs" }, () => {
        queueRealtimeRefresh();
      })
      .subscribe();

    const handleFocus = () => queueRealtimeRefresh();
    const handleVisibility = () => {
      if (!document.hidden) queueRealtimeRefresh();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (refreshTimerRef.current != null) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [queueRealtimeRefresh]);

  const filteredRows = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => {
      return (
        row.fullName.toLowerCase().includes(keyword) ||
        row.username.toLowerCase().includes(keyword) ||
        row.role.toLowerCase().includes(keyword)
      );
    });
  }, [rows, search]);

  const roleOptions = useMemo(() => {
    const uniqueRoles = Array.from(
      new Set(
        rows
          .flatMap((row) => (Array.isArray(row.roleTokens) ? row.roleTokens : []))
          .map(normalizeRoleKey)
          .filter(Boolean),
      ),
    );
    uniqueRoles.sort((a, b) => formatRoleLabel(a).localeCompare(formatRoleLabel(b)));
    return [
      { value: "all", label: "All roles" },
      ...uniqueRoles.map((role) => ({ value: role, label: formatRoleLabel(role) })),
    ];
  }, [rows]);

  const filteredByRoleRows = useMemo(() => {
    if (roleFilter === "all") return filteredRows;
    return filteredRows.filter((row) =>
      Array.isArray(row.roleTokens) ? row.roleTokens.includes(roleFilter) : false,
    );
  }, [filteredRows, roleFilter]);

  const summary = useMemo(() => {
    return {
      total: filteredByRoleRows.length,
      present: filteredByRoleRows.filter((row) => row.dayOffStatus === "present").length,
      onLeave: filteredByRoleRows.filter((row) => row.dayOffStatus === "on_leave").length,
      onHoliday: filteredByRoleRows.filter((row) => row.dayOffStatus === "on_holiday").length,
      absent: filteredByRoleRows.filter((row) => row.dayOffStatus === "absent").length,
    };
  }, [filteredByRoleRows]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredByRoleRows.length / PAGE_SIZE)),
    [filteredByRoleRows.length],
  );
  const pagedRows = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredByRoleRows.slice(start, start + PAGE_SIZE);
  }, [filteredByRoleRows, page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handleSetDayOffStatus = useCallback(
    async (row: DayOffRow, status: DayOffStatus) => {
      if (savingUserId != null) return;
      if (row.dayOffStatus === status) return;

      try {
        setSavingUserId(row.id);
        await AdminAPI.setUserDayOffStatus(row.id, status);
        setRows((prev) =>
          prev.map((entry) =>
            entry.id === row.id
              ? { ...entry, dayOffStatus: status, statusUpdatedAt: new Date().toISOString() }
              : entry,
          ),
        );
        setToast({
          show: true,
          type: "success",
          message: `${row.fullName} marked as ${formatDayOffStatus(status)}.`,
        });
        queueRealtimeRefresh();
      } catch (error: any) {
        setToast({
          show: true,
          type: "error",
          message: error?.message || "Failed to update Day Off status.",
        });
      } finally {
        setSavingUserId(null);
      }
    },
    [queueRealtimeRefresh, savingUserId],
  );

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <CalendarDays size={27} />
            Day Off Management
          </h2>
          <p>Set leave, holiday, absent, or present status for staff, teachers, and admins.</p>
        </div>
        <SyncBadge>
          <Activity size={13} />
          {syncing ? "Realtime syncing..." : "Realtime updates active"}
        </SyncBadge>
      </Header>

      {toast.show ? (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      ) : null}

      <SummaryGrid>
        <SummaryCard>
          <strong>{summary.total}</strong>
          <span>Total Tracked</span>
        </SummaryCard>
        <SummaryCard>
          <strong>{summary.present}</strong>
          <span>Present</span>
        </SummaryCard>
        <SummaryCard>
          <strong>{summary.onLeave}</strong>
          <span>On Leave</span>
        </SummaryCard>
        <SummaryCard>
          <strong>{summary.onHoliday}</strong>
          <span>On Holiday</span>
        </SummaryCard>
        <SummaryCard>
          <strong>{summary.absent}</strong>
          <span>Absent</span>
        </SummaryCard>
      </SummaryGrid>

      <SearchWrap>
        <input
          type="text"
          placeholder="Search by name, username, or role"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </SearchWrap>

      <Roster>
        {loading ? (
          <InlineSkeletonWrap>
            <PageSkeleton variant="list" compact />
          </InlineSkeletonWrap>
        ) : pagedRows.length > 0 ? (
          pagedRows.map((row) => (
            <Row key={row.id}>
              <Identity>
                <img
                  src={row.avatarUrl || FALLBACK_AVATAR}
                  alt={row.username}
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_AVATAR;
                  }}
                />
                <div>
                  <strong>{row.fullName}</strong>
                  <small>
                    @{row.username} | {row.role}
                  </small>
                  <small>Current: {formatDayOffStatus(row.dayOffStatus)}</small>
                </div>
              </Identity>
              <Actions>
                {DAY_OFF_STATUSES.map((statusValue) => (
                  <StatusButton
                    key={`${row.id}-${statusValue}`}
                    type="button"
                    data-active={row.dayOffStatus === statusValue}
                    onClick={() => handleSetDayOffStatus(row, statusValue)}
                    disabled={savingUserId != null}
                  >
                    {formatDayOffStatus(statusValue)}
                  </StatusButton>
                ))}
              </Actions>
            </Row>
          ))
        ) : (
          <EmptyState>No non-student users found.</EmptyState>
        )}
      </Roster>

      {filteredByRoleRows.length > 0 ? (
        <Pager>
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
            <ChevronLeft size={14} />
            Previous
          </button>
          <span>
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight size={14} />
          </button>
        </Pager>
      ) : null}
    </Container>
  );
};

const Container = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  color: var(--text-primary);
`;

const Header = styled.div`
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;

  h2 {
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1.8rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
  }

  @media (max-width: 860px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SyncBadge = styled.span`
  border: 1px solid rgba(125, 197, 255, 0.35);
  border-radius: 999px;
  background: rgba(45, 88, 171, 0.22);
  color: rgba(220, 236, 255, 0.96);
  font-size: 0.75rem;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
`;

const SummaryGrid = styled.div`
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 920px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const SummaryCard = styled.article`
  border: 1px solid var(--border-color);
  border-radius: 11px;
  background: var(--bg-secondary);
  padding: 10px 11px;

  strong {
    display: block;
    font-size: 1.1rem;
    color: #f5f9ff;
    line-height: 1;
  }

  span {
    margin-top: 6px;
    display: block;
    color: var(--text-secondary);
    font-size: 0.76rem;
  }
`;

const SearchWrap = styled.div`
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 8px;

  input {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 10px 11px;
    font-size: 0.9rem;
  }

  select {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 10px 11px;
    font-size: 0.86rem;

    option {
      background: #081229;
      color: #eaf2ff;
    }
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const Roster = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-secondary);
  overflow: hidden;
`;

const Row = styled.article`
  border-bottom: 1px solid var(--border-color);
  padding: 10px;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 12px;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Identity = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(128, 164, 241, 0.42);
  }

  strong {
    display: block;
    font-size: 0.9rem;
    color: #f4f8ff;
  }

  small {
    display: block;
    color: var(--text-secondary);
    font-size: 0.77rem;
    margin-top: 2px;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const StatusButton = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: rgba(53, 82, 136, 0.2);
  color: #e8f1ff;
  padding: 6px 9px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;

  &[data-active="true"] {
    border-color: rgba(120, 206, 255, 0.7);
    background: rgba(49, 122, 194, 0.32);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: 18px;
  text-align: center;
  color: var(--text-secondary);
`;

const InlineSkeletonWrap = styled.div`
  padding: 4px 0;
`;

const Pager = styled.div`
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;

  span {
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
  }

  button {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 7px 10px;
    font-size: 0.78rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export default DayOffView;
