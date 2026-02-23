import React from 'react';
import baseStyled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    GraduationCap, BookOpen, ShieldCheck, Briefcase,
    Library, Award, HeartHandshake, Banknote
} from 'lucide-react';

const styled = baseStyled as any;

const ROLE_CONFIG = {
    admin: { icon: ShieldCheck, color: '#ef4444', path: '/admin/dashboard', label: 'Admin' },
    teacher: { icon: BookOpen, color: '#10b981', path: '/teachers', label: 'Teacher' },
    student: { icon: GraduationCap, color: '#3b82f6', path: '/home', label: 'Student' },
};

const RoleSwitcher = () => {
    const { user, activeRole, switchRole } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
    const mainRolesList = ['admin', 'teacher', 'student'];
    const availableMainRoles = userRoles.filter(role => mainRolesList.includes(role.toLowerCase()));

    if (availableMainRoles.length <= 1) return null;

    const handleSwitch = (role) => {
        if (role === activeRole) return;
        switchRole(role);
        const config = ROLE_CONFIG[role];
        if (config && config.path) {
            navigate(config.path);
        }
    };

    return (
        <SwitcherContainer>
            <SwitcherLabel>Switch Role</SwitcherLabel>
            <RolesGrid>
                {availableMainRoles.map(role => {
                    const config = ROLE_CONFIG[role] || { icon: Briefcase, color: '#94a3b8', label: role };
                    const Icon = config.icon;
                    const isActive = activeRole === role;

                    return (
                        <RoleIconBtn 
                            key={role}
                            $color={config.color}
                            $active={isActive}
                            onClick={() => handleSwitch(role)}
                            title={config.label}
                        >
                            <Icon size={14} />
                            {isActive && <ActiveDot />}
                        </RoleIconBtn>
                    );
                })}
            </RolesGrid>
        </SwitcherContainer>
    );
};

const SwitcherContainer = styled.div`
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 10px;
    margin-bottom: 8px;
    border: 1px solid var(--border-color);
`;

const SwitcherLabel = styled.div`
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 6px;
    letter-spacing: 0.5px;
    opacity: 0.8;
`;

const RolesGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
`;

const RoleIconBtn = styled.button`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid ${props => props.$active ? props.$color : 'var(--border-color)'};
    background: ${props => props.$active ? `${props.$color}20` : 'var(--bg-primary)'};
    color: ${props => props.$active ? props.$color : 'var(--text-secondary)'};
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        transform: translateY(-1px);
        background: ${props => `${props.$color}10`};
        border-color: ${props => props.$color};
        color: ${props => props.$color};
    }

    &:active {
        transform: scale(0.95);
    }
`;

const ActiveDot = styled.div`
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    border: 1.5px solid var(--bg-secondary);
`;

export default RoleSwitcher;
