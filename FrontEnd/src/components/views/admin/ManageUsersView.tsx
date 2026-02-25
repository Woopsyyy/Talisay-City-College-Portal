import React, { useEffect, useMemo, useState } from 'react';
import baseStyled, { keyframes } from 'styled-components';
import {
  Award,
  Banknote,
  BookOpen,
  Briefcase,
  Check,
  Download,
  GraduationCap,
  HeartHandshake,
  Search,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { AdminAPI } from '../../../services/apis/admin';
import { getAvatarUrl } from '../../../services/apis/avatar';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import PageSkeleton from '../../loaders/PageSkeleton';

const styled = baseStyled as any;

const ROLE_OPTIONS = [
  {
    key: 'student',
    label: 'Student',
    icon: GraduationCap,
    color: '#60a5fa',
    glow: 'rgba(96, 165, 250, 0.45)',
  },
  {
    key: 'teacher',
    label: 'Teacher',
    icon: BookOpen,
    color: '#2dd4bf',
    glow: 'rgba(45, 212, 191, 0.45)',
  },
  {
    key: 'nt',
    label: 'Non-Teaching',
    icon: Briefcase,
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.45)',
  },
];

const SUB_ROLE_OPTIONS = [
  {
    key: 'dean',
    label: 'Dean',
    icon: Award,
    color: '#fde047',
    glow: 'rgba(253, 224, 71, 0.35)',
  },
  {
    key: 'osas',
    label: 'OSAS',
    icon: HeartHandshake,
    color: '#f472b6',
    glow: 'rgba(244, 114, 182, 0.35)',
  },
  {
    key: 'treasury',
    label: 'Treasury',
    icon: Banknote,
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.35)',
  },
];

const ALLOWED_ROLES = ROLE_OPTIONS.map((entry) => entry.key);
const SUB_ROLES = SUB_ROLE_OPTIONS.map((entry) => entry.key);
const PAGE_SIZE = 10;

const parseRoleTokens = (value: any) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || '').trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((entry) => String(entry || '').trim().toLowerCase())
            .filter(Boolean);
        }
      } catch (_) {
        // fallback parsing below
      }
    }

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
    }

    return [trimmed.toLowerCase()];
  }

  return [];
};

const normalizeRoleToken = (value: any) => {
  const token = String(value || '').trim().toLowerCase();
  if (!token) return '';
  return token === 'go' ? 'nt' : token;
};

const collectUserRoleTokens = (user: any) => {
  const tokens = [
    ...parseRoleTokens(user?.role),
    ...parseRoleTokens(user?.roles),
    ...parseRoleTokens(user?.sub_role),
    ...parseRoleTokens(user?.sub_roles),
  ]
    .map(normalizeRoleToken)
    .filter(Boolean);

  return Array.from(new Set(tokens));
};

const userIsManageUser = (user: any) => {
  const tokens = collectUserRoleTokens(user);
  if (!tokens.length) return false;
  return !tokens.includes('admin');
};

const normalizeRoles = (rolesInput: any, allowed: string[], currentRoles: any = []) => {
  const roles = Array.isArray(rolesInput) ? rolesInput : rolesInput ? [rolesInput] : [];
  const fallbackRoles = (Array.isArray(currentRoles) ? currentRoles : [currentRoles])
    .map((role) => normalizeRoleToken(role))
    .filter((role) => allowed.includes(role));

  const normalized = roles
    .map((role) => normalizeRoleToken(role))
    .filter((role) => allowed.includes(role));

  const unique = Array.from(new Set(normalized));
  if (unique.length) return unique;
  if (fallbackRoles.length) return Array.from(new Set(fallbackRoles));
  return allowed.includes('student') ? ['student'] : allowed.length ? [allowed[0]] : [];
};

const normalizeSubRoles = (subRolesInput: any, allowed: string[], currentSubRoles: any = []) => {
  const subRoles = Array.isArray(subRolesInput) ? subRolesInput : subRolesInput ? [subRolesInput] : [];
  const fallback = (Array.isArray(currentSubRoles) ? currentSubRoles : [currentSubRoles])
    .map((entry) => normalizeRoleToken(entry))
    .filter((entry) => allowed.includes(entry));

  const normalized = subRoles
    .map((entry) => normalizeRoleToken(entry))
    .filter((entry) => allowed.includes(entry));

  const unique = Array.from(new Set(normalized));
  if (unique.length) return unique;
  return Array.from(new Set(fallback));
};

