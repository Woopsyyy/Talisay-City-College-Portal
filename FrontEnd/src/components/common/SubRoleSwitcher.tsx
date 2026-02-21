import React from 'react';
import baseStyled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
    Briefcase, ShieldAlert, CreditCard, Award
} from 'lucide-react';

const styled = baseStyled as any;

const SUB_ROLE_CONFIG = {
    nt: { icon: Briefcase, color: '#f59e0b', path: '/nt/dashboard/study_load', label: 'Other/Staff' },
    osas: { icon: ShieldAlert, color: '#ec4899', path: '/nt/dashboard/warning', label: 'OSAS' },
    treasury: { icon: CreditCard, color: '#10b981', path: '/nt/dashboard/payment', label: 'Treasury' },
    dean: { icon: Award, color: '#eab308', path: '/teachers/schedule', label: 'Dean' }
};

const SubRoleSwitcher = () => {
    const { user, activeSubRole, switchSubRole } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    // Helper to safely parse roles from any format
    const gatherRoles = (user) => {
        if (!user) return [];
        const raw = [
            user.role,
            ...(Array.isArray(user.roles) ? user.roles : []),
            user.sub_role,
            ...(Array.isArray(user.sub_roles) ? user.sub_roles : [])
        ];
        
        // Also handle JSON strings if present
        const processed = raw.flatMap(item => {
            if (!item) return [];
            if (typeof item === 'string') {
                try {
                    const parsed = JSON.parse(item);
                    return Array.isArray(parsed) ? parsed : [item];
                } catch (e) { return [item]; }
            }
            return [item];
        });

        return [...new Set(processed.map(r => String(r || '').toLowerCase().trim()))].filter(Boolean);
    };

    const userAllRoles = gatherRoles(user);
    
    // Aggregate all functional areas defined in our config
    const availableSubRoles = userAllRoles.filter(role => 
        ['nt', 'osas', 'treasury', 'dean'].includes(role)
    );
    
    if (availableSubRoles.length === 0) return null;

    const handleSwitch = (role) => {
        switchSubRole(role);
        const config = SUB_ROLE_CONFIG[role];
        if (config && config.path) {
            navigate(config.path);
        }
    };

    return (
        <SwitcherContainer>
            <SwitcherLabel>Functional Areas</SwitcherLabel>
            <RolesGrid>
                {availableSubRoles.map(role => {
                    const config = SUB_ROLE_CONFIG[role] || { icon: Briefcase, color: '#94a3b8', label: role };
                    const Icon = config.icon;
                    const isActive = activeSubRole === role;

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
    padding: 0;
    margin-bottom: 16px;
`;

const SwitcherLabel = styled.div`
    font-size: 0.55rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 6px;
    letter-spacing: 0.5px;
    text-align: center;
    opacity: 0.8;
`;

const RolesGrid = styled.div`
    display: flex;
    justify-content: center;
    gap: 6px;
`;

const RoleIconBtn = styled.button`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    border: 1px solid ${props => props.$active ? props.$color : 'var(--border-color)'};
    background: ${props => props.$active ? `${props.$color}15` : 'transparent'};
    color: ${props => props.$active ? props.$color : 'var(--text-secondary)'};
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        transform: scale(1.15);
        background: ${props => `${props.$color}10`};
        border-color: ${props => props.$color};
        color: ${props => props.$color};
    }

    &:active {
        transform: scale(0.9);
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

export default SubRoleSwitcher;
