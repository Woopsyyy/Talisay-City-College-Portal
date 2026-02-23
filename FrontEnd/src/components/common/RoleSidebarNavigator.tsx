import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import baseStyled from "styled-components";
import { useAuth } from "../../context/AuthContext";
import { SidebarRoleMenu } from "./roleSidebarMenus";

const styled = baseStyled as any;

type RoleSidebarNavigatorProps = {
  menus: SidebarRoleMenu[];
};

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
      } catch (_) {
        // fallback below
      }
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
      } else if (token === "staff") {
        roles.add("staff");
        roles.add("nt");
      } else if (token === "non-teaching" || token === "non_teaching" || token === "nonteaching") {
        roles.add("staff");
        roles.add("nt");
      } else {
        roles.add(token);
      }
    });
  });

  return roles;
};

const RoleSidebarNavigator = ({ menus }: RoleSidebarNavigatorProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    activeRole,
    activeSubRole,
    switchRole,
    switchSubRole,
  } = useAuth();

  const [hoveredRoleKey, setHoveredRoleKey] = useState<string | null>(null);
  const [pinnedRoleKey, setPinnedRoleKey] = useState<string | null>(null);
  const [isNavigatorHovered, setIsNavigatorHovered] = useState(false);
  const [flyoutTopOffset, setFlyoutTopOffset] = useState(0);
  const closeHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigatorShellRef = useRef<HTMLDivElement | null>(null);
  const flyoutPanelRef = useRef<HTMLDivElement | null>(null);
  const roleButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const clearCloseHoverTimer = () => {
    if (closeHoverTimerRef.current) {
      clearTimeout(closeHoverTimerRef.current);
      closeHoverTimerRef.current = null;
    }
  };

  const keepNavigatorOpen = () => {
    clearCloseHoverTimer();
    setIsNavigatorHovered(true);
  };

  const queueNavigatorClose = () => {
    clearCloseHoverTimer();
    closeHoverTimerRef.current = setTimeout(() => {
      setIsNavigatorHovered(false);
      setHoveredRoleKey(null);
    }, 160);
  };

  useEffect(() => {
    return () => {
      clearCloseHoverTimer();
    };
  }, []);

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
    () => menus.filter((menu) => canAccessRole(menu.key) && menu.navItems.length > 0),
    [menus, roleSet],
  );
  const hasMultipleMenus = visibleMenus.length > 1;

  const activeMenuByPath = useMemo(() => {
    let winner: SidebarRoleMenu | null = null;
    let longestMatch = -1;

    visibleMenus.forEach((menu) => {
      menu.navItems.forEach((item) => {
        const exact = location.pathname === item.path;
        const prefix = location.pathname.startsWith(`${item.path}/`);
        const matched = exact || prefix;
        if (!matched) return;
        if (item.path.length > longestMatch) {
          longestMatch = item.path.length;
          winner = menu;
        }
      });
    });

    return winner;
  }, [location.pathname, visibleMenus]);

  const fallbackMenuKey = useMemo(() => {
    if (activeSubRole === "osas") return "osas";
    if (activeSubRole === "treasury") return "treasury";
    if (activeRole === "teacher" || activeRole === "faculty") return "teacher";
    if (activeRole === "admin") return "admin";
    if (activeRole === "student") return "student";
    if (activeRole === "nt") return "staff";
    return visibleMenus[0]?.key || null;
  }, [activeRole, activeSubRole, visibleMenus]);

  const openRoleKey =
    hoveredRoleKey ||
    pinnedRoleKey ||
    activeMenuByPath?.key ||
    fallbackMenuKey;
  const isFlyoutVisible = isNavigatorHovered || hoveredRoleKey !== null;

  const openMenu =
    visibleMenus.find((menu) => menu.key === openRoleKey) ||
    visibleMenus[0] ||
    null;

  useEffect(() => {
    if (!hasMultipleMenus || !openMenu) return;

    const updateFlyoutOffset = () => {
      const shell = navigatorShellRef.current;
      const targetButton = roleButtonRefs.current[openMenu.key];
      if (!shell || !targetButton) return;

      const shellRect = shell.getBoundingClientRect();
      const buttonRect = targetButton.getBoundingClientRect();
      const preferredTop = Math.max(8, buttonRect.top - shellRect.top);
      const panelHeight = flyoutPanelRef.current?.offsetHeight || 320;
      const viewportPadding = 12;
      const maxTop = Math.max(
        8,
        window.innerHeight - viewportPadding - panelHeight - shellRect.top,
      );
      const clampedTop = Math.min(preferredTop, maxTop);
      setFlyoutTopOffset(clampedTop);
    };

    const rafId = requestAnimationFrame(() => {
      updateFlyoutOffset();
      requestAnimationFrame(updateFlyoutOffset);
    });
    window.addEventListener("resize", updateFlyoutOffset);
    window.addEventListener("scroll", updateFlyoutOffset, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateFlyoutOffset);
      window.removeEventListener("scroll", updateFlyoutOffset);
    };
  }, [
    hasMultipleMenus,
    openMenu?.key,
    hoveredRoleKey,
    pinnedRoleKey,
    location.pathname,
    visibleMenus.length,
  ]);

  const applyRoleContext = (menuKey: string) => {
    if (menuKey === "admin") {
      switchRole("admin");
      return;
    }

    if (menuKey === "student") {
      switchRole("student");
      return;
    }

    if (menuKey === "teacher") {
      if (roleSet.has("teacher")) switchRole("teacher");
      else if (roleSet.has("dean")) {
        switchRole("faculty");
        switchSubRole("dean");
      }
      return;
    }

    if (menuKey === "osas") {
      switchRole(roleSet.has("teacher") ? "faculty" : "nt");
      switchSubRole("osas");
      return;
    }

    if (menuKey === "treasury") {
      switchRole(roleSet.has("teacher") ? "faculty" : "nt");
      switchSubRole("treasury");
      return;
    }

    if (menuKey === "staff") {
      switchRole("nt");
      switchSubRole("nt");
    }
  };

  if (!openMenu) return null;

  if (!hasMultipleMenus) {
    return (
      <NavigatorShell ref={navigatorShellRef} $singleMode>
        <SingleNavList aria-label={`${openMenu.label} Navigation`}>
          {openMenu.navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);
            const Icon = item.icon;
            return (
              <SingleNavButton
                key={`${openMenu.key}-${item.id}`}
                $active={isActive}
                onClick={() => {
                  applyRoleContext(openMenu.key);
                  navigate(item.path);
                  setPinnedRoleKey(openMenu.key);
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </SingleNavButton>
            );
          })}
        </SingleNavList>
      </NavigatorShell>
    );
  }

  return (
    <NavigatorShell
      ref={navigatorShellRef}
      onMouseEnter={keepNavigatorOpen}
      onMouseLeave={queueNavigatorClose}
    >
      <RoleList aria-label="Role Navigation">
        {visibleMenus.map((menu) => {
          const isActive = menu.key === openMenu.key;
          const RoleIcon = menu.icon;
          return (
            <RoleButton
              key={menu.key}
              ref={(el) => {
                roleButtonRefs.current[menu.key] = el;
              }}
              $active={isActive}
              onMouseEnter={() => {
                keepNavigatorOpen();
                setHoveredRoleKey(menu.key);
              }}
              onFocus={() => {
                keepNavigatorOpen();
                setHoveredRoleKey(menu.key);
              }}
              onClick={() => {
                setPinnedRoleKey(menu.key);
                applyRoleContext(menu.key);
              }}
              title={menu.label}
            >
              <RoleButtonStart>
                <RoleIcon size={15} />
                <span>{menu.label}</span>
              </RoleButtonStart>
            </RoleButton>
          );
        })}
      </RoleList>

      {isFlyoutVisible && (
        <FlyoutPanel
          ref={flyoutPanelRef}
          $topOffset={flyoutTopOffset}
          onMouseEnter={keepNavigatorOpen}
          onMouseLeave={queueNavigatorClose}
        >
          <FlyoutTitle>{openMenu.label}</FlyoutTitle>
          <FlyoutItems>
            {openMenu.navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);
              const Icon = item.icon;
              return (
                <FlyoutButton
                  key={`${openMenu.key}-${item.id}`}
                  $active={isActive}
                  onClick={() => {
                    applyRoleContext(openMenu.key);
                    navigate(item.path);
                    setPinnedRoleKey(openMenu.key);
                  }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </FlyoutButton>
              );
            })}
          </FlyoutItems>
        </FlyoutPanel>
      )}
    </NavigatorShell>
  );
};

