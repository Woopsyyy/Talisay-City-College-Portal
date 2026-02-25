import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  KeyRound,
  LockKeyhole,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { AdminAPI } from 'services/apis/admin';
import { APP_POLLING_GUARD } from "../../../config/runtimeGuards";
import Toast from "../../common/Toast";
import PageSkeleton from "../../loaders/PageSkeleton";

const DEFAULT_CREATE_FORM = {
  full_name: "",
  username: "",
  role: "student",
  password: "",
  confirm_password: "",
  expires_at: "",
};

const DEFAULT_EDIT_FORM = {
  full_name: "",
  username: "",
  role: "student",
  school_id: "",
  expires_at: "",
  new_password: "",
  confirm_password: "",
};

const USERS_PER_PAGE = 20;
const ACCOUNT_ROLE_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "faculty", label: "Faculty" },
  { value: "dean", label: "Dean" },
  { value: "nt", label: "Non-Teaching" },
  { value: "staff", label: "Staff" },
  { value: "osas", label: "OSAS" },
  { value: "treasury", label: "Treasury" },
];
const ACCOUNT_ROLE_CANONICAL_MAP = {
  student: "student",
  teacher: "teacher",
  faculty: "teacher",
  dean: "teacher",
  nt: "nt",
  staff: "nt",
  osas: "nt",
  treasury: "nt",
};
const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "All roles" },
  ...ACCOUNT_ROLE_OPTIONS,
];

const EXPIRY_FILTER_OPTIONS = [
  { value: "all", label: "All expiration states" },
  { value: "active", label: "Active only" },
  { value: "expired", label: "Expired only" },
  { value: "with_expiration", label: "With expiration date" },
  { value: "no_expiration", label: "No expiration date" },
];

const SORT_OPTIONS = [
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "username_asc", label: "Username A-Z" },
  { value: "expiry_soonest", label: "Expiry soonest" },
  { value: "expiry_latest", label: "Expiry latest" },
];

const formatRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  if (!role) return "Unknown";
  if (role === "nt") return "Non-Teaching";
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const formatExpiry = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "No expiration";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Invalid expiration";
  return `Expires ${date.toLocaleString()}`;
};

const isExpired = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date <= new Date();
};

const toDateTimeLocalValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toCanonicalAccountRole = (value) => {
  const role = String(value || "").trim().toLowerCase();
  if (!role) return "student";
  return ACCOUNT_ROLE_CANONICAL_MAP[role] || role;
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
      // fallback to plain token parsing
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

const normalizeRoleToken = (value: unknown) => {
  const role = String(value || "").trim().toLowerCase();
  if (!role) return "";
  if (role === "go" || role === "staff" || role === "non-teaching" || role === "non_teaching" || role === "nonteaching") {
    return "nt";
  }
  return role;
};

const collectAccountRoleTokens = (user: any) => {
  const tokens = [
    ...parseRoleTokens(user?.role),
    ...parseRoleTokens(user?.roles),
    ...parseRoleTokens(user?.sub_role),
    ...parseRoleTokens(user?.sub_roles),
  ]
    .map(normalizeRoleToken)
    .filter(Boolean);
  return new Set(tokens);
};

const AccountAccessView = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [realtimeSyncing, setRealtimeSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const realtimeRefreshTimerRef = useRef(null);

  const nonAdminUsers = useMemo(() => {
    return users.filter((user) => {
      const primaryRole = String(user?.role || "").trim().toLowerCase();
      const secondaryRoles = Array.isArray(user?.roles)
        ? user.roles.map((entry) => String(entry || "").trim().toLowerCase())
        : [];
      return primaryRole !== "admin" && !secondaryRoles.includes("admin");
    });
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    let rows = [...nonAdminUsers];

    if (keyword) {
      rows = rows.filter((user) => {
        return (
          String(user.full_name || "").toLowerCase().includes(keyword) ||
          String(user.username || "").toLowerCase().includes(keyword) ||
          String(user.school_id || "").toLowerCase().includes(keyword)
        );
      });
    }

    if (roleFilter !== "all") {
      rows = rows.filter((user) => {
        const tokens = collectAccountRoleTokens(user);
        const selectedRole = String(roleFilter || "").trim().toLowerCase();
        const canonicalRole = toCanonicalAccountRole(selectedRole);
        return tokens.has(selectedRole) || tokens.has(canonicalRole);
      });
    }

    if (expiryFilter === "active") {
      rows = rows.filter((user) => !isExpired(user?.expires_at));
    } else if (expiryFilter === "expired") {
      rows = rows.filter((user) => isExpired(user?.expires_at));
    } else if (expiryFilter === "with_expiration") {
      rows = rows.filter((user) => Boolean(String(user?.expires_at || "").trim()));
    } else if (expiryFilter === "no_expiration") {
      rows = rows.filter((user) => !String(user?.expires_at || "").trim());
    }

    const compareText = (value) => String(value || "").trim().toLowerCase();
    const expiryTime = (value) => {
      const date = new Date(value || "");
      if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
      return date.getTime();
    };

    rows.sort((a, b) => {
      if (sortBy === "name_desc") {
        return compareText(b.full_name || b.username).localeCompare(compareText(a.full_name || a.username));
      }
      if (sortBy === "username_asc") {
        return compareText(a.username).localeCompare(compareText(b.username));
      }
      if (sortBy === "expiry_soonest") {
        return expiryTime(a.expires_at) - expiryTime(b.expires_at);
      }
      if (sortBy === "expiry_latest") {
        return expiryTime(b.expires_at) - expiryTime(a.expires_at);
      }
      return compareText(a.full_name || a.username).localeCompare(compareText(b.full_name || b.username));
    });

    return rows;
  }, [expiryFilter, nonAdminUsers, roleFilter, search, sortBy]);

  const accountInsights = useMemo(() => {
    const expiredCount = nonAdminUsers.filter((user) => isExpired(user?.expires_at)).length;
    const withExpiryCount = nonAdminUsers.filter((user) => String(user?.expires_at || "").trim()).length;
    const noExpiryCount = Math.max(0, nonAdminUsers.length - withExpiryCount);
    const roleCount = new Set(
      nonAdminUsers.map((user) => String(user?.role || "").trim().toLowerCase()).filter(Boolean),
    ).size;

    return [
      {
        id: "total",
        label: "Total Non-admin Accounts",
        value: nonAdminUsers.length,
        hint: `${roleCount} role group(s)`,
      },
      {
        id: "filtered",
        label: "Filtered Results",
        value: filteredUsers.length,
        hint: "Updated instantly as filters change",
      },
      {
        id: "expiry",
        label: "Expired Accounts",
        value: expiredCount,
        hint: "Needs review or extension",
      },
      {
        id: "no_expiry",
        label: "No Expiration",
        value: noExpiryCount,
        hint: realtimeSyncing ? "Realtime sync in progress" : "Realtime sync active",
      },
    ];
  }, [filteredUsers.length, nonAdminUsers, realtimeSyncing]);

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setExpiryFilter("all");
    setSortBy("name_asc");
  };

  const hasFilterOverride =
    String(search || "").trim().length > 0 ||
    roleFilter !== "all" ||
    expiryFilter !== "all" ||
    sortBy !== "name_asc";

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE)),
    [filteredUsers.length],
  );

  const pagedUsers = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    return filteredUsers.slice(start, end);
  }, [currentPage, filteredUsers, totalPages]);

  const pageRange = useMemo(() => {
    if (filteredUsers.length === 0) return { from: 0, to: 0 };
    const safePage = Math.min(currentPage, totalPages);
    const from = (safePage - 1) * USERS_PER_PAGE + 1;
    const to = Math.min(filteredUsers.length, safePage * USERS_PER_PAGE);
    return { from, to };
  }, [currentPage, filteredUsers.length, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [expiryFilter, roleFilter, search, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const validatePassword = (password, confirmPassword) => {
    if (String(password || "").length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }
    if (String(password) !== String(confirmPassword)) {
      throw new Error("Password confirmation does not match.");
    }
  };

  const closeCreateModal = () => {
    if (savingCreate) return;
    setIsCreateModalOpen(false);
    setCreateForm(DEFAULT_CREATE_FORM);
  };

  const closeEditModal = () => {
    if (savingEdit) return;
    setIsEditModalOpen(false);
    setTargetUser(null);
    setEditForm(DEFAULT_EDIT_FORM);
  };

  const loadUsers = useCallback(async ({ silent = false, forceRefresh = false } = {}) => {
    try {
      if (!silent) setLoadingUsers(true);
      const result = await AdminAPI.getUsers({
        includePurgeSummary: !silent,
        force_refresh: forceRefresh,
      });
      const rows = Array.isArray(result) ? result : result?.users;
      const deletedExpiredCount = Number(result?.deletedExpiredCount || 0);
      setUsers(Array.isArray(rows) ? rows : []);
      if (deletedExpiredCount > 0) {
        setToast({
          show: true,
          message: `${deletedExpiredCount} expired account(s) were deleted automatically.`,
          type: "warning",
        });
      }
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "Failed to load users.",
        type: "error",
      });
    } finally {
      if (!silent) setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      loadUsers({ silent: true });
    }, APP_POLLING_GUARD.accountAccessRefreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [loadUsers]);

  const handleCreateUser = async (event) => {
    event.preventDefault();
    try {
      validatePassword(createForm.password, createForm.confirm_password);
      setSavingCreate(true);
      const result = await AdminAPI.createUserWithPassword({
        full_name: createForm.full_name,
        username: createForm.username,
        role: toCanonicalAccountRole(createForm.role),
        password: createForm.password,
        expires_at: createForm.expires_at || null,
      });
      const warning = String(result?.warning || "").trim();
      setIsCreateModalOpen(false);
      setCreateForm(DEFAULT_CREATE_FORM);
      await loadUsers();
      setToast({
        show: true,
        message: warning || "User account created successfully.",
        type: warning ? "warning" : "success",
      });
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "Failed to create user.",
        type: "error",
      });
    } finally {
      setSavingCreate(false);
    }
  };

  const handleOpenEditModal = (user) => {
    if (!user?.id) return;
    setTargetUser(user);
    setEditForm({
      full_name: user.full_name || "",
      username: user.username || "",
      role: user.role || "student",
      school_id: user.school_id || "",
      expires_at: toDateTimeLocalValue(user.expires_at),
      new_password: "",
      confirm_password: "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveUserDetails = async (event) => {
    event.preventDefault();
    if (!targetUser?.id) {
      setToast({ show: true, message: "No user selected.", type: "error" });
      return;
    }

    const newPassword = String(editForm.new_password || "");
    const confirmPassword = String(editForm.confirm_password || "");

    try {
      if (!String(editForm.full_name || "").trim()) {
        throw new Error("Full name is required.");
      }
      if (!String(editForm.username || "").trim()) {
        throw new Error("Username is required.");
      }
      if (newPassword || confirmPassword) {
        validatePassword(newPassword, confirmPassword);
      }

      setSavingEdit(true);
      const updateResult = await AdminAPI.updateUserAccount(targetUser.id, {
        full_name: editForm.full_name,
        username: editForm.username,
        role: toCanonicalAccountRole(editForm.role),
        school_id: editForm.school_id,
        expires_at: editForm.expires_at || null,
      });

      const warnings = [];
      if (updateResult?.warning) warnings.push(String(updateResult.warning));

      if (newPassword) {
        const passwordResult = await AdminAPI.adminSetUserPassword(targetUser.id, newPassword);
        if (passwordResult?.warning) warnings.push(String(passwordResult.warning));
      }

      closeEditModal();
      await loadUsers();
      setToast({
        show: true,
        message: warnings[0] || "User account updated successfully.",
        type: warnings.length > 0 ? "warning" : "success",
      });
    } catch (error) {
      setToast({
        show: true,
        message: error.message || "Failed to update user account.",
        type: "error",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const queueRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) return;
    realtimeRefreshTimerRef.current = window.setTimeout(async () => {
      realtimeRefreshTimerRef.current = null;
      try {
        setRealtimeSyncing(true);
        await loadUsers({ silent: true, forceRefresh: true });
      } finally {
        setRealtimeSyncing(false);
      }
    }, 250);
  }, [loadUsers]);

  useEffect(() => {
    const usersChannel = supabase
      .channel("admin-account-access-users-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () =>
        queueRealtimeRefresh(),
      )
      .subscribe();

    return () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      supabase.removeChannel(usersChannel);
    };
  }, [queueRealtimeRefresh]);

  return (
    <Container>
      <Header>
        <div>
          <h2>
            <KeyRound size={28} />
            Account Access Control
          </h2>
          <p>
            Non-admin account management only. Admin users are handled in the dedicated Admin Accounts module.
          </p>
        </div>
        <HeaderActions>
          <SecondaryButton
            type="button"
            onClick={() => navigate("/admin/dashboard/admin_accounts")}
          >
            <ShieldCheck size={16} />
            Admin Accounts
          </SecondaryButton>
          <PrimaryButton type="button" onClick={() => setIsCreateModalOpen(true)}>
            <UserPlus size={16} />
            Create User
          </PrimaryButton>
        </HeaderActions>
      </Header>

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      <InsightGrid>
        {accountInsights.map((item) => (
          <InsightCard key={item.id}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
            <span>{item.hint}</span>
          </InsightCard>
        ))}
      </InsightGrid>

      <FilterPanel>
        <FilterPanelHeader>
          <h3>
            <SlidersHorizontal size={16} />
            Filter Section
          </h3>
          <FilterPanelHint>
            <Sparkles size={13} />
            {hasFilterOverride ? "Custom filter set active" : "Default list view"}
          </FilterPanelHint>
        </FilterPanelHeader>

        <FilterControls>
          <SearchBar>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, username, or school ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </SearchBar>

          <FilterSelect
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            {ROLE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={expiryFilter}
            onChange={(event) => setExpiryFilter(event.target.value)}
          >
            {EXPIRY_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FilterSelect>
        </FilterControls>

        <FilterActionsRow>
          <small>
            Showing <strong>{filteredUsers.length}</strong> of{" "}
            <strong>{nonAdminUsers.length}</strong> non-admin accounts.
          </small>
          <SecondaryButton type="button" onClick={clearFilters} disabled={!hasFilterOverride}>
            Reset Filters
          </SecondaryButton>
        </FilterActionsRow>
      </FilterPanel>

      <Card>
        <CardHeader>
          <div>
            <h3>
              <LockKeyhole size={18} />
              User Accounts (Non-admin)
            </h3>
            <p>Open a user card to edit username, full name, role, school ID, expiration, and password.</p>
          </div>
          <RealtimeBadge>
            <Sparkles size={13} />
            {realtimeSyncing ? "Syncing updates..." : "Realtime updates on"}
          </RealtimeBadge>
        </CardHeader>

        <CardBody>
          <ResultMeta>
            <span>
              {filteredUsers.length} account(s) | Showing {pageRange.from}-{pageRange.to}
            </span>
            <small>
              {Math.max(0, users.length - nonAdminUsers.length)} admin account(s) are managed separately.
            </small>
          </ResultMeta>

          <UserList>
            {loadingUsers ? (
              <InlineSkeletonWrap>
                <PageSkeleton variant="list" compact />
              </InlineSkeletonWrap>
            ) : filteredUsers.length === 0 ? (
              <EmptyState>No users found.</EmptyState>
            ) : (
              pagedUsers.map((user) => (
                <UserRowButton key={user.id} type="button" onClick={() => handleOpenEditModal(user)}>
                  <UserInfo>
                    <strong>{user.full_name || user.username}</strong>
                    <MetaLine>
                      @{user.username} | {user.school_id || "No School ID"}
                    </MetaLine>
                    <MetaBadges>
                      <RoleBadge>{formatRole(user.role)}</RoleBadge>
                      <ExpiryBadge $expired={isExpired(user.expires_at)}>
                        {formatExpiry(user.expires_at)}
                      </ExpiryBadge>
                    </MetaBadges>
                  </UserInfo>
                  <RowHint>Click to edit</RowHint>
                </UserRowButton>
              ))
            )}
          </UserList>

          {!loadingUsers && filteredUsers.length > 0 && (
            <PaginationRow>
              <PaginationMeta>
                Page {Math.min(currentPage, totalPages)} of {totalPages}
              </PaginationMeta>
              <PaginationControls>
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
              </PaginationControls>
            </PaginationRow>
          )}
        </CardBody>
      </Card>

      {isCreateModalOpen && (
        <ModalOverlay onClick={closeCreateModal}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <div>
                <h3>
                  <UserPlus size={18} />
                  Create User Account
                </h3>
                <p>Fill in account details, then optionally set an account duration.</p>
              </div>
              <ModalCloseButton type="button" onClick={closeCreateModal}>
                <X size={16} />
              </ModalCloseButton>
            </ModalHeader>

            <ModalForm onSubmit={handleCreateUser}>
              <DrawerNote>
                Student ID is auto-generated. Admin user creation is available in Admin Accounts only.
              </DrawerNote>

              <FormGrid>
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
                  <label>Role</label>
                  <select
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, role: event.target.value }))
                    }
                    required
                  >
                    {ACCOUNT_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Hint>Admin role is excluded here and managed in Admin Accounts.</Hint>
                </Field>
                <Field>
                  <label>Account Duration (Optional)</label>
                  <input
                    type="datetime-local"
                    value={createForm.expires_at}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, expires_at: event.target.value }))
                    }
                  />
                </Field>
              </FormGrid>

              <SectionDivider>Credential Setup</SectionDivider>

              <FormGrid>
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
              </FormGrid>

              <ModalFooter>
                <SecondaryButton type="button" onClick={closeCreateModal} disabled={savingCreate}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={savingCreate}>
                  {savingCreate ? "Creating User..." : "Create User"}
                </PrimaryButton>
              </ModalFooter>
            </ModalForm>
          </ModalCard>
        </ModalOverlay>
      )}

      {isEditModalOpen && (
        <ModalOverlay onClick={closeEditModal}>
          <ModalCard onClick={(event) => event.stopPropagation()}>
            <ModalHeader>
              <div>
                <h3>
                  <KeyRound size={18} />
                  Edit User Account
                </h3>
                <p>
                  {targetUser
                    ? `Update account details for ${targetUser.full_name || targetUser.username}.`
                    : "Select a user first."}
                </p>
              </div>
              <ModalCloseButton type="button" onClick={closeEditModal}>
                <X size={16} />
              </ModalCloseButton>
            </ModalHeader>

            <ModalForm onSubmit={handleSaveUserDetails}>
              <DrawerNote>
                Admin role edits are handled in Admin Accounts. Leave account duration blank for no expiration.
              </DrawerNote>

              <FormGrid>
                <Field>
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, full_name: event.target.value }))
                    }
                    required
                  />
                </Field>
                <Field>
                  <label>Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, username: event.target.value }))
                    }
                    required
                  />
                </Field>
                <Field>
                  <label>Role</label>
                  <select
                    value={editForm.role}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, role: event.target.value }))
                    }
                    required
                  >
                    {ACCOUNT_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Hint>Admin role is excluded here and managed in Admin Accounts.</Hint>
                </Field>
                <Field>
                  <label>School ID</label>
                  <input
                    type="text"
                    value={editForm.school_id}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, school_id: event.target.value }))
                    }
                  />
                </Field>
                <Field $full>
                  <label>Account Duration (Optional)</label>
                  <input
                    type="datetime-local"
                    value={editForm.expires_at}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, expires_at: event.target.value }))
                    }
                  />
                </Field>
              </FormGrid>

              <SectionDivider>Password Reset (Optional)</SectionDivider>

              <FormGrid>
                <Field>
                  <label>New Password</label>
                  <input
                    type="password"
                    value={editForm.new_password}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, new_password: event.target.value }))
                    }
                    placeholder="Leave blank to keep current password"
                  />
                </Field>
                <Field>
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={editForm.confirm_password}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, confirm_password: event.target.value }))
                    }
                    placeholder="Re-enter new password"
                  />
                </Field>
              </FormGrid>

              <ModalFooter>
                <SecondaryButton type="button" onClick={closeEditModal} disabled={savingEdit}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving Changes..." : "Save Changes"}
                </PrimaryButton>
              </ModalFooter>
            </ModalForm>
          </ModalCard>
        </ModalOverlay>
      )}
    </Container>
  );
};

