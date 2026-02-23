import React from 'react';
import baseStyled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, BookOpen, GraduationCap, Briefcase, 
    Library
} from 'lucide-react';

const styled = baseStyled as any;

const ROLE_CONFIG = {
    admin: { icon: ShieldCheck, color: '#ef4444', path: '/admin/dashboard', label: 'Admin' },
    student: { icon: GraduationCap, color: '#3b82f6', path: '/home', label: 'Student' },
    teacher: { icon: BookOpen, color: '#10b981', path: '/teachers', label: 'Teacher' },
    nt: { icon: Briefcase, color: '#f59e0b', path: '/nt/dashboard/study_load', label: 'Staff' },
    faculty: { icon: Library, color: '#6366f1', path: '/teachers', label: 'Faculty' }
};

const ROLE_ORDER = ['admin', 'student', 'teacher', 'nt', 'faculty'];
const FACULTY_SUB_ROLES = ['dean', 'osas', 'treasury'];

const UnifiedRoleSwitcher = ({ label = 'Account Context' }) => {
    const { user, activeRole, switchRole } = useAuth();
    const navigate = useNavigate();

    // Helper to safely parse roles from any format
    const gatherRoles = (user) => {
        if (!user) return [];
        const raw = [
            user.role,
            ...(Array.isArray(user.roles) ? user.roles : []),
            user.sub_role,
            ...(Array.isArray(user.sub_roles) ? user.sub_roles : [])
        ];
        
        const processed = raw.flatMap(item => {
            if (!item) return [];
            if (typeof item === 'string') {
                const trimmed = item.trim();
                if (!trimmed) return [];
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed;
                    if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
                } catch (e) {
                    // fall through
                }
                if (trimmed.includes(',')) {
                    return trimmed.split(',').map(part => part.trim()).filter(Boolean);
                }
                return [trimmed];
            }
            return [item];
        });

        return [...new Set(processed.map(r => String(r || '').toLowerCase().trim()))].filter(Boolean);
    };

    const userAllRoles = gatherRoles(user);
    const hasFacultyAccess = userAllRoles.some((role) => FACULTY_SUB_ROLES.includes(role));
    const availableRoles = ROLE_ORDER.filter((role) => {
        if (role === 'faculty') return hasFacultyAccess;
        return userAllRoles.includes(role);
    });

    if (availableRoles.length === 0) return null;

    const handleSwitch = (roleId) => {
        const config = ROLE_CONFIG[roleId];
        if (!config) return;

        switchRole(roleId);

        let targetPath = config.path;
        if (roleId === 'faculty') {
            const hasDean = userAllRoles.includes('dean');
            const hasStaffSubRole = userAllRoles.includes('osas') || userAllRoles.includes('treasury');
            if (hasDean) {
                targetPath = '/teachers';
            } else if (hasStaffSubRole || userAllRoles.includes('nt')) {
                targetPath = '/nt/dashboard/study_load';
            } else if (userAllRoles.includes('teacher')) {
                targetPath = '/teachers';
            }
        }

        if (targetPath) navigate(targetPath);
    };

    return (
        <SwitcherWrapper>
            <SwitcherLabel>{label}</SwitcherLabel>
            
            <MainToolbar>
                {availableRoles.map(roleId => {
                    const config = ROLE_CONFIG[roleId];
                    const Icon = config.icon;
                    const isActive = activeRole === roleId;

                    return (
                        <RoleIconBtn 
                            key={roleId}
                            $color={config.color}
                            $active={isActive}
                            onClick={() => handleSwitch(roleId)}
                            title={config.label}
                        >
                            <Icon size={14} />
                            {isActive && <ActiveGlow $color={config.color} />}
                        </RoleIconBtn>
                    );
                })}
            </MainToolbar>
        </SwitcherWrapper>
    );
};

const SwitcherWrapper = styled.div`
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 8px;
    margin-bottom: 8px;
    position: relative;
    overflow: hidden;

    &:hover {
        background: rgba(0, 0, 0, 0.04);
        border-color: var(--accent-primary);
    }
`;

const SwitcherLabel = styled.div`
    font-size: 0.55rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 6px;
    letter-spacing: 1px;
    text-align: center;
    opacity: 0.6;
`;

const MainToolbar = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 2px 0;
`;

const RoleIconBtn = styled.button`
    position: relative;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid ${props => props.$active ? props.$color : 'var(--border-color)'};
    background: ${props => props.$active ? `${props.$color}15` : 'var(--bg-primary)'};
    color: ${props => props.$active ? props.$color : 'var(--text-secondary)'};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        transform: scale(1.1);
        border-color: ${props => props.$color};
        color: ${props => props.$color};
        box-shadow: 0 4px 12px ${props => `${props.$color}20`};
    }

    &:active {
        transform: scale(0.9);
    }
`;

const ActiveGlow = styled.div`
    position: absolute;
    inset: -1px;
    border: 2px solid ${props => props.$color};
    border-radius: 8px;
    animation: pulse 2s infinite;
    pointer-events: none;

    @keyframes pulse {
        0% { opacity: 0.6; transform: scale(1); }
        50% { opacity: 0.2; transform: scale(1.05); }
        100% { opacity: 0.0; transform: scale(1.1); }
    }
`;

export default UnifiedRoleSwitcher;