const NavigatorShell = styled.div`
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0.75rem;
  border-bottom: ${(props) => (props.$singleMode ? "none" : "1px solid var(--border-color)")};
  z-index: 12010;
`;

const RoleList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: space-evenly;
  min-height: 0;
`;

const RoleButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border: none;
  background: ${(props) => (props.$active ? "var(--bg-tertiary)" : "transparent")};
  color: ${(props) => (props.$active ? "var(--accent-primary)" : "var(--text-secondary)")};
  box-shadow: ${(props) =>
    props.$active
      ? "0 0 0 1px var(--accent-primary), 0 0 14px rgba(26, 188, 156, 0.3)"
      : "none"};
  border-radius: 8px;
  padding: 10px 10px;
  min-height: 44px;
  font-size: 0.8rem;
  font-weight: ${(props) => (props.$active ? 700 : 600)};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-primary);
  }

  &:focus-visible {
    outline: none;
  }
`;

const RoleButtonStart = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    flex-shrink: 0;
  }
`;

const FlyoutPanel = styled.div`
  position: absolute;
  left: calc(100% + 8px);
  top: ${(props) => `${props.$topOffset}px`};
  width: 230px;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-md);
  padding: 10px;
  transition: top 0.2s ease;
  z-index: 12020;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: -12px;
    width: 12px;
    height: 100%;
  }

  @media (max-width: 980px) {
    display: none;
  }
`;

const FlyoutTitle = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-tertiary);
  letter-spacing: 0.8px;
  margin-bottom: 8px;
  padding: 0 4px;
`;

const SingleNavList = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
`;

const SingleNavButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: ${(props) => (props.$active ? "var(--bg-tertiary)" : "transparent")};
  color: ${(props) => (props.$active ? "var(--accent-primary)" : "var(--text-secondary)")};
  box-shadow: ${(props) =>
    props.$active
      ? "0 0 0 1px var(--accent-primary), 0 0 12px rgba(26, 188, 156, 0.25)"
      : "none"};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.83rem;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--accent-primary);
    background: var(--bg-tertiary);
  }

  &:focus-visible {
    outline: none;
  }
`;

const FlyoutItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FlyoutButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: ${(props) => (props.$active ? "var(--bg-tertiary)" : "transparent")};
  color: ${(props) => (props.$active ? "var(--accent-primary)" : "var(--text-secondary)")};
  box-shadow: ${(props) =>
    props.$active
      ? "0 0 0 1px var(--accent-primary), 0 0 12px rgba(26, 188, 156, 0.25)"
      : "none"};
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.8rem;
  font-weight: ${(props) => (props.$active ? 700 : 500)};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: var(--accent-primary);
    background: var(--bg-tertiary);
  }

  &:focus-visible {
    outline: none;
  }
`;

export default RoleSidebarNavigator;