const Container = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  color: var(--text-primary);
`;

const Header = styled.div`
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 6px 0;
  }

  p {
    margin: 0;
    color: rgba(214, 225, 255, 0.86);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const InsightGrid = styled.section`
  margin-bottom: 12px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InsightCard = styled.article`
  border: 1px solid rgba(132, 157, 233, 0.3);
  border-radius: 13px;
  background: linear-gradient(150deg, rgba(9, 17, 40, 0.92), rgba(13, 23, 51, 0.88));
  padding: 11px 12px;
  box-shadow: 0 12px 22px rgba(1, 4, 14, 0.35);

  small {
    display: block;
    color: rgba(194, 210, 255, 0.82);
    font-size: 0.74rem;
    margin-bottom: 8px;
  }

  strong {
    display: block;
    color: #f2f7ff;
    font-size: 1.35rem;
    line-height: 1;
  }

  span {
    display: block;
    margin-top: 8px;
    color: rgba(198, 214, 255, 0.78);
    font-size: 0.74rem;
  }
`;

const FilterPanel = styled.section`
  margin-bottom: 14px;
  border: 1px solid rgba(130, 157, 235, 0.3);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(8, 14, 36, 0.92), rgba(12, 22, 50, 0.9));
  box-shadow: 0 14px 26px rgba(2, 6, 18, 0.42);
  overflow: hidden;
