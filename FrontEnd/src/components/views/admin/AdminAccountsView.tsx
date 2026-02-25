import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { AdminAPI } from "services/apis/admin";
import { getAvatarUrl } from "../../../services/apis/avatar";
import { getActiveUsersSnapshot, subscribeToActiveUsers } from "../../../services/activeUsers";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";

const ADMIN_FALLBACK_AVATAR = "/images/tcc-logo.png";
const ROSTER_PAGE_SIZE = 5;

const DEFAULT_CREATE_FORM = {
  full_name: "",
  username: "",
  password: "",
  confirm_password: "",
};

const DEFAULT_RESET_FORM = {
  password: "",
  confirm_password: "",
};

const isSampleAvatar = (value: unknown) => {
  const normalized = String(value || "").trim().toLowerCase();
  return (
    !normalized ||
    normalized === "images/sample.jpg" ||
    normalized === "/images/sample.jpg" ||
    normalized.endsWith("/images/sample.jpg")
  );
};

const formatDateTime = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "No data";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "No data";
  return date.toLocaleString();
};

const formatRuntime = (milliseconds: number | null, active = false) => {
  if (!Number.isFinite(milliseconds) || (milliseconds as number) <= 0) {
    return active ? "Active now" : "No runtime data";
  }

  const totalSeconds = Math.floor((milliseconds as number) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getLogIp = (row: any) => {
  const metadata = row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata
    : {};
  return String(
    metadata?.client_ip || metadata?.current_ip || metadata?.ip_address || metadata?.ip || "",
  ).trim();
};

const AdminAccountsView = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [statusLogs, setStatusLogs] = useState<any[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [rosterPage, setRosterPage] = useState(1);
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(null);
  const [deletingAdminId, setDeletingAdminId] = useState<number | null>(null);
  const [resettingAdminId, setResettingAdminId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetAdmin, setResetTargetAdmin] = useState<any | null>(null);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [resetForm, setResetForm] = useState(DEFAULT_RESET_FORM);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" as "success" | "error" | "warning" });
  const [activeUsers, setActiveUsers] = useState(() => getActiveUsersSnapshot());
  const refreshTimerRef = useRef<number | null>(null);

  const loadAdmins = useCallback(async () => {
    const rows = await AdminAPI.getUsers({ role: "admin", compact: true }).catch(() => []);
    const safeRows = Array.isArray(rows) ? rows : [];
    setAdmins(safeRows);

    const nextAvatarEntries = await Promise.all(
      safeRows.map(async (row) => {
        const userId = Number(row?.id);
        if (!Number.isFinite(userId) || userId <= 0) return [0, ADMIN_FALLBACK_AVATAR] as const;
        try {
          const resolved = await getAvatarUrl(userId, row?.image_path);
          const finalUrl = isSampleAvatar(resolved) ? ADMIN_FALLBACK_AVATAR : resolved;
          return [userId, finalUrl || ADMIN_FALLBACK_AVATAR] as const;
        } catch (_) {
          return [userId, ADMIN_FALLBACK_AVATAR] as const;
        }
      }),
    );

    const nextMap: Record<number, string> = {};
    nextAvatarEntries.forEach(([id, url]) => {
      if (id > 0) nextMap[id] = url || ADMIN_FALLBACK_AVATAR;
    });
    setAvatarMap(nextMap);
  }, []);

  const loadStatusLogs = useCallback(async () => {
    const logs = await AdminAPI.getStatusLogs({ category: "auth", limit: 600 }).catch(() => []);
    setStatusLogs(Array.isArray(logs) ? logs : []);
  }, []);

  const loadAll = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      await Promise.all([loadAdmins(), loadStatusLogs()]);
    } catch (_) {
      setToast({ show: true, type: "error", message: "Failed to load admin accounts." });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadAdmins, loadStatusLogs]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (selectedAdminId && admins.some((row) => Number(row?.id) === Number(selectedAdminId))) {
      return;
    }
    const firstId = Number(admins?.[0]?.id);
    if (Number.isFinite(firstId) && firstId > 0) {
      setSelectedAdminId(firstId);
    }
  }, [admins, selectedAdminId]);

  useEffect(() => {
    const unsubscribe = subscribeToActiveUsers((snapshot) => {
      setActiveUsers(snapshot);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const queueRealtimeRefresh = useCallback(() => {
    if (refreshTimerRef.current != null) return;
    refreshTimerRef.current = window.setTimeout(async () => {
      refreshTimerRef.current = null;
      await loadAll({ silent: true });
    }, 250);
  }, [loadAll]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-accounts-realtime")
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

  const adminsWithSecurity = useMemo(() => {
    const activeIds = new Set(
      (activeUsers?.users || [])
        .map((entry: any) => Number(entry?.user_id))
        .filter((entry) => Number.isFinite(entry) && entry > 0),
    );

    return admins.map((admin) => {
      const userId = Number(admin?.id);
      const username = String(admin?.username || "").trim().toLowerCase();
      const logs = statusLogs.filter((row) => {
        const actorId = Number(row?.actor_user_id);
        const targetId = Number(row?.target_user_id);
        if (Number.isFinite(userId) && userId > 0 && (actorId === userId || targetId === userId)) {
          return true;
        }

        const actorUsername = String(row?.actor_username || "").trim().toLowerCase();
        const targetUsername = String(row?.target_username || "").trim().toLowerCase();
        return Boolean(username && (actorUsername === username || targetUsername === username));
      });

      const loginEvent = logs.find((row) => String(row?.action || "").trim().toLowerCase() === "login") || null;
      const logoutEvent =
        logs.find((row) => ["logout", "session_ip_rotated"].includes(String(row?.action || "").trim().toLowerCase())) ||
        null;

      const lastLoginAt = String(loginEvent?.created_at || "").trim() || null;
      const lastLogoutAt = String(logoutEvent?.created_at || "").trim() || null;
      const loginIp = getLogIp(loginEvent);
      const runtimeMs = (() => {
        if (!lastLoginAt) return null;
        const loginAtMs = new Date(lastLoginAt).getTime();
        if (!Number.isFinite(loginAtMs) || loginAtMs <= 0) return null;
        const isActive = activeIds.has(userId);
        if (isActive) return Math.max(0, Date.now() - loginAtMs);

        if (!lastLogoutAt) return null;
        const logoutAtMs = new Date(lastLogoutAt).getTime();
        if (!Number.isFinite(logoutAtMs) || logoutAtMs <= 0 || logoutAtMs < loginAtMs) return null;
        return logoutAtMs - loginAtMs;
      })();

      const metadata = loginEvent?.metadata && typeof loginEvent.metadata === "object" && !Array.isArray(loginEvent.metadata)
        ? loginEvent.metadata
        : {};

      return {
        ...admin,
        securityLogs: logs.slice(0, 20),
        isActive: activeIds.has(userId),
        lastLoginAt,
        lastLogoutAt,
        lastIp: loginIp || "No IP address to flag off for this admin account.",
        room: String(metadata?.room || metadata?.login_room || "Unassigned").trim() || "Unassigned",
        runtimeMs,
        ipCheckStatus: String(metadata?.ip_check_status || "").trim(),
      };
    });
  }, [activeUsers?.users, admins, statusLogs]);

  const filteredAdmins = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    if (!keyword) return adminsWithSecurity;
    return adminsWithSecurity.filter((admin) => {
      return (
        String(admin?.full_name || "").toLowerCase().includes(keyword) ||
        String(admin?.username || "").toLowerCase().includes(keyword) ||
        String(admin?.school_id || "").toLowerCase().includes(keyword)
      );
    });
  }, [adminsWithSecurity, search]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredAdmins.length / ROSTER_PAGE_SIZE));
  }, [filteredAdmins.length]);

  useEffect(() => {
    setRosterPage(1);
  }, [search]);

  useEffect(() => {
    setRosterPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const pagedAdmins = useMemo(() => {
    const startIndex = (rosterPage - 1) * ROSTER_PAGE_SIZE;
    return filteredAdmins.slice(startIndex, startIndex + ROSTER_PAGE_SIZE);
  }, [filteredAdmins, rosterPage]);

  const rosterRangeLabel = useMemo(() => {
    if (!filteredAdmins.length) return "No admin accounts";
    const start = (rosterPage - 1) * ROSTER_PAGE_SIZE + 1;
    if (!pagedAdmins.length) return `Showing 0 of ${filteredAdmins.length}`;
    const end = start + pagedAdmins.length - 1;
    return `Showing ${start}-${end} of ${filteredAdmins.length}`;
  }, [filteredAdmins.length, pagedAdmins.length, rosterPage]);

  const selectedAdmin = useMemo(() => {
    return (
      filteredAdmins.find((row) => Number(row?.id) === Number(selectedAdminId)) ||
      adminsWithSecurity.find((row) => Number(row?.id) === Number(selectedAdminId)) ||
      filteredAdmins[0] ||
      null
    );
  }, [adminsWithSecurity, filteredAdmins, selectedAdminId]);

  const closeCreateModal = () => {
    if (savingCreate) return;
    setIsCreateModalOpen(false);
    setCreateForm(DEFAULT_CREATE_FORM);
  };

  const openResetModal = (admin: any) => {
    setResetTargetAdmin(admin || null);
    setResetForm(DEFAULT_RESET_FORM);
    setIsResetModalOpen(true);
  };

  const closeResetModal = () => {
    setIsResetModalOpen(false);
    setResetTargetAdmin(null);
    setResetForm(DEFAULT_RESET_FORM);
  };

  const handleDeleteAdmin = async (admin: any) => {
    const adminId = Number(admin?.id);
    if (!Number.isFinite(adminId) || adminId <= 0) return;

    if (adminsWithSecurity.length <= 1) {
      setToast({
        show: true,
        type: "warning",
        message: "At least one admin account must remain in the roster.",
      });
      return;
    }

    const displayName = String(admin?.full_name || admin?.username || `Admin #${adminId}`).trim();
    const confirmed = window.confirm(`Delete admin account "${displayName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingAdminId(adminId);
      await AdminAPI.deleteUser(adminId);
      if (Number(selectedAdminId) === adminId) {
        setSelectedAdminId(null);
      }
      await loadAll({ silent: true });
      setToast({
        show: true,
        type: "success",
        message: `Admin "${displayName}" was deleted.`,
      });
    } catch (error: any) {
      setToast({
        show: true,
        type: "error",
        message: error?.message || "Failed to delete admin account.",
      });
    } finally {
      setDeletingAdminId(null);
    }
  };

  const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const password = String(createForm.password || "");
    const confirmPassword = String(createForm.confirm_password || "");

    if (password.length < 8) {
      setToast({ show: true, type: "error", message: "Password must be at least 8 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setToast({ show: true, type: "error", message: "Password confirmation does not match." });
      return;
    }

    try {
      setSavingCreate(true);
      const result = await AdminAPI.createUserWithPassword({
        full_name: createForm.full_name,
        username: createForm.username,
        role: "admin",
        password,
      });

      closeCreateModal();
      await loadAll({ silent: true });
      const warning = String(result?.warning || "").trim();
      setToast({
        show: true,
        type: warning ? "warning" : "success",
        message: warning || "Admin account created successfully.",
      });
    } catch (error: any) {
      setToast({
        show: true,
        type: "error",
        message: error?.message || "Failed to create admin account.",
      });
    } finally {
      setSavingCreate(false);
    }
  };

  const handleResetAdminPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const adminId = Number(resetTargetAdmin?.id);
    if (!Number.isFinite(adminId) || adminId <= 0) {
      setToast({ show: true, type: "error", message: "Invalid admin selected." });
      return;
    }

    const password = String(resetForm.password || "");
    const confirmPassword = String(resetForm.confirm_password || "");
    if (password.length < 8) {
      setToast({ show: true, type: "error", message: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setToast({ show: true, type: "error", message: "Password confirmation does not match." });
      return;
    }

    try {
      setResettingAdminId(adminId);
      const result = await AdminAPI.adminSetUserPassword(adminId, password);
      closeResetModal();
      await loadAll({ silent: true });
      setToast({
        show: true,
        type: result?.warning ? "warning" : "success",
        message: result?.warning || "Admin password reset successfully.",
      });
    } catch (error: any) {
      setToast({
        show: true,
        type: "error",
        message: error?.message || "Failed to reset admin password.",
      });
    } finally {
      setResettingAdminId(null);
    }
  };

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <ShieldCheck size={28} />
            Admin Accounts
          </h2>
          <p>Dedicated roster for admin users with session IP, login timeline, and runtime visibility.</p>
        </div>
        <PrimaryButton type="button" onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus size={16} />
          Create Admin
        </PrimaryButton>
      </Header>

      {toast.show ? (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      ) : null}

      <Grid>
        <RosterCard>
          <CardHead>
            <h3>
              <KeyRound size={17} />
              Admin Roster
            </h3>
            <SearchInput>
              <input
                type="text"
                placeholder="Search admin name, username, or school ID"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </SearchInput>
          </CardHead>

          <ListWrap>
            {loading ? (
              <InlineSkeletonWrap>
                <PageSkeleton variant="list" compact />
              </InlineSkeletonWrap>
            ) : filteredAdmins.length === 0 ? (
              <EmptyState>No admin accounts found.</EmptyState>
            ) : (
              pagedAdmins.map((admin) => {
                const adminId = Number(admin?.id);
                const active = Number(selectedAdmin?.id) === adminId;
                return (
                  <AdminRow
                    key={adminId}
                    data-active={active}
                  >
                    <AdminIdentityButton type="button" onClick={() => setSelectedAdminId(adminId)}>
                      <img
                        src={avatarMap[adminId] || ADMIN_FALLBACK_AVATAR}
                        alt={String(admin?.username || "admin")}
                        onError={(event) => {
                          event.currentTarget.src = ADMIN_FALLBACK_AVATAR;
                        }}
                      />
                      <div>
                        <strong>{admin?.full_name || admin?.username || "Administrator"}</strong>
                        <small>@{admin?.username || "admin"}</small>
                        <MetaLine>
                          <StatusTag data-active={admin?.isActive ? "true" : "false"}>
                            {admin?.isActive ? "Active" : "Offline"}
                          </StatusTag>
                          <span>{admin?.lastIp || "No IP"}</span>
                        </MetaLine>
                      </div>
                    </AdminIdentityButton>
                    <RowActions>
                      <ResetRowButton
                        type="button"
                        disabled={resettingAdminId === adminId}
                        onClick={(event) => {
                          event.stopPropagation();
                          openResetModal(admin);
                        }}
                      >
                        <RotateCcw size={13} />
                        {resettingAdminId === adminId ? "Resetting..." : "Reset"}
                      </ResetRowButton>
                      <DeleteRowButton
                        type="button"
                        disabled={deletingAdminId === adminId || adminsWithSecurity.length <= 1}
                        title={
                          adminsWithSecurity.length <= 1
                            ? "At least one admin account must remain."
                            : "Delete admin account"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteAdmin(admin);
                        }}
                      >
                        <Trash2 size={14} />
                        {deletingAdminId === adminId ? "Deleting..." : "Delete"}
                      </DeleteRowButton>
                    </RowActions>
                  </AdminRow>
                );
              })
            )}
          </ListWrap>
          <PagerRow>
            <span>{rosterRangeLabel}</span>
            <PagerControls>
              <PagerButton
                type="button"
                onClick={() => setRosterPage((prev) => Math.max(1, prev - 1))}
                disabled={rosterPage <= 1}
              >
                <ChevronLeft size={14} />
                Prev
              </PagerButton>
              <PagerIndex>
                {rosterPage} / {totalPages}
              </PagerIndex>
              <PagerButton
                type="button"
                onClick={() => setRosterPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={rosterPage >= totalPages}
              >
                Next
                <ChevronRight size={14} />
              </PagerButton>
            </PagerControls>
          </PagerRow>
        </RosterCard>

        <DetailsCard>
          {!selectedAdmin ? (
            <EmptyState>Select an admin account to view details.</EmptyState>
          ) : (
            <>
              <IdentityHead>
                <img
                  src={avatarMap[Number(selectedAdmin?.id)] || ADMIN_FALLBACK_AVATAR}
                  alt={String(selectedAdmin?.username || "admin")}
                  onError={(event) => {
                    event.currentTarget.src = ADMIN_FALLBACK_AVATAR;
                  }}
                />
                <div>
                  <h4>{selectedAdmin?.full_name || selectedAdmin?.username || "Administrator"}</h4>
                  <p>@{selectedAdmin?.username || "admin"}</p>
                </div>
              </IdentityHead>

              <InfoGrid>
                <InfoItem>
                  <label>Latest IP Address</label>
                  <strong>{selectedAdmin?.lastIp || "No IP address to flag off for this admin account."}</strong>
                </InfoItem>
                <InfoItem>
                  <label>Last Login</label>
                  <strong>{formatDateTime(selectedAdmin?.lastLoginAt)}</strong>
                </InfoItem>
                <InfoItem>
                  <label>Last Logout / Rotation</label>
                  <strong>{formatDateTime(selectedAdmin?.lastLogoutAt)}</strong>
                </InfoItem>
                <InfoItem>
                  <label>Session Runtime</label>
                  <strong>{formatRuntime(selectedAdmin?.runtimeMs, Boolean(selectedAdmin?.isActive))}</strong>
                </InfoItem>
                <InfoItem>
                  <label>Room Context</label>
                  <strong>{selectedAdmin?.room || "Unassigned"}</strong>
                </InfoItem>
                <InfoItem>
                  <label>Role & School ID</label>
                  <strong>
                    {String(selectedAdmin?.role || "admin").toUpperCase()} | {selectedAdmin?.school_id || "No School ID"}
                  </strong>
                </InfoItem>
              </InfoGrid>

              <Guidance>
                <Globe size={14} />
                If this admin login IP changes unexpectedly, require an immediate password reset and verify recent status logs.
              </Guidance>

              <Timeline>
                <TimelineHead>
                  <Clock3 size={14} />
                  Recent security activity
                </TimelineHead>
                {selectedAdmin.securityLogs.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>IP</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAdmin.securityLogs.slice(0, 10).map((row: any) => (
                        <tr key={String(row?.id || `${row?.created_at}-${row?.action}`)}>
                          <td>{formatDateTime(row?.created_at)}</td>
                          <td>{String(row?.action || "-").replace(/_/g, " ")}</td>
                          <td>{getLogIp(row) || "No IP"}</td>
                          <td>{String(row?.message || "No description")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState>No security log entries for this admin yet.</EmptyState>
                )}
              </Timeline>
            </>
          )}
        </DetailsCard>
      </Grid>

      {isCreateModalOpen ? (
        <ModalOverlay onClick={closeCreateModal}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <div>
                <h3>
                  <UserPlus size={17} />
                  Create Admin Account
                </h3>
                <p>This flow is dedicated for admin role creation only.</p>
              </div>
              <ModalCloseButton type="button" onClick={closeCreateModal}>
                <X size={16} />
              </ModalCloseButton>
            </ModalHeader>

            <ModalForm onSubmit={handleCreateAdmin}>
              <Field>
                <label>Full Name</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, full_name: event.target.value }))
                  }
                  required
                />
              </Field>

              <Field>
                <label>Username</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, username: event.target.value }))
                  }
                  required
                />
              </Field>

              <Field>
                <label>Temporary Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </Field>

              <Field>
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={createForm.confirm_password}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, confirm_password: event.target.value }))
                  }
                  required
                />
              </Field>

              <ModalFooter>
                <SecondaryButton type="button" onClick={closeCreateModal} disabled={savingCreate}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={savingCreate}>
                  {savingCreate ? "Creating Admin..." : "Create Admin"}
                </PrimaryButton>
              </ModalFooter>
            </ModalForm>
          </ModalCard>
        </ModalOverlay>
      ) : null}

      {isResetModalOpen ? (
        <ModalOverlay onClick={closeResetModal}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <div>
                <h3>
                  <RotateCcw size={17} />
                  Reset Admin Password
                </h3>
                <p>
                  {resetTargetAdmin
                    ? `Set a new password for ${resetTargetAdmin?.full_name || resetTargetAdmin?.username}.`
                    : "Select an admin account first."}
                </p>
              </div>
              <ModalCloseButton type="button" onClick={closeResetModal}>
                <X size={16} />
              </ModalCloseButton>
            </ModalHeader>

            <ModalForm onSubmit={handleResetAdminPassword}>
              <Field>
                <label>New Password</label>
                <input
                  type="password"
                  value={resetForm.password}
                  onChange={(event) =>
                    setResetForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                  required
                />
              </Field>

              <Field>
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={resetForm.confirm_password}
                  onChange={(event) =>
                    setResetForm((prev) => ({ ...prev, confirm_password: event.target.value }))
                  }
                  required
                />
              </Field>

              <ModalFooter>
                <SecondaryButton type="button" onClick={closeResetModal} disabled={resettingAdminId != null}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={resettingAdminId != null}>
                  {resettingAdminId != null ? "Resetting..." : "Reset Password"}
                </PrimaryButton>
              </ModalFooter>
            </ModalForm>
          </ModalCard>
        </ModalOverlay>
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;

  h2 {
    margin: 0 0 5px;
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 1.95rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
  }

  @media (max-width: 880px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 12px;

  @media (max-width: 1020px) {
    grid-template-columns: 1fr;
  }
`;

const CardBase = styled.section`
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-secondary);
  overflow: hidden;
`;

const RosterCard = styled(CardBase)`
  min-height: 620px;
  display: flex;
  flex-direction: column;
`;

const DetailsCard = styled(CardBase)`
  padding: 14px;
`;

const CardHead = styled.div`
  padding: 14px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);

  h3 {
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 1rem;
  }
`;

const SearchInput = styled.div`
  input {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 10px 11px;
    font-size: 0.9rem;
  }
`;

const ListWrap = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
`;

const AdminRow = styled.div`
  width: 100%;
  border-bottom: 1px solid var(--border-color);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  background: transparent;

  &[data-active="true"] {
    background: color-mix(in oklab, var(--accent-primary) 16%, transparent);
  }

  &:hover {
    background: color-mix(in oklab, var(--accent-primary) 10%, transparent);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const AdminIdentityButton = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  cursor: pointer;
  padding: 2px;

  img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid color-mix(in oklab, var(--accent-primary) 55%, transparent);
  }

  strong {
    display: block;
    font-size: 0.9rem;
    line-height: 1.2;
  }

  small {
    color: var(--text-secondary);
    font-size: 0.8rem;
  }
`;

const DeleteRowButton = styled.button`
  border: 1px solid rgba(255, 125, 125, 0.45);
  background: rgba(123, 26, 34, 0.24);
  color: #ffd7d7;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 0.74rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(139, 31, 42, 0.36);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const ResetRowButton = styled.button`
  border: 1px solid rgba(117, 188, 255, 0.38);
  background: rgba(37, 84, 144, 0.26);
  color: #e4f1ff;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 0.74rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba(45, 96, 160, 0.35);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const PagerRow = styled.div`
  border-top: 1px solid var(--border-color);
  padding: 9px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: color-mix(in oklab, var(--bg-tertiary) 88%, transparent);

  span {
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 600;
  }
`;

const PagerControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const PagerButton = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 7px;
  padding: 6px 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.73rem;
  font-weight: 700;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const PagerIndex = styled.span`
  min-width: 54px;
  text-align: center;
  font-size: 0.74rem;
  color: var(--text-primary);
  font-weight: 700;
`;

const MetaLine = styled.div`
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  span {
    color: var(--text-secondary);
    font-size: 0.72rem;
  }
`;

const StatusTag = styled.span`
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--accent-primary) 55%, transparent);
  background: color-mix(in oklab, var(--accent-primary) 16%, transparent);
  color: var(--text-primary);
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 700;

  &[data-active="true"] {
    border-color: rgba(82, 229, 161, 0.38);
    background: rgba(33, 124, 78, 0.24);
  }
`;

const IdentityHead = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  img {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid color-mix(in oklab, var(--accent-primary) 60%, transparent);
  }

  h4 {
    margin: 0;
    font-size: 1.1rem;
  }

  p {
    margin: 3px 0 0;
    color: var(--text-secondary);
    font-size: 0.86rem;
  }
`;

const InfoGrid = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

const InfoItem = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  padding: 9px 10px;

  label {
    display: block;
    color: var(--text-secondary);
    font-size: 0.75rem;
    margin-bottom: 5px;
  }

  strong {
    font-size: 0.84rem;
    line-height: 1.35;
    word-break: break-word;
  }
`;

const Guidance = styled.div`
  margin-top: 10px;
  border: 1px solid color-mix(in oklab, var(--accent-primary) 45%, transparent);
  border-radius: 10px;
  background: color-mix(in oklab, var(--accent-primary) 11%, transparent);
  color: var(--text-primary);
  padding: 8px 10px;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const Timeline = styled.div`
  margin-top: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    padding: 9px 8px;
    font-size: 0.76rem;
    border-bottom: 1px solid var(--border-color);
    text-align: left;
    color: var(--text-primary);
    vertical-align: top;
    word-break: break-word;
  }

  th {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.68rem;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const TimelineHead = styled.div`
  padding: 9px 10px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.8rem;
  font-weight: 700;
`;

const EmptyState = styled.div`
  color: var(--text-secondary);
  padding: 20px;
  text-align: center;
  font-size: 0.9rem;
`;

const InlineSkeletonWrap = styled.div`
  padding: 6px 4px;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1800;
  background: rgba(7, 12, 24, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalCard = styled.div`
  width: min(560px, 100%);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-secondary);
`;

const ModalHeader = styled.div`
  padding: 14px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;

  h3 {
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.84rem;
  }
`;

const ModalCloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: var(--bg-secondary);
  }
`;

const ModalForm = styled.form`
  padding: 14px;
`;

const Field = styled.div`
  margin-bottom: 11px;

  label {
    display: block;
    font-size: 0.82rem;
    color: var(--text-secondary);
    margin-bottom: 6px;
    font-weight: 600;
  }

  input {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 10px 11px;
    font-size: 0.9rem;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
`;

const PrimaryButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--accent-primary);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover:not(:disabled) {
    background: var(--accent-highlight);
  }

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--bg-primary);
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
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export default AdminAccountsView;
