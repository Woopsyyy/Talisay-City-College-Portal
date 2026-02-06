import React, { useState, useEffect, useMemo, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { AdminAPI, getAvatarUrl } from '../../../services/api';
import { 
    Users, Search, UserCog, Trash2, 
    GraduationCap, BookOpen, ShieldCheck, Briefcase, 
    Check, X, Library, Award, HeartHandshake, Banknote
} from 'lucide-react';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';
import useDebouncedValue from '../../../hooks/useDebouncedValue';

// --- Utils ---
const normalizeRoles = (rolesInput, allowed, currentRoles = []) => {
    const roles = Array.isArray(rolesInput) ? rolesInput : (rolesInput ? [rolesInput] : []);
    const normalized = roles
        .map(r => String(r || '').trim().toLowerCase())
        .map(r => (r === 'go' ? 'nt' : r))
        .filter(r => allowed.includes(r));
    const unique = Array.from(new Set(normalized));
    return unique.length ? unique : ['student'];
};

const getRoleIcon = (role) => {
    switch (role) {
        case 'student': return <GraduationCap size={16} />;
        case 'teacher': return <BookOpen size={16} />;
        case 'admin': return <ShieldCheck size={16} />;
        case 'nt': return <Briefcase size={16} />;
        default: return <Users size={16} />;
    }
};

const getRoleColor = (role) => {
    switch (role) {
        case 'student': return 'var(--accent-info, #3b82f6)';
        case 'teacher': return 'var(--accent-success, #10b981)';
        case 'admin': return 'var(--accent-danger, #ef4444)';
        case 'nt': return 'var(--accent-warning, #f59e0b)';
        default: return 'var(--text-secondary)';
    }
};

const getSubRoleIcon = (subRole) => {
    switch (subRole) {
        case 'faculty': return <Library size={14} />;
        case 'dean': return <Award size={14} />;
        case 'osas': return <HeartHandshake size={14} />;
        case 'treasury': return <Banknote size={14} />;
        default: return <Briefcase size={14} />;
    }
};

const getSubRoleColor = (subRole) => {
    switch (subRole) {
        case 'faculty': return '#6366f1'; // Indigo
        case 'dean': return '#eab308';    // Yellow
        case 'osas': return '#ec4899';    // Pink
        case 'treasury': return '#10b981'; // Emerald
        default: return 'var(--text-secondary)';
    }
};

const ManageUsersView = () => {
    const ALLOWED_ROLES = ['student', 'teacher', 'admin', 'nt'];
    const SUB_ROLES = ['faculty', 'dean', 'osas', 'treasury'];
    
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
    const [avatarUrls, setAvatarUrls] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    // Role Editor State
    const [activeRoleUserId, setActiveRoleUserId] = useState(null);
    const roleEditorRef = useRef(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (roleEditorRef.current && !roleEditorRef.current.contains(event.target)) {
                setActiveRoleUserId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredUsers = useMemo(() => {
        if (!debouncedSearchQuery) return users;
        const lowerQ = debouncedSearchQuery.toLowerCase();
        return users.filter(user => 
            (user.username && user.username.toLowerCase().includes(lowerQ)) ||
            (user.full_name && user.full_name.toLowerCase().includes(lowerQ)) ||
            (user.school_id && String(user.school_id).includes(lowerQ))
        );
    }, [debouncedSearchQuery, users]);

    const visibleUsers = useMemo(() => {
        return filteredUsers.filter(user => {
            const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean);
            if (roleFilter && !roles.includes(roleFilter)) return false;
            return true;
        });
    }, [filteredUsers, roleFilter]);

    useEffect(() => {
        let isMounted = true;
        
        const fetchAvatars = async () => {
             const usersToFetch = filteredUsers.filter(u => u.image_path && !avatarUrls[u.id]);
             if (usersToFetch.length === 0) return;

             const newUrls = {};
             const BATCH_SIZE = 10;
             for (let i = 0; i < usersToFetch.length; i += BATCH_SIZE) {
                 if (!isMounted) return;
                 const batch = usersToFetch.slice(i, i + BATCH_SIZE);
                 await Promise.all(batch.map(async (user) => {
                     try {
                         const url = await getAvatarUrl(user.id, user.image_path);
                         newUrls[user.id] = url;
                     } catch (e) {
                         console.error("Failed to load avatar for", user.id, e);
                         newUrls[user.id] = "/images/sample.jpg";
                     }
                 }));
             }
             
             if (isMounted && Object.keys(newUrls).length > 0) {
                 setAvatarUrls(prev => ({ ...prev, ...newUrls }));
             }
        };
        
        if (filteredUsers.length > 0) {
            fetchAvatars();
        }

        return () => { isMounted = false; };
    }, [filteredUsers, avatarUrls]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await AdminAPI.getUsers();
            console.log('Fetched users data:', data); // Debug log
            
            const list = Array.isArray(data) ? data : [];
            setUsers(list.map(u => ({
                ...u,
                roles: normalizeRoles(Array.isArray(u.roles) && u.roles.length ? u.roles : (u.role ? [u.role] : []), ALLOWED_ROLES),
            })));
        } catch (err) {
            console.error("Error fetching users:", err);
            setToast({ show: true, message: `Failed to load users: ${err.message || 'Unknown error'}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRolesChange = async (userId, newRoles) => {
        try {
            const normalized = normalizeRoles(newRoles, ALLOWED_ROLES);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, roles: normalized, role: normalized[0] } : u));
            await AdminAPI.updateUserRoles(userId, normalized);
            setToast({ show: true, message: "User roles updated successfully", type: 'success' });
        } catch (err) {
            setToast({ show: true, message: `Error updating roles: ${err.message}`, type: 'error' });
            fetchUsers();
        }
    };

    const openDeleteModal = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    };

    const handleSubRoleChange = async (userId, newSubRole) => {
        try {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, sub_role: newSubRole || null } : u));
            await AdminAPI.updateUserSubRole(userId, newSubRole || null);
            setToast({ show: true, message: "Sub role updated successfully", type: 'success' });
        } catch (err) {
            setToast({ show: true, message: `Error updating sub role: ${err.message}`, type: 'error' });
            fetchUsers();
        }
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            await AdminAPI.deleteUser(userToDelete.id);
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
            setToast({ show: true, message: "User deleted successfully", type: 'success' });
            closeDeleteModal();
        } catch (err) {
            console.error("Error deleting user:", err);
            setToast({ show: true, message: `Failed to delete user: ${err.message}`, type: 'error' });
        }
    };

    return (
        <StyledContainer>
            <HeaderSection>
                <div>
                     <h2><UserCog size={32} /> Manage User Roles</h2>
                     <p>Manage user permissions and assign roles across the system.</p>
                </div>
            </HeaderSection>
            
            {toast.show && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(prev => ({ ...prev, show: false }))} 
                />
            )}

            <MainCard>
                <CardHeader>
                    <div className="d-flex align-items-center gap-2">
                        <Users size={20} />
                        <h3>System Users</h3>
                    </div>
                        <SearchWrapper>
                            <Search size={16} />
                            <SearchInput 
                                type="text" 
                                placeholder="Search by name, username or ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </SearchWrapper>
                        <FilterRow>
                            <FilterSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                                <option value="">All Roles</option>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                                <option value="nt">Non-Teaching</option>
                            </FilterSelect>
                        </FilterRow>
                    </CardHeader>

                <CardBody>
                     <div className="table-responsive" style={{ position: 'relative', minHeight: '400px' }}>
                        <Table>
                            <thead>
                                <tr>
                                    <th>User Profile</th>
                                    <th>School ID</th>
                                    <th>Assigned Roles</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" className="text-center py-5 text-muted">Loading users...</td></tr>
                                ) : visibleUsers.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-5 text-muted">No users found matching your filters.</td></tr>
                                ) : (
                                    visibleUsers.map(user => (
                                        <tr key={user.id}>
                                            <td>
                                                <UserProfile>
                                                    <Avatar 
                                                        src={avatarUrls[user.id] || "/images/sample.jpg"} 
                                                        onError={(e) => { e.target.src = "/images/sample.jpg" }}
                                                    />
                                                    <div>
                                                        <UserName>{user.full_name || user.username}</UserName>
                                                        <UserEmail>{user.username}</UserEmail>
                                                    </div>
                                                </UserProfile>
                                            </td>
                                            <td>
                                                {user.school_id ? (
                                                    <SchoolId>{user.school_id}</SchoolId>
                                                ) : (
                                                    <span className="text-muted fst-italic text-sm">N/A</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ position: 'relative' }}>
                                                    <RoleDisplay 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveRoleUserId(activeRoleUserId === user.id ? null : user.id);
                                                        }}
                                                        $active={activeRoleUserId === user.id}
                                                    >
                                                        {Array.isArray(user.roles) && user.roles.length > 0 ? (
                                                            user.roles.map(role => (
                                                                <RoleBadge key={role} $role={role}>
                                                                    {getRoleIcon(role)}
                                                                    <span>{role === 'nt' ? 'Non-Teaching' : role.charAt(0).toUpperCase() + role.slice(1)}</span>
                                                                </RoleBadge>
                                                            ))
                                                        ) : (
                                                            <span className="text-muted text-xs">No roles assigned</span>
                                                        )}
                                                        <EditIconWrapper $active={activeRoleUserId === user.id}>
                                                            <UserCog size={14} />
                                                        </EditIconWrapper>
                                                    </RoleDisplay>

                                                    {activeRoleUserId === user.id && (
                                                        <RoleEditorContainer 
                                                            ref={roleEditorRef}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <EditorHeader>
                                                                <span>Assign Roles</span>
                                                                <CloseButton onClick={() => setActiveRoleUserId(null)}>
                                                                    <X size={16} />
                                                                </CloseButton>
                                                            </EditorHeader>
                                                            
                                                            <EditorBody>
                                                                <SectionLabel>Main Access Role</SectionLabel>
                                                                <RoleOptionsGrid>
                                                                    {ALLOWED_ROLES.map((role) => {
                                                                        const isSelected = user.roles && user.roles.includes(role);
                                                                        return (
                                                                            <RoleOptionCard 
                                                                                key={role} 
                                                                                $selected={isSelected}
                                                                                $role={role}
                                                                                onClick={() => {
                                                                                    const currentRoles = user.roles || [];
                                                                                    const newRoles = isSelected
                                                                                        ? currentRoles.filter(r => r !== role)
                                                                                        : [...currentRoles, role];
                                                                                    handleRolesChange(user.id, newRoles);
                                                                                }}
                                                                            >
                                                                                <div className="icon-box">
                                                                                    {getRoleIcon(role)}
                                                                                </div>
                                                                                <div className="label">
                                                                                    {role === 'nt' ? 'Non-Teaching' : role.charAt(0).toUpperCase() + role.slice(1)}
                                                                                </div>
                                                                                {isSelected && <CheckCircle size={14} />}
                                                                            </RoleOptionCard>
                                                                        );
                                                                    })}
                                                                </RoleOptionsGrid>

                                                                <Divider />

                                                                <SubRoleSection>
                                                                    <SectionTitle>
                                                                        <Briefcase size={12} /> Functional Sub-Roles
                                                                    </SectionTitle>
                                                                    <SubRoleGrid>
                                                                        {SUB_ROLES.map((subRole) => {
                                                                            const isSelected = user.sub_role === subRole;
                                                                            return (
                                                                                <SubRoleCard
                                                                                    key={subRole}
                                                                                    $selected={isSelected}
                                                                                    $subRole={subRole}
                                                                                    onClick={() => {
                                                                                        const newValue = isSelected ? '' : subRole;
                                                                                        handleSubRoleChange(user.id, newValue);
                                                                                    }}
                                                                                >
                                                                                    <div className="icon-box">
                                                                                        {getSubRoleIcon(subRole)}
                                                                                    </div>
                                                                                    <div className="label">
                                                                                        {subRole.toUpperCase()}
                                                                                    </div>
                                                                                    {isSelected && <CheckCircle size={12} />}
                                                                                </SubRoleCard>
                                                                            );
                                                                        })}
                                                                    </SubRoleGrid>
                                                                </SubRoleSection>
                                                            </EditorBody>
                                                        </RoleEditorContainer>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <ActionWrapper>
                                                    <DeleteButton 
                                                        onClick={() => openDeleteModal(user)}
                                                        title="Delete User"
                                                    >
                                                        <Trash2 size={16} />
                                                    </DeleteButton>
                                                </ActionWrapper>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                     </div>
                </CardBody>
            </MainCard>

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

// --- Styled Components ---

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-10px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

const StyledContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 40px;
  animation: fadeIn 0.4s ease-out;
  color: var(--text-primary);
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  h2 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 0.5rem;
    svg { color: var(--accent-primary); }
  }
  p { color: var(--text-secondary); font-size: 1.1rem; }
`;

const MainCard = styled.div`
  background: var(--bg-secondary);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-md);
  overflow: visible; 
`;

const CardHeader = styled.div`
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  svg { color: var(--text-secondary); }
`;

const CardBody = styled.div`
   padding: 0; 
`;

const SearchWrapper = styled.div`
    position: relative;
    width: 300px;
    svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-secondary);
    }
`;

const FilterRow = styled.div`
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
`;

const FilterSelect = styled.select`
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.85rem;
    min-width: 160px;
    cursor: pointer;
    &:focus { border-color: var(--accent-primary); outline: none; }
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 10px 10px 36px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.9rem;
    &:focus { border-color: var(--accent-primary); outline: none; }
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    th {
        text-align: left;
        padding: 1rem 1.5rem;
        color: var(--text-secondary);
        font-weight: 600;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-tertiary);
    }
    td {
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
        vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--bg-tertiary); }
`;

const UserProfile = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const Avatar = styled.img`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border-color);
`;

const UserName = styled.div`
    font-weight: 600;
    color: var(--text-primary);
`;

const UserEmail = styled.div`
    font-size: 0.85rem;
    color: var(--text-secondary);
`;

const SchoolId = styled.span`
    background: var(--bg-tertiary);
    padding: 4px 8px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.9rem;
    color: var(--text-primary);
    border: 1px solid var(--border-color);
`;

const ActionWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

// --- New Role Design ---

const RoleDisplay = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
    background: ${props => props.$active ? 'var(--bg-tertiary)' : 'transparent'};
    
    &:hover {
        background: var(--bg-tertiary);
        border-color: var(--border-color);
        
        // Show edit icon on hover
        div:last-child {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;

const RoleBadge = styled.span`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    background: ${props => `${getRoleColor(props.$role)}15`};
    color: ${props => getRoleColor(props.$role)};
    border: 1px solid ${props => `${getRoleColor(props.$role)}30`};
    
    svg { opacity: 0.9; }
`;

const EditIconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent-primary);
    color: white;
    opacity: ${props => props.$active ? 1 : 0};
    transform: ${props => props.$active ? 'translateX(0)' : 'translateX(-5px)'};
    transition: all 0.2s;
    margin-left: 4px;
`;

const RoleEditorContainer = styled.div`
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    width: 320px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    z-index: 50;
    animation: ${slideDown} 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
`;

const EditorHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-primary);
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    &:hover { background: rgba(0,0,0,0.05); color: var(--text-primary); }
`;

const EditorBody = styled.div`
    padding: 16px;
`;

const SectionLabel = styled.div`
    font-size: 0.75rem;
    color: var(--text-tertiary);
    font-weight: 600;
    margin-bottom: 8px;
    text-transform: uppercase;
`;

const RoleOptionsGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

const RoleOptionCard = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border-radius: 10px;
    border: 2px solid ${props => props.$selected ? getRoleColor(props.$role) : 'var(--border-color)'};
    background: ${props => props.$selected ? `${getRoleColor(props.$role)}10` : 'var(--bg-primary)'};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: ${props => props.$selected ? getRoleColor(props.$role) : 'var(--text-secondary)'};
        transform: translateY(-2px);
    }

    .icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${props => props.$selected ? getRoleColor(props.$role) : 'var(--bg-tertiary)'};
        color: ${props => props.$selected ? 'white' : 'var(--text-secondary)'};
        transition: all 0.2s;
    }

    .label {
        font-size: 0.8rem;
        font-weight: 600;
        color: ${props => props.$selected ? getRoleColor(props.$role) : 'var(--text-primary)'};
    }
`;

const CheckCircle = styled(Check)`
    position: absolute;
    top: 8px;
    right: 8px;
    color: currentColor;
`;

const Divider = styled.div`
    height: 1px;
    background: var(--border-color);
    margin: 16px 0;
`;

const SubRoleSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const SectionTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-tertiary);
    letter-spacing: 0.5px;
`;

const SubRoleGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

const SubRoleCard = styled.div`
    position: relative;
    display: flex;
    flex-direction: row; /* Horizontal layout for sub roles to save space if needed, or stick to column */
    align-items: center;
    gap: 10px;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid ${props => props.$selected ? getSubRoleColor(props.$subRole) : 'var(--border-color)'};
    background: ${props => props.$selected ? `${getSubRoleColor(props.$subRole)}10` : 'var(--bg-primary)'};
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
        border-color: ${props => props.$selected ? getSubRoleColor(props.$subRole) : 'var(--text-secondary)'};
        background: ${props => props.$selected ? `${getSubRoleColor(props.$subRole)}10` : 'var(--bg-tertiary)'};
    }

    .icon-box {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: ${props => props.$selected ? getSubRoleColor(props.$subRole) : 'var(--bg-tertiary)'};
        color: ${props => props.$selected ? 'white' : 'var(--text-secondary)'};
        transition: all 0.2s;
    }

    .label {
        font-size: 0.75rem;
        font-weight: 600;
        color: ${props => props.$selected ? getSubRoleColor(props.$subRole) : 'var(--text-primary)'};
        flex: 1;
    }
`;

const DeleteButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 6px;
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s;
    
    &:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #dc2626;
        border-color: rgba(239, 68, 68, 0.5);
        transform: translateY(-1px);
    }
    
    &:active {
        transform: translateY(0);
    }
`;

export default ManageUsersView;