`;

const FilterPanelHeader = styled.div`
  padding: 13px 16px;
  border-bottom: 1px solid rgba(129, 153, 227, 0.26);
  background: rgba(19, 33, 70, 0.62);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;

  h3 {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 0.98rem;
    color: #eaf1ff;
  }
`;

const FilterPanelHint = styled.span`
  border: 1px solid rgba(123, 191, 255, 0.35);
  border-radius: 999px;
  background: rgba(55, 102, 185, 0.2);
  color: rgba(220, 234, 255, 0.94);
  padding: 4px 9px;
  font-size: 0.72rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
`;

const FilterControls = styled.div`
  padding: 13px 16px;
  display: grid;
  grid-template-columns: 2fr 1fr 1.3fr 1fr;
  gap: 10px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;

const FilterSelect = styled.select`
  width: 100%;
  border: 1px solid rgba(128, 154, 224, 0.44);
  border-radius: 10px;
  background: rgba(7, 14, 36, 0.84);
  color: #ebf2ff;
  padding: 10px 11px;
  font-size: 0.86rem;

  option {
    background: #0d1734;
    color: #edf3ff;
  }
`;

const FilterActionsRow = styled.div`
  padding: 10px 16px;
  border-top: 1px solid rgba(130, 154, 226, 0.24);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  small {
    color: rgba(206, 220, 255, 0.86);
    font-size: 0.78rem;
  }

  strong {
    color: #f3f8ff;
  }

  @media (max-width: 780px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Card = styled.section`
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(8, 15, 36, 0.94), rgba(12, 21, 48, 0.9));
  box-shadow: 0 16px 28px rgba(2, 5, 16, 0.38);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(18, 31, 66, 0.76);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px 0;
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: rgba(208, 221, 255, 0.84);
    font-size: 0.9rem;
  }
