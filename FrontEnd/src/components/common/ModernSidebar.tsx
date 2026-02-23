import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import baseStyled, { css } from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { GLOBAL_ROLE_SIDEBAR_MENUS, SidebarRoleMenu } from "./roleSidebarMenus";

import {
  Sparkles,
  LogOut,
  Settings,
  Plus,
  Minus,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Briefcase,
  ShieldAlert,
  CreditCard
} from "lucide-react";

export const getSidebarWidth = () => 0; // Legacy export, no longer used

const styled = baseStyled as any;

const normalizeToken = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((entry) => String(entry || "").trim().toLowerCase())
            .filter(Boolean);
        }
      } catch (_) {}
    }

    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
    }

    return [trimmed.toLowerCase()];
  }

  return [];
};

const collectRoleSet = (user: any): Set<string> => {
  const roles = new Set<string>();
  if (!user) return roles;

  const raw = [
    user.role,
    user.roles,
    user.sub_role,
    user.sub_roles,
  ];

  raw.forEach((entry) => {
    normalizeToken(entry).forEach((token) => {
      if (token === "go") {
        roles.add("nt");
      } else if (token === "staff" || token === "non-teaching" || token === "non_teaching" || token === "nonteaching") {
        roles.add("staff");
        roles.add("nt");
      } else {
        roles.add(token);
      }
    });
  });

  return roles;
};

const ModernSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    activeRole,
    activeSubRole,
    switchRole,
    switchSubRole,
    logout,
    avatarUrl,
  } = useAuth();

  /* Removed expansion/hover logic as per user request (always open) */
  const [expandedRoles, setExpandedRoles] = useState<string[]>([]);
  const [showProfilePreview, setShowProfilePreview] = useState(false);

  const isExpanded = true;

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', '280px');
  }, []);

  const toggleRole = (roleKey: string) => {
    setExpandedRoles(prev => 
      prev.includes(roleKey) 
        ? prev.filter(k => k !== roleKey)
        : [...prev, roleKey]
    );
  };

  const roleSet = useMemo(() => collectRoleSet(user), [user]);

  const canAccessRole = (roleKey: string) => {
    if (roleKey === "staff") {
      return roleSet.has("staff") || roleSet.has("nt");
    }
    if (roleKey === "teacher") {
      return roleSet.has("teacher") || roleSet.has("dean");
    }
    return roleSet.has(roleKey);
  };

  const visibleMenus = useMemo(
    () => GLOBAL_ROLE_SIDEBAR_MENUS.filter((menu) => canAccessRole(menu.key) && menu.navItems.length > 0),
    [roleSet]
  );

  const hasMultipleRoles = visibleMenus.length > 1;

  const activeMenu = useMemo(() => {
    let winner = visibleMenus.find(menu => 
      menu.navItems.some(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
    );
    
    if (winner) return winner;

    if (activeSubRole === "osas") return visibleMenus.find(m => m.key === "osas");
    if (activeSubRole === "treasury") return visibleMenus.find(m => m.key === "treasury");
    
    const roleKey = activeRole === "nt" ? "staff" : activeRole;
    return visibleMenus.find(m => m.key === roleKey) || visibleMenus[0];
  }, [visibleMenus, location.pathname, activeRole, activeSubRole]);

  useEffect(() => {
    if (activeMenu?.key && !expandedRoles.includes(activeMenu.key)) {
      setExpandedRoles(prev => [...prev, activeMenu.key]);
    }
  }, [activeMenu]);

  const handleRoleSwitch = (menu: SidebarRoleMenu) => {
    if (menu.key === "admin") {
      switchRole("admin");
    } else if (menu.key === "student") {
      switchRole("student");
    } else if (menu.key === "teacher") {
      if (roleSet.has("teacher")) switchRole("teacher");
      else switchRole("faculty");
    } else if (menu.key === "osas") {
      switchRole(roleSet.has("teacher") ? "faculty" : "nt");
      switchSubRole("osas");
    } else if (menu.key === "treasury") {
      switchRole(roleSet.has("teacher") ? "faculty" : "nt");
      switchSubRole("treasury");
    } else if (menu.key === "staff") {
      switchRole("nt");
      switchSubRole("nt");
    }
    
    const isCurrentPathInNewMenu = menu.navItems.some(item => 
      location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    );
    if (!isCurrentPathInNewMenu && menu.navItems.length > 0) {
      navigate(menu.navItems[0].path);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (_) {
      navigate("/");
    }
  };

  return (
    <SidebarContainer 
      $expanded={isExpanded}
      onMouseLeave={() => setShowProfilePreview(false)}
    >
      <SidebarPill>
        <LogoArea $expanded={isExpanded}>
          <LogoImg src="/images/tcc-logo.png" alt="TCC Logo" />
          <LogoText>TCC PORTAL</LogoText>
        </LogoArea>

        {user?.school_id && (
          <UserInfoSection>
            <UserIdBanner>
              ID: {user.school_id}
            </UserIdBanner>
            <RoleBadges>
              {roleSet.has("student") && <GraduationCap size={18} aria-label="Student" color="#4A90E2" />}
              {roleSet.has("teacher") && <BookOpen size={18} aria-label="Teacher" color="#1ABC9C" />}
              {roleSet.has("faculty") && <BookOpen size={18} aria-label="Faculty" color="#1ABC9C" />}
              {roleSet.has("admin") && <ShieldCheck size={18} aria-label="Admin" color="#9B59B6" />}
              {roleSet.has("staff") && <Briefcase size={18} aria-label="Staff" color="#F39C12" />}
              {roleSet.has("osas") && <ShieldAlert size={18} aria-label="OSAS" color="#E74C3C" />}
              {roleSet.has("treasury") && <CreditCard size={18} aria-label="Treasury" color="#2ECC71" />}
            </RoleBadges>
          </UserInfoSection>
        )}

        <NavItemsList>
          {hasMultipleRoles ? (
            visibleMenus.map(menu => {
              const isRoleExpanded = expandedRoles.includes(menu.key);
              const isActiveRole = activeMenu?.key === menu.key;

              return (
                <RoleGroup key={menu.key}>
                  <NavItem 
                    $active={isActiveRole} 
                    $expanded={isExpanded}
                    title={!isExpanded ? menu.label : undefined}
                    onClick={() => {
                        toggleRole(menu.key);
                        handleRoleSwitch(menu);
                    }}
                  >
                    <menu.icon size={isExpanded ? 20 : 32} />
                    {isExpanded && (
                      <>
                        <span className="label" style={{ fontWeight: isActiveRole ? 700 : 500 }}>{menu.label}</span>
                        <div className="action-icon">
                          {isRoleExpanded ? <Minus size={16} /> : <Plus size={16} />}
                        </div>
                      </>
                    )}
                  </NavItem>
                  
                  {isExpanded && isRoleExpanded && (
                    <SubNavList>
                      {menu.navItems.map(item => {
                        const isItemActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                        return (
                          <SubNavItem 
                            key={item.id} 
                            $active={isItemActive}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(item.path);
                            }}
                          >
                            <item.icon size={16} />
                            <span>{item.label}</span>
                          </SubNavItem>
                        );
                      })}
                    </SubNavList>
                  )}
                </RoleGroup>
              );
            })
          ) : (
            activeMenu?.navItems.map(item => {
              const isItemActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <NavItem 
                  key={item.id}
                  $active={isItemActive}
                  $expanded={isExpanded}
                  title={!isExpanded ? item.label : undefined}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon size={isExpanded ? 20 : 32} />
                  {isExpanded && (
                    <span className="label" style={{ fontWeight: isItemActive ? 700 : 500 }}>{item.label}</span>
                  )}
                </NavItem>
              );
            })
          )}
        </NavItemsList>

        <SidebarFooter>
          {showProfilePreview && (
            <ProfilePreviewCard>
              <img src={avatarUrl} onError={(e) => (e.currentTarget.src = "/images/sample.jpg")} alt="Profile preview" />
            </ProfilePreviewCard>
          )}

          <UserProfile 
            onClick={() => navigate("/home/settings")}
            onMouseEnter={() => setShowProfilePreview(true)}
            onMouseLeave={() => setShowProfilePreview(false)}
          >
            <Avatar src={avatarUrl} onError={(e) => (e.currentTarget.src = "/images/sample.jpg")} />
            <div className="info">
              <p className="name">{user?.full_name?.split(' ')[0] || "User"}</p>
            </div>
            <OptionsButton onClick={(e) => { e.stopPropagation(); handleLogout(); }}>
              <LogOut size={16} />
            </OptionsButton>
          </UserProfile>
        </SidebarFooter>
      </SidebarPill>
    </SidebarContainer>
  );
};

