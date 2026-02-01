import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AdminAPI, getAvatarUrl } from '../../../services/api';
import { Users, Search, Shield, UserCog, UserCheck, AlertCircle, Trash2 } from 'lucide-react';
import Toast from '../../common/Toast';
import DeleteModal from '../../common/DeleteModal';

const ManageUsersView = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [avatarUrls, setAvatarUrls] = useState({});
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredUsers(users);
        } else {
            const lowerQ = searchQuery.toLowerCase();
            setFilteredUsers(users.filter(user => 
                (user.username && user.username.toLowerCase().includes(lowerQ)) ||
                (user.full_name && user.full_name.toLowerCase().includes(lowerQ)) ||
                (user.school_id && String(user.school_id).includes(lowerQ))
            ));
        }
    }, [searchQuery, users]);

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
            setUsers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Error fetching users:", err);
            setToast({ show: true, message: "Failed to load users.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
             setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
             await AdminAPI.updateUserRole(userId, newRole);
             setToast({ show: true, message: "User role updated successfully", type: 'success' });
        } catch (err) {
            setToast({ show: true, message: `Error updating role: ${err.message}`, type: 'error' });
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
                </CardHeader>

                <CardBody>
                     <div className="table-responsive">
                        <Table>
                            <thead>
                                <tr>
                                    <th>User Profile</th>
                                    <th>School ID</th>
                                    <th>Role Assignment</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="3" className="text-center py-5 text-muted">Loading users...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center py-5 text-muted">No users found matching your search.</td></tr>
                                ) : (
                                    filteredUsers.map(user => (
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
                                                <ActionWrapper>
                                                    <RoleSelect 
                                                        value={user.role} 
                                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                        role={user.role}
                                                    >
                                                        <option value="student">Student</option>
                                                        <option value="teacher">Teacher</option>
                                                        <option value="admin">Admin</option>
                                                    </RoleSelect>
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
  overflow: hidden;
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

const RoleSelect = styled.select`
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid ${props => 
        props.role === 'admin' ? '#fecaca' : 
        props.role === 'teacher' ? '#bae6fd' : 
        'rgba(34, 197, 94, 0.5)'};
    background: ${props => 
        props.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 
        props.role === 'teacher' ? 'rgba(56, 189, 248, 0.1)' : 
        'rgba(34, 197, 94, 0.1)'};
    color: ${props => 
        props.role === 'admin' ? '#ef4444' : 
        props.role === 'teacher' ? '#0ea5e9' : 
        '#22c55e'};
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    &:focus { outline: none; box-shadow: 0 0 0 2px var(--bg-secondary); }
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