`;

const RealtimeBadge = styled.span`
  border: 1px solid rgba(115, 193, 250, 0.42);
  border-radius: 999px;
  background: rgba(56, 103, 190, 0.2);
  color: rgba(225, 238, 255, 0.96);
  font-size: 0.74rem;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
`;

const CardBody = styled.div`
  padding: 16px 18px;
`;

const ResultMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(209, 221, 255, 0.86);
  font-size: 0.85rem;
  margin-bottom: 10px;
  gap: 10px;

  small {
    font-size: 0.8rem;
  }
`;

const SearchBar = styled.div`
  position: relative;
  width: 100%;
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
    border: 1px solid rgba(128, 154, 224, 0.44);
    background: rgba(7, 14, 36, 0.84);
    color: #f3f7ff;
    border-radius: 10px;
    padding: 10px 11px 10px 34px;
    font-size: 0.92rem;
  }

  input::placeholder {
    color: rgba(188, 204, 245, 0.86);
  }
`;

const UserList = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-primary);
  overflow: hidden;
`;

const UserRowButton = styled.button`
  border: none;
  border-bottom: 1px solid var(--border-color);
  width: 100%;
  padding: 12px;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  background: transparent;
  color: #e8f1ff;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: var(--bg-tertiary);
  }

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 820px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const UserInfo = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  strong {
    color: #f5f9ff;
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.25;
  }