const SidebarContainer = baseStyled.aside<{ $expanded: boolean }>`
  display: flex;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 10000;
  padding: 12px;
  width: ${props => props.$expanded ? '280px' : '88px'};
  transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;

  @media (max-width: 1024px) {
    display: none;
  }

  & * {
    pointer-events: auto;
  }
`;

const SidebarPill = baseStyled.div`
  width: 100%;
  height: 100%;
  background: var(--bg-secondary); 
  border: 1px solid var(--border-color);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 36px;
  display: flex;
  flex-direction: column;
  padding: 24px 14px;
  position: relative;
  box-shadow: var(--shadow-md);
`;

const LogoArea = baseStyled.div<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 12px;
  margin-bottom: 24px;
  color: var(--text-primary);
`;

const LogoImg = baseStyled.img`
  width: 32px;
  height: 32px;
  object-fit: contain;
`;

const LogoText = baseStyled.span`
  font-size: 1.25rem;
  font-weight: 800;
  white-space: nowrap;
`;

const UserIdBanner = baseStyled.div`
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  padding: 8px 16px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  display: inline-block;
  letter-spacing: 0.5px;
`;

const UserInfoSection = baseStyled.div`
  margin: 0 12px 32px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const RoleBadges = baseStyled.div`
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 4px 0;
  
  svg {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
    transition: transform 0.2s;
    
    &:hover {
      transform: translateY(-2px);
    }
  }
`;

/* Removed ToggleNub as sidebar is always open */

const NavItemsList = baseStyled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar {
    width: 0;
  }
`;

const RoleGroup = baseStyled.div`
  display: flex;
  flex-direction: column;
`;

const NavItem = baseStyled.button<{ $active?: boolean; $expanded?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  
  background: ${props => props.$active ? 'var(--bg-tertiary)' : 'transparent'};
  color: ${props => props.$active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  border: ${props => (props.$active && !props.$expanded) ? '1px solid var(--border-color)' : '1px solid transparent'};
  box-shadow: ${props => (props.$active && !props.$expanded) ? 'var(--shadow-md)' : 'none'};

  justify-content: ${props => props.$expanded ? 'flex-start' : 'center'};

  .label {
    font-size: 0.95rem;
    flex: 1;
    text-align: left;
    white-space: nowrap;
    color: ${props => props.$active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  }

  .action-icon {
    display: flex;
    align-items: center;
    opacity: ${props => props.$active ? 1 : 0.6};
  }

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    .label {
      color: var(--text-primary);
    }
  }
`;

const SubNavList = baseStyled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  margin-left: 20px;
  padding-left: 14px;
  margin-top: 4px;
  margin-bottom: 8px;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 12px;
    width: 1px;
    background: rgba(0,0,0,0.1);
  }
`;

const SubNavItem = baseStyled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: none;
  background: ${props => props.$active ? 'var(--bg-primary)' : 'transparent'};
  border-radius: 16px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: all 0.2s;
  box-shadow: ${props => props.$active ? 'var(--shadow-sm)' : 'none'};
  border: ${props => props.$active ? '1px solid var(--border-color)' : '1px solid transparent'};
  color: ${props => props.$active ? 'var(--text-primary)' : 'var(--text-secondary)'};

  span {
    font-size: 0.85rem;
    font-weight: ${props => props.$active ? '700' : '500'};
    white-space: nowrap;
  }

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
`;

const SidebarFooter = baseStyled.div`
  position: relative;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(0,0,0,0.05);
`;

const UserProfile = baseStyled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: var(--bg-tertiary);
  }

  .info {
    flex: 1;
    overflow: hidden;
  }
  .name {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const OptionsButton = baseStyled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background: var(--btn-secondary-bg);
  border: none;
  cursor: pointer;
  color: var(--btn-secondary-text);
  transition: all 0.2s;

  &:hover {
    background: #ffebe9;
    color: #ef4444;
  }
`;

const Avatar = baseStyled.img`
  width: 32px;
  height: 32px;
  border-radius: 12px;
  object-fit: cover;
  background: #f0f0f0;
  cursor: pointer;
  border: 1px solid rgba(0,0,0,0.05);
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.05);
    border-color: var(--accent-primary);
  }
`;

const ProfilePreviewCard = baseStyled.div`
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  width: 140px;
  height: 140px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  padding: 8px;
  z-index: 10001;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid var(--border-color);
  }

  &::before {
    content: '';
    position: absolute;
    bottom: -7px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-top: 7px solid var(--bg-primary);
    z-index: 1;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;

export default ModernSidebar;