const roleMetaByKey = Object.fromEntries(ROLE_OPTIONS.map((entry) => [entry.key, entry]));
const subRoleMetaByKey = Object.fromEntries(SUB_ROLE_OPTIONS.map((entry) => [entry.key, entry]));

const toRoleLabel = (token: string) => {
  const key = normalizeRoleToken(token);
  if (!key) return '';
  if (key === 'nt') return 'Non-Teaching';
  return key.charAt(0).toUpperCase() + key.slice(1);
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const escapeCell = (value: string) => {
    const raw = String(value ?? '');
    if (/[,\n\"]/g.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const csv = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const ManageUsersView = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [subRoleFilter, setSubRoleFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [avatarUrls, setAvatarUrls] = useState<Record<number, string>>({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [activeRoleUserId, setActiveRoleUserId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchAvatars = async () => {
      const toFetch = users.filter((entry) => entry.image_path && !avatarUrls[Number(entry.id)]);
      if (toFetch.length === 0) return;

      const next: Record<number, string> = {};
      await Promise.all(
        toFetch.map(async (user) => {
          const userId = Number(user.id);
          if (!Number.isFinite(userId) || userId <= 0) return;
          try {
            const url = await getAvatarUrl(userId, user.image_path);
            next[userId] = url || '/images/sample.jpg';
          } catch (_) {
            next[userId] = '/images/sample.jpg';
          }
        }),
      );

      if (mounted && Object.keys(next).length > 0) {
        setAvatarUrls((prev) => ({ ...prev, ...next }));
      }
    };

    void fetchAvatars();

    return () => {
      mounted = false;
    };
  }, [users, avatarUrls]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.getUsers();
      const list = Array.isArray(data) ? data : [];
      const manageUserList = list.filter((entry) => userIsManageUser(entry));

      setUsers(
        manageUserList.map((entry) => ({
          ...entry,
          roles: normalizeRoles(
            Array.isArray(entry.roles) && entry.roles.length
              ? entry.roles
              : entry.role
                ? [entry.role]
                : [],
            ALLOWED_ROLES,
          ),
          sub_roles: normalizeSubRoles(
            Array.isArray(entry.sub_roles) && entry.sub_roles.length
              ? entry.sub_roles
              : entry.sub_role
                ? [entry.sub_role]
                : [],
            SUB_ROLES,
          ),
        })),
      );
    } catch (err: any) {
      setToast({ show: true, message: `Failed to load users: ${err?.message || 'Unknown error'}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, roleFilter, subRoleFilter, accessFilter]);

  const filteredUsers = useMemo(() => {
    if (!debouncedSearchQuery) return users;
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) => {
      const fullName = String(user.full_name || '').toLowerCase();
      const username = String(user.username || '').toLowerCase();
      const schoolId = String(user.school_id || '').toLowerCase();
      return fullName.includes(q) || username.includes(q) || schoolId.includes(q);
    });
  }, [debouncedSearchQuery, users]);

  const visibleUsers = useMemo(() => {
    return filteredUsers.filter((user) => {
      const mainRoles = Array.isArray(user.roles) ? user.roles.map(normalizeRoleToken).filter(Boolean) : [];
      const functionalRoles = Array.isArray(user.sub_roles)
        ? user.sub_roles.map(normalizeRoleToken).filter(Boolean)
        : [];

      if (roleFilter && !mainRoles.includes(roleFilter)) return false;
      if (subRoleFilter && !functionalRoles.includes(subRoleFilter)) return false;

      if (accessFilter === 'main_only' && (!mainRoles.length || functionalRoles.length > 0)) return false;
      if (accessFilter === 'functional_only' && !functionalRoles.length) return false;

      return true;
    });
  }, [filteredUsers, roleFilter, subRoleFilter, accessFilter]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(visibleUsers.length / PAGE_SIZE)),
    [visibleUsers.length],
  );

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return visibleUsers.slice(start, start + PAGE_SIZE);
  }, [currentPage, visibleUsers]);

  const summary = useMemo(() => {
    const source = users;
    const countByRole = (role: string) =>
      source.filter((user) => Array.isArray(user.roles) && user.roles.includes(role)).length;
    const withFunctional = source.filter(
      (user) => Array.isArray(user.sub_roles) && user.sub_roles.length > 0,
    ).length;

    return {
      total: source.length,
      students: countByRole('student'),
      teachers: countByRole('teacher'),
      nonTeaching: countByRole('nt'),
      functional: withFunctional,
    };
  }, [users]);

  const activeUser = activeRoleUserId ? users.find((entry) => Number(entry.id) === Number(activeRoleUserId)) || null : null;

  const handleRolesChange = async (userId: number, nextRoles: string[]) => {
    try {
      const normalized = normalizeRoles(nextRoles, ALLOWED_ROLES);
      setUsers((prev) =>
        prev.map((entry) =>
          Number(entry.id) === Number(userId)
            ? { ...entry, roles: normalized, role: normalized[0] || null }
            : entry,
        ),
      );
      await AdminAPI.updateUserRoles(userId, normalized);
      setToast({ show: true, message: 'User roles updated successfully.', type: 'success' });
    } catch (err: any) {
      setToast({ show: true, message: `Error updating roles: ${err?.message || 'Unknown error'}`, type: 'error' });
      await fetchUsers();
    }
  };

  const handleSubRoleChange = async (userId: number, nextSubRoles: string[]) => {
    try {
      const normalized = normalizeSubRoles(nextSubRoles, SUB_ROLES);
      const primary = normalized.length > 0 ? normalized[0] : null;

      setUsers((prev) =>
        prev.map((entry) =>
          Number(entry.id) === Number(userId)
            ? { ...entry, sub_roles: normalized, sub_role: primary }
            : entry,
        ),
      );

      await AdminAPI.updateUserSubRole(userId, primary, normalized);
      setToast({ show: true, message: 'Functional roles updated successfully.', type: 'success' });
    } catch (err: any) {
      setToast({ show: true, message: `Error updating functional roles: ${err?.message || 'Unknown error'}`, type: 'error' });
      await fetchUsers();
    }
  };

  const openDeleteModal = (user: any) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setUserToDelete(null);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await AdminAPI.deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((entry) => Number(entry.id) !== Number(userToDelete.id)));
      if (Number(activeRoleUserId) === Number(userToDelete.id)) {
        setActiveRoleUserId(null);
      }
      setToast({ show: true, message: 'User deleted successfully.', type: 'success' });
      closeDeleteModal();
    } catch (err: any) {
      setToast({ show: true, message: `Failed to delete user: ${err?.message || 'Unknown error'}`, type: 'error' });
    }
  };

  const handleExportList = () => {
    if (!visibleUsers.length) {
      setToast({ show: true, message: 'No users to export for the current filter.', type: 'info' });
      return;
    }

    const rows = [
      ['Full Name', 'Username', 'School ID', 'Main Roles', 'Functional Roles'],
      ...visibleUsers.map((user) => [
        String(user.full_name || ''),
        String(user.username || ''),
        String(user.school_id || ''),
        (Array.isArray(user.roles) ? user.roles : []).map((entry: string) => toRoleLabel(entry)).join(' | '),
        (Array.isArray(user.sub_roles) ? user.sub_roles : []).map((entry: string) => toRoleLabel(entry)).join(' | '),
      ]),
    ];

    downloadCsv(`manage-users-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setToast({ show: true, message: 'User list exported.', type: 'success' });
  };

  return (
    <StyledContainer>
      <HeaderSection>
        <HeaderMeta>
          <HeaderTag>
            <Users size={14} /> People Console
          </HeaderTag>
          <h2>
            <UserCog size={28} /> Manage Users
          </h2>
          <p>Dark-mode role management with clearer labels, stronger contrast, and cleaner control flow.</p>
        </HeaderMeta>

        <HeaderActions>
          <OutlineActionButton type="button" onClick={handleExportList}>
            <Download size={14} /> Export List
          </OutlineActionButton>
        </HeaderActions>
      </HeaderSection>

      {toast.show ? (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      ) : null}

      <MainCard>
        <PanelHead>
          <TitleBlock>
            <h3>Employees</h3>
            <p>Manage non-admin accounts, access roles, and functional assignments.</p>
          </TitleBlock>
        </PanelHead>

        <StatsGrid>
          <StatCard $tone="neutral">
            <span>Total Employees</span>
            <strong>{summary.total}</strong>
          </StatCard>
          <StatCard $tone="student">
            <span>Student</span>
            <strong>{summary.students}</strong>
          </StatCard>
          <StatCard $tone="teacher">
            <span>Teacher</span>
            <strong>{summary.teachers}</strong>
          </StatCard>
          <StatCard $tone="nt">
            <span>Non-Teaching</span>
            <strong>{summary.nonTeaching}</strong>
          </StatCard>
          <StatCard $tone="functional">
            <span>With Functional Role</span>
            <strong>{summary.functional}</strong>
          </StatCard>
        </StatsGrid>

        <ControlsGrid>
          <SearchWrapper>
            <ControlLabel htmlFor="manage-users-search">
              <Search size={14} />
              Search Users
            </ControlLabel>
            <SearchField>
              <Search size={16} />
              <SearchInput
                id="manage-users-search"
                type="text"
                placeholder="Search by name, username, or school ID"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </SearchField>
          </SearchWrapper>

          <FiltersGroup>
            <FilterField>
              <ControlLabel htmlFor="manage-users-main-role">Main Role</ControlLabel>
              <FilterSelect
                id="manage-users-main-role"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                <option value="">All Main Roles</option>
                {ROLE_OPTIONS.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>

            <FilterField>
              <ControlLabel htmlFor="manage-users-functional-role">Functional Role</ControlLabel>
              <FilterSelect
                id="manage-users-functional-role"
                value={subRoleFilter}
                onChange={(event) => setSubRoleFilter(event.target.value)}
              >
                <option value="">All Functional Roles</option>
                {SUB_ROLE_OPTIONS.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </FilterSelect>
            </FilterField>

            <FilterField>
              <ControlLabel htmlFor="manage-users-access-type">Access Type</ControlLabel>
              <FilterSelect
                id="manage-users-access-type"
                value={accessFilter}
                onChange={(event) => setAccessFilter(event.target.value)}
              >
                <option value="all">All Access Types</option>
                <option value="main_only">Main Role Only</option>
                <option value="functional_only">Has Functional Role</option>
              </FilterSelect>
            </FilterField>
          </FiltersGroup>
        </ControlsGrid>

        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>School ID</th>
                <th>Roles</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3}>
                    <PageSkeleton variant="table" compact columns={3} />
                  </td>
                </tr>
              ) : visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <EmptyTableCell>No users found matching your filters.</EmptyTableCell>
                  </td>
                </tr>
              ) : (
                pagedUsers.map((user) => {
                  const mainRoles = Array.isArray(user.roles) ? user.roles.map(normalizeRoleToken).filter(Boolean) : [];
                  const subRoles = Array.isArray(user.sub_roles)
                    ? user.sub_roles.map(normalizeRoleToken).filter(Boolean)
                    : [];

                  return (
                    <tr key={user.id}>
                      <td>
                        <UserProfile>
                          <Avatar
                            loading="lazy"
                            src={avatarUrls[Number(user.id)] || '/images/sample.jpg'}
                            onError={(event) => {
                              const img = event.currentTarget as HTMLImageElement;
                              img.src = '/images/sample.jpg';
                            }}
                          />
                          <div>
                            <UserNameButton
                              type="button"
                              onClick={() => setActiveRoleUserId(Number(user.id))}
                              title="Edit user roles"
                            >
                              {user.full_name || user.username || 'Unknown user'}
                            </UserNameButton>
                            <UserHandle>@{user.username || 'unknown'}</UserHandle>
                          </div>
                        </UserProfile>
                      </td>

                      <td>
                        {user.school_id ? <SchoolId>{user.school_id}</SchoolId> : <MutedMeta>N/A</MutedMeta>}
                      </td>

                      <td>
                        <RolesCellFrame>
                          <ChipGroup>
                            {mainRoles.map((role) => {
                              const meta = roleMetaByKey[role];
                              const Icon = meta?.icon || Briefcase;
                              return (
                                <RoleChip
                                  key={`main-${user.id}-${role}`}
                                  $color={meta?.color || '#93c5fd'}
                                  $glow={meta?.glow || 'rgba(147, 197, 253, 0.25)'}
                                >
                                  <Icon size={13} />
                                  <span>{meta?.label || toRoleLabel(role)}</span>
                                </RoleChip>
                              );
                            })}
                            {subRoles.map((subRole) => {
                              const meta = subRoleMetaByKey[subRole];
                              const Icon = meta?.icon || Briefcase;
                              return (
                                <SubRoleChip
                                  key={`sub-${user.id}-${subRole}`}
                                  $color={meta?.color || '#cbd5e1'}
                                  $glow={meta?.glow || 'rgba(203, 213, 225, 0.25)'}
                                >
                                  <Icon size={12} />
                                  <span>{meta?.label || toRoleLabel(subRole)}</span>
                                </SubRoleChip>
                              );
                            })}
                            {mainRoles.length === 0 && subRoles.length === 0 ? (
                              <MutedMeta>Unassigned</MutedMeta>
                            ) : null}
                          </ChipGroup>
                        </RolesCellFrame>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrap>

        {visibleUsers.length > 0 ? (
          <PaginationRow>
            <PagerButton
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Prev
            </PagerButton>
            <PageMeta>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, visibleUsers.length)} of{' '}
                {visibleUsers.length}
              </span>
            </PageMeta>
            <PagerButton
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </PagerButton>
          </PaginationRow>
        ) : null}
      </MainCard>

      {activeUser ? (
        <ModalOverlay onClick={() => setActiveRoleUserId(null)}>
          <RoleEditorContainer onClick={(event) => event.stopPropagation()}>
            <EditorHeader>
              <span>Assign Roles</span>
              <CloseButton type="button" onClick={() => setActiveRoleUserId(null)}>
                <X size={16} />
              </CloseButton>
            </EditorHeader>

            <EditorBody>
              <EditorUserInfo>
                <EditorAvatar
                  src={avatarUrls[Number(activeUser.id)] || '/images/sample.jpg'}
                  onError={(event) => {
                    const img = event.currentTarget as HTMLImageElement;
                    img.src = '/images/sample.jpg';
                  }}
                />
                <div>
                  <strong>{activeUser.full_name || activeUser.username || 'Unknown user'}</strong>
                  <span>@{activeUser.username || 'unknown'}</span>
                </div>
              </EditorUserInfo>

              <SectionLabel>Roles</SectionLabel>
              <RoleOptionsGrid>
                {ROLE_OPTIONS.map((entry) => {
                  const isSelected = Array.isArray(activeUser.roles)
                    ? activeUser.roles.includes(entry.key)
                    : false;
                  const Icon = entry.icon;

                  return (
                    <RoleOptionCard
                      key={entry.key}
                      $selected={isSelected}
                      $color={entry.color}
                      onClick={() => {
                        const current = Array.isArray(activeUser.roles) ? activeUser.roles : [];
                        const next = isSelected
                          ? current.filter((role: string) => role !== entry.key)
                          : [...current, entry.key];
                        handleRolesChange(activeUser.id, next);
                      }}
                    >
                      <div className="icon-box">
                        <Icon size={16} />
                      </div>
                      <div className="label">{entry.label}</div>
                      {isSelected ? <SelectedMark size={14} /> : null}
                    </RoleOptionCard>
                  );
                })}
              </RoleOptionsGrid>

              <Divider />

              <SubRoleSection>
                <SectionTitle>
                  <Briefcase size={13} /> Functional Role Group
                </SectionTitle>

                <SubRoleGrid>
                  {SUB_ROLE_OPTIONS.map((entry) => {
                    const isSelected = Array.isArray(activeUser.sub_roles)
                      ? activeUser.sub_roles.includes(entry.key)
                      : false;
                    const Icon = entry.icon;

                    return (
                      <SubRoleButton
                        key={entry.key}
                        $selected={isSelected}
                        $color={entry.color}
                        onClick={() => {
                          const current = Array.isArray(activeUser.sub_roles) ? activeUser.sub_roles : [];
                          const next = isSelected
                            ? current.filter((role: string) => role !== entry.key)
                            : [...current, entry.key];
                          handleSubRoleChange(activeUser.id, next);
                        }}
                      >
                        <Icon size={15} />
                        <span>{entry.label}</span>
                      </SubRoleButton>
                    );
                  })}
                </SubRoleGrid>
              </SubRoleSection>

              <Divider />

              <DrawerFooter>
                <DrawerDeleteButton
                  type="button"
                  onClick={() => openDeleteModal(activeUser)}
                  title="Delete this user"
                >
                  <Trash2 size={14} />
                  Delete User
                </DrawerDeleteButton>
              </DrawerFooter>
            </EditorBody>
          </RoleEditorContainer>
        </ModalOverlay>
      ) : null}

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title="Confirm Account Deletion"
        message="Are you sure you want to delete this user? This action cannot be undone and will remove all their data."
        itemName={userToDelete?.full_name || userToDelete?.username}
        isLoading={false}
      />
    </StyledContainer>
  );
};

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateX(105%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const StyledContainer = styled.div`
  max-width: 1460px;
  margin: 0 auto;
  padding: 6px 4px 32px;
  color: #eaf2ff;
  animation: ${fadeIn} 0.35s ease;
`;

const HeaderSection = styled.section`
  border: 1px solid rgba(117, 149, 255, 0.28);
  background:
    radial-gradient(circle at 8% -10%, rgba(89, 187, 255, 0.22), transparent 40%),
    radial-gradient(circle at 92% 8%, rgba(120, 98, 255, 0.2), transparent 40%),
    linear-gradient(155deg, #081126, #0a1735 52%, #071025);
  border-radius: 16px;
  padding: 1rem 1.1rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 1rem;

  @media (max-width: 860px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const HeaderMeta = styled.div`
  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.7rem;
    font-weight: 800;
    color: #f3f8ff;
  }

  p {
    margin: 8px 0 0;
    color: rgba(219, 232, 255, 0.9);
    font-size: 0.95rem;
    line-height: 1.45;
  }
`;

const HeaderTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(112, 227, 190, 0.38);
  background: rgba(28, 103, 80, 0.24);
  color: #a8ffe0;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 9px;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.65rem;
`;

const OutlineActionButton = styled.button`
  border: 1px solid rgba(119, 220, 255, 0.42);
  background: rgba(18, 36, 78, 0.74);
  color: #ddf5ff;
  border-radius: 10px;
  padding: 0.56rem 0.86rem;
  font-size: 0.84rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;

  &:hover {
    border-color: rgba(146, 232, 255, 0.78);
    box-shadow: 0 0 0 1px rgba(118, 218, 255, 0.26);
  }
`;

const MainCard = styled.section`
  border-radius: 18px;
  border: 1px solid rgba(120, 147, 255, 0.24);
  background:
    radial-gradient(circle at 88% 2%, rgba(86, 167, 255, 0.18), transparent 40%),
    linear-gradient(162deg, #081227, #06102a 48%, #050b1a);
  box-shadow: 0 14px 30px rgba(2, 8, 25, 0.56);
  overflow: hidden;
`;

const PanelHead = styled.div`
  padding: 1.05rem 1.2rem;
  border-bottom: 1px solid rgba(122, 145, 245, 0.24);
`;

const TitleBlock = styled.div`
  h3 {
    margin: 0;
    color: #f7fbff;
    font-size: 1.6rem;
    font-weight: 780;
  }

  p {
    margin: 6px 0 0;
    color: rgba(215, 228, 255, 0.87);
    font-size: 0.9rem;
  }
`;

const StatsGrid = styled.div`
  padding: 0.95rem 1.1rem;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;

  @media (max-width: 1220px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 780px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  border-radius: 12px;
  padding: 0.68rem 0.74rem;
  border: 1px solid
    ${(props: any) =>
      props.$tone === 'student'
        ? 'rgba(96, 165, 250, 0.52)'
        : props.$tone === 'teacher'
          ? 'rgba(36, 205, 174, 0.5)'
          : props.$tone === 'nt'
            ? 'rgba(245, 158, 11, 0.52)'
            : props.$tone === 'functional'
              ? 'rgba(153, 102, 255, 0.5)'
              : 'rgba(153, 176, 255, 0.36)'};
  background:
    ${(props: any) =>
      props.$tone === 'student'
        ? 'linear-gradient(165deg, rgba(32, 68, 122, 0.66), rgba(18, 41, 82, 0.64))'
        : props.$tone === 'teacher'
          ? 'linear-gradient(165deg, rgba(10, 80, 70, 0.64), rgba(7, 53, 47, 0.62))'
          : props.$tone === 'nt'
            ? 'linear-gradient(165deg, rgba(109, 68, 14, 0.64), rgba(62, 39, 7, 0.62))'
            : props.$tone === 'functional'
              ? 'linear-gradient(165deg, rgba(53, 30, 110, 0.66), rgba(33, 16, 74, 0.62))'
              : 'linear-gradient(165deg, rgba(21, 40, 80, 0.64), rgba(14, 27, 58, 0.62))'};

  span {
    display: block;
    font-size: 0.78rem;
    color: rgba(225, 236, 255, 0.88);
    margin-bottom: 7px;
  }

  strong {
    font-size: 1.52rem;
    line-height: 1;
    color: #faffff;
    font-weight: 800;
  }
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 1.35fr) minmax(0, 2fr);
  align-items: start;
  gap: 0.72rem;
  padding: 0 1.1rem 1rem;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`;

const ControlLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(201, 220, 255, 0.92);
  margin-bottom: 6px;
`;

const SearchWrapper = styled.div`
  width: 100%;
`;

const SearchField = styled.div`
  min-height: 50px;
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(129, 156, 255, 0.34);
  background: rgba(10, 22, 50, 0.86);
  color: #f0f7ff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 0.86rem;

  svg {
    flex: 0 0 auto;
    color: rgba(204, 226, 255, 0.86);
  }

  &:focus-within {
    border-color: rgba(120, 226, 255, 0.62);
    box-shadow: 0 0 0 1px rgba(120, 226, 255, 0.24);
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #f0f7ff;
  padding: 0.6rem 0;
  font-size: 0.9rem;
  line-height: 1.2;

  &::placeholder {
    color: rgba(197, 214, 255, 0.72);
  }

  &:focus {
    outline: none;
  }
`;

const FiltersGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(170px, 1fr));
  gap: 0.58rem;
  width: 100%;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const FilterField = styled.div`
  width: 100%;
  min-width: 0;
`;

const FilterSelect = styled.select`
  width: 100%;
  min-height: 50px;
  border-radius: 10px;
  border: 1px solid rgba(130, 158, 255, 0.32);
  background: rgba(10, 22, 50, 0.86);
  color: #f4f8ff;
  padding: 0.7rem 0.86rem;
  font-size: 0.9rem;
  min-width: 0;
  line-height: 1.2;

  option {
    background: #0b1738;
    color: #f4f8ff;
  }

  &:focus {
    outline: none;
    border-color: rgba(116, 224, 255, 0.62);
    box-shadow: 0 0 0 1px rgba(116, 224, 255, 0.24);
  }
`;

const TableWrap = styled.div`
  padding: 0 1.1rem 0.7rem;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 760px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(123, 144, 233, 0.22);

  thead th {
    text-align: left;
    font-size: 0.8rem;
    font-weight: 700;
    color: rgba(215, 227, 255, 0.95);
    background: linear-gradient(180deg, rgba(22, 37, 74, 0.95), rgba(16, 29, 62, 0.94));
    border-bottom: 1px solid rgba(124, 145, 236, 0.28);
    padding: 0.76rem 0.85rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  thead th:nth-child(2),
  thead th:nth-child(3) {
    text-align: center;
  }

  tbody td {
    border-bottom: 1px solid rgba(95, 116, 194, 0.24);
    padding: 0.78rem 0.85rem;
    color: #edf4ff;
    vertical-align: middle;
    background: rgba(9, 19, 43, 0.88);
  }

  tbody tr:hover td {
    background: rgba(14, 28, 62, 0.96);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }

  tbody td:nth-child(2),
  tbody td:nth-child(3) {
    text-align: center;
  }
`;

const EmptyTableCell = styled.div`
  text-align: center;
  padding: 32px 12px;
  color: rgba(206, 220, 255, 0.9);
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.img`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(132, 236, 255, 0.3);
  box-shadow: 0 0 16px rgba(102, 206, 255, 0.16);
`;

const UserNameButton = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: #f7fbff;
  font-weight: 700;
  font-size: 0.91rem;

  &:hover {
    color: #ffffff;
    text-decoration: underline;
    text-decoration-color: rgba(146, 241, 255, 0.9);
    text-underline-offset: 2px;
  }
`;

const UserHandle = styled.div`
  color: rgba(201, 220, 255, 0.86);
  font-size: 0.8rem;
`;

const SchoolId = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 8px;
  min-width: 110px;
  border-radius: 8px;
  border: 1px solid rgba(129, 156, 255, 0.32);
  background: rgba(16, 30, 63, 0.76);
  color: #eaf2ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8rem;
  margin: 0 auto;
`;

const MutedMeta = styled.span`
  color: rgba(205, 220, 255, 0.82);
  font-size: 0.78rem;
`;

const RolesCellFrame = styled.div`
  width: 100%;
  border: 1px solid rgba(123, 147, 236, 0.26);
  background: rgba(13, 28, 57, 0.8);
  color: #eef6ff;
  border-radius: 10px;
  padding: 0.42rem 0.5rem;
`;

const ChipGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
`;

const RoleChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  border: 1px solid ${(props: any) => `${props.$color}a0`};
  background: ${(props: any) => `${props.$color}2e`};
  color: #f8fdff;
  box-shadow: 0 0 10px ${(props: any) => props.$glow};
  padding: 3px 8px;

  span {
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  svg {
    color: #ffffff;
    stroke-width: 2.1;
  }
`;

const SubRoleChip = styled(RoleChip)`
  span {
    font-size: 0.72rem;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: linear-gradient(90deg, rgba(3, 8, 21, 0.42) 0%, rgba(3, 8, 21, 0.72) 60%, rgba(3, 8, 21, 0.82) 100%);
  backdrop-filter: blur(2.5px);
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  padding: 16px;
  z-index: 2100;

  @media (max-width: 900px) {
    padding: 0;
  }
`;

const RoleEditorContainer = styled.div`
  width: clamp(340px, 26vw, 520px);
  max-width: 100%;
  height: calc(100vh - 32px);
  max-height: 100%;
  background: linear-gradient(165deg, rgba(9, 19, 44, 0.98), rgba(7, 14, 34, 0.98));
  border: 1px solid rgba(122, 147, 232, 0.34);
  border-radius: 14px;
  box-shadow: 0 16px 36px rgba(0, 5, 16, 0.58);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: ${slideDown} 0.2s ease;

  @media (max-width: 900px) {
    width: 100%;
    height: 100%;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
`;

const EditorHeader = styled.div`
  padding: 0.8rem 0.95rem;
  border-bottom: 1px solid rgba(121, 145, 232, 0.26);
  display: flex;
  align-items: center;
  justify-content: space-between;

  span {
    font-size: 0.9rem;
    font-weight: 700;
    color: #f5faff;
  }
`;

const CloseButton = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid rgba(136, 161, 245, 0.3);
  background: rgba(15, 27, 56, 0.85);
  color: rgba(225, 237, 255, 0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const EditorBody = styled.div`
  padding: 0.9rem;
  flex: 1 1 auto;
  overflow-y: auto;
`;

const EditorUserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 9px;
  border-radius: 10px;
  border: 1px solid rgba(124, 149, 233, 0.28);
  background: rgba(15, 29, 61, 0.84);

  strong {
    display: block;
    color: #f7fbff;
    font-size: 0.9rem;
  }

  span {
    display: block;
    color: rgba(199, 218, 255, 0.88);
    font-size: 0.8rem;
    margin-top: 1px;
  }
`;

const EditorAvatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(125, 233, 255, 0.34);
`;

const SectionLabel = styled.div`
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(188, 209, 255, 0.88);
  margin-bottom: 7px;
  font-weight: 700;
`;

const RoleOptionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const RoleOptionCard = styled.button`
  position: relative;
  border-radius: 11px;
  border: 1px solid ${(props: any) => (props.$selected ? `${props.$color}aa` : 'rgba(129, 151, 236, 0.28)')};
  background: ${(props: any) => (props.$selected ? `${props.$color}26` : 'rgba(13, 25, 53, 0.82)')};
  color: #f5fbff;
  padding: 0.66rem;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  .icon-box {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${(props: any) => (props.$selected ? `${props.$color}cc` : 'rgba(26, 42, 84, 0.88)')};
    color: #ffffff;
  }

  .label {
    font-size: 0.82rem;
    font-weight: 700;
  }
`;

const SelectedMark = styled(Check)`
  position: absolute;
  right: 8px;
  top: 8px;
  color: #d9fff4;
`;

const Divider = styled.div`
  margin: 14px 0;
  height: 1px;
  background: rgba(123, 148, 236, 0.24);
`;

const SubRoleSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: rgba(193, 212, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SubRoleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
`;

const SubRoleButton = styled.button`
  border-radius: 10px;
  border: 1px solid ${(props: any) => (props.$selected ? `${props.$color}a8` : 'rgba(122, 146, 233, 0.28)')};
  background: ${(props: any) => (props.$selected ? `${props.$color}24` : 'rgba(14, 27, 56, 0.82)')};
  color: #f3f8ff;
  padding: 0.58rem 0.62rem;
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;

  span {
    font-size: 0.82rem;
    font-weight: 700;
  }

  svg {
    color: #ffffff;
    stroke-width: 2;
  }
`;

const DrawerFooter = styled.div`
  margin-top: 10px;
`;

const DrawerDeleteButton = styled.button`
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(255, 119, 147, 0.56);
  background: linear-gradient(145deg, rgba(120, 23, 49, 0.74), rgba(81, 14, 34, 0.76));
  color: #ffe2ea;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-weight: 700;
  font-size: 0.84rem;
  padding: 0.62rem 0.75rem;
  cursor: pointer;

  &:hover {
    background: linear-gradient(145deg, rgba(145, 27, 59, 0.82), rgba(95, 16, 41, 0.84));
    border-color: rgba(255, 145, 169, 0.78);
  }
`;

const PaginationRow = styled.div`
  padding: 0 1.1rem 1.1rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
`;

const PageMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  color: rgba(220, 233, 255, 0.9);

  strong {
    color: #ffffff;
    font-weight: 800;
  }

  span {
    color: rgba(196, 214, 255, 0.85);
  }
`;

const PagerButton = styled.button`
  min-width: 72px;
  border-radius: 9px;
  border: 1px solid rgba(120, 151, 255, 0.34);
  background: rgba(14, 28, 62, 0.88);
  color: #eef6ff;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.45rem 0.6rem;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: rgba(128, 230, 255, 0.66);
    background: rgba(20, 40, 80, 0.92);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export default ManageUsersView;