`;

const MetaLine = styled.span`
  color: rgba(204, 218, 255, 0.87);
  font-size: 0.83rem;
  word-break: break-word;
`;

const MetaBadges = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const RoleBadge = styled.span`
  border: 1px solid var(--border-color);
  background: rgba(55, 98, 186, 0.24);
  color: #e6efff;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 700;
`;

const ExpiryBadge = styled.span<{ $expired: boolean }>`
  border: 1px solid ${(props) => (props.$expired ? "rgba(239,68,68,0.35)" : "var(--border-color)")};
  background: ${(props) => (props.$expired ? "rgba(239,68,68,0.15)" : "rgba(53, 78, 130, 0.28)")};
  color: ${(props) => (props.$expired ? "#ff8a8a" : "#dfeaff")};
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 700;
`;

const RowHint = styled.span`
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 5px 10px;
  color: rgba(218, 229, 255, 0.95);
  background: rgba(56, 79, 131, 0.2);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  padding: 18px;
  color: rgba(207, 220, 255, 0.9);
  text-align: center;
  font-size: 0.9rem;
`;

const InlineSkeletonWrap = styled.div`
  padding: 4px 0;
`;

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const PaginationMeta = styled.span`
  color: rgba(205, 218, 255, 0.9);
  font-size: 0.85rem;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 8px;
