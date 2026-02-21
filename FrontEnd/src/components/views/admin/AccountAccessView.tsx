import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { KeyRound, LockKeyhole, RefreshCw, Search, UserPlus } from "lucide-react";
import { supabase } from "../../../supabaseClient";
import { AdminAPI } from "../../../services/api";
import Toast from "../../common/Toast";

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

const AccountAccessView = () => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [realtimeSyncing, setRealtimeSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [createForm, setCreateForm] = useState(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState(DEFAULT_EDIT_FORM);
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const realtimeRefreshTimerRef = useRef(null);

  const filteredUsers = useMemo(() => {
    const keyword = String(search || "").trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => {
      return (
        String(user.full_name || "").toLowerCase().includes(keyword) ||
        String(user.username || "").toLowerCase().includes(keyword) ||
        String(user.school_id || "").toLowerCase().includes(keyword)
      );
    });
  }, [search, users]);

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
  }, [search]);

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

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoadingUsers(true);
      const result = await AdminAPI.getUsers({ includePurgeSummary: true });
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
      loadUsers({ silent: true });
    }, 30000);
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
        role: createForm.role,
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
        role: editForm.role,
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

  const handleRefreshAll = async () => {
    await loadUsers();
  };

  const queueRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimerRef.current) return;
    realtimeRefreshTimerRef.current = window.setTimeout(async () => {
      realtimeRefreshTimerRef.current = null;
      try {
        setRealtimeSyncing(true);
        await loadUsers({ silent: true });
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
            Click any user row to open full account details and update admin-managed information.
          </p>
        </div>
        <HeaderActions>
          <SecondaryButton
            type="button"
            onClick={handleRefreshAll}
            disabled={loadingUsers || realtimeSyncing}
          >
            <RefreshCw size={16} />
            {loadingUsers || realtimeSyncing ? "Refreshing..." : "Refresh"}
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

      <Card>
        <CardHeader>
          <div>
            <h3>
              <LockKeyhole size={18} />
              User Accounts
            </h3>
            <p>Open a user card to edit username, full name, role, school ID, expiration, and password.</p>
          </div>
          <SearchBar>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, username, or school ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </SearchBar>
        </CardHeader>

        <CardBody>
          <ResultMeta>
            <span>
              {filteredUsers.length} account(s) | Showing {pageRange.from}-{pageRange.to}
            </span>
            <small>Expired accounts are auto-removed when this view refreshes.</small>
          </ResultMeta>

          <UserList>
            {loadingUsers ? (
              <EmptyState>Loading users...</EmptyState>
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
              <h3>
                <UserPlus size={18} />
                Create User Account
              </h3>
              <p>Fill in account details, then optionally set an account duration.</p>
            </ModalHeader>

            <ModalForm onSubmit={handleCreateUser}>
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
                <Hint>Student ID is auto-generated by the system.</Hint>
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
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="nt">Non-Teaching</option>
                  <option value="admin">Admin</option>
                </select>
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
              <Field>
                <label>Account Duration (Optional)</label>
                <input
                  type="datetime-local"
                  value={createForm.expires_at}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, expires_at: event.target.value }))
                  }
                />
                <Hint>
                  If set, the account is automatically removed once the date/time is reached.
                </Hint>
              </Field>

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
              <h3>
                <KeyRound size={18} />
                Edit User Account
              </h3>
              <p>
                {targetUser
                  ? `Update account details for ${targetUser.full_name || targetUser.username}.`
                  : "Select a user first."}
              </p>
            </ModalHeader>

            <ModalForm onSubmit={handleSaveUserDetails}>
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
                  onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value }))}
                  required
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="nt">Non-Teaching</option>
                  <option value="admin">Admin</option>
                </select>
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

              <Field>
                <label>Account Duration (Optional)</label>
                <input
                  type="datetime-local"
                  value={editForm.expires_at}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, expires_at: event.target.value }))
                  }
                />
                <Hint>Leave empty to keep this account without expiration.</Hint>
              </Field>

              <Field>
                <label>New Password (Optional)</label>
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
  max-width: 1300px;
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
    color: var(--text-secondary);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const Card = styled.section`
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: var(--bg-secondary);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
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
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
`;

const CardBody = styled.div`
  padding: 16px 18px;
`;

const ResultMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 10px;
  gap: 10px;

  small {
    font-size: 0.8rem;
  }
`;

const SearchBar = styled.div`
  position: relative;
  min-width: 320px;

  @media (max-width: 900px) {
    min-width: 0;
  }

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
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 10px 11px 10px 34px;
    font-size: 0.92rem;
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
    font-size: 0.95rem;
  }
`;

const MetaLine = styled.span`
  color: var(--text-secondary);
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
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 700;
`;

const ExpiryBadge = styled.span<{ $expired: boolean }>`
  border: 1px solid ${(props) => (props.$expired ? "rgba(239,68,68,0.35)" : "var(--border-color)")};
  background: ${(props) => (props.$expired ? "rgba(239,68,68,0.12)" : "var(--bg-tertiary)")};
  color: ${(props) => (props.$expired ? "#ef4444" : "var(--text-secondary)")};
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 700;
`;

const RowHint = styled.span`
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 5px 10px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
`;

const EmptyState = styled.div`
  padding: 18px;
  color: var(--text-secondary);
  text-align: center;
  font-size: 0.9rem;
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
  color: var(--text-secondary);
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

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;

  label {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 600;
  }

  input,
  select {
    width: 100%;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 10px 11px;
    font-size: 0.92rem;
  }
`;

const Hint = styled.small`
  color: var(--text-secondary);
  font-size: 0.78rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1800;
  background: rgba(10, 15, 25, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalCard = styled.div`
  width: min(640px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 14px;
`;

const ModalHeader = styled.div`
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 4px 0;
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }
`;

const ModalForm = styled.form`
  padding: 16px 18px;
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