`;

const PageButton = styled.button`
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
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

const Field = styled.div<{ $full?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 0;
  min-width: 0;
  ${(props) => (props.$full ? "grid-column: 1 / -1;" : "")}

  label {
    font-size: 0.85rem;
    color: rgba(215, 227, 255, 0.92);
    font-weight: 600;
  }

  input,
  select {
    width: 100%;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: #f2f6ff;
    border-radius: 8px;
    padding: 10px 11px;
    font-size: 0.92rem;
  }

  input::placeholder {
    color: rgba(188, 203, 242, 0.85);
  }

  select option {
    background: #0d1734;
    color: #edf3ff;
  }
`;

const Hint = styled.small`
  color: rgba(203, 218, 255, 0.9);
  font-size: 0.78rem;
`;

const slideInRight = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0.6;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1800;
  background: rgba(7, 11, 22, 0.6);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  padding: 0;
`;

const ModalCard = styled.div`
  width: min(560px, 94vw);
  height: 100vh;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 16px 0 0 16px;
  border-right: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideInRight} 0.22s ease-out;

  @media (max-width: 760px) {
    width: 100vw;
    border-radius: 0;
    border-left: none;
  }
`;

const ModalHeader = styled.div`
  padding: 14px 14px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px 0;
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: rgba(206, 220, 255, 0.9);
    font-size: 0.9rem;
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
  flex: 1;
  overflow-y: auto;
  padding: 14px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const DrawerNote = styled.p`
  margin: 0;
  border: 1px solid rgba(120, 154, 241, 0.28);
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(35, 72, 160, 0.22), rgba(24, 112, 148, 0.18));
  padding: 8px 10px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(219, 232, 255, 0.93);
`;

const SectionDivider = styled.h4`
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(164, 195, 255, 0.92);
  font-weight: 700;
  padding-top: 4px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 10px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: auto;
  padding: 10px 0 2px;
  border-top: 1px solid rgba(124, 150, 217, 0.22);
  position: sticky;
  bottom: 0;
  background: linear-gradient(180deg, rgba(8, 14, 33, 0.58), rgba(8, 14, 33, 0.94));
`;

const PrimaryButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 10px 12px;
  background: var(--accent-primary);
  color: white;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
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
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
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

export default AccountAccessView;
