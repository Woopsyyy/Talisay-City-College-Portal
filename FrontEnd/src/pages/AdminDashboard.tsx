import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import baseStyled, { keyframes } from "styled-components";
import {
  Activity,
  CalendarDays,
  Clock3,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  UserCog,
  WifiOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageSkeleton from "../components/loaders/PageSkeleton";
import { AdminAPI } from "../services/apis/admin";
import {
  ADMIN_BACKEND_HEALTH_GUARD,
  computeAdaptiveBackoffMs,
} from "../config/runtimeGuards";

const AdminPortalOverview = lazy(() => import("../components/views/admin/AdminPortalOverview"));
const ManageUsersView = lazy(() => import("../components/views/admin/ManageUsersView"));
const SettingsView = lazy(() => import("../components/views/admin/SettingsView"));
const FeedbackInboxView = lazy(() => import("../components/views/admin/FeedbackInboxView"));
const AccountAccessView = lazy(() => import("../components/views/admin/AccountAccessView"));
const AdminAccountsView = lazy(() => import("../components/views/admin/AdminAccountsView"));
const PendingApprovalsView = lazy(() => import("../components/views/admin/PendingApprovalsView"));
const StatusLogsView = lazy(() => import("../components/views/admin/StatusLogsView"));
const DayOffView = lazy(() => import("../components/views/admin/DayOffView"));

const styled = baseStyled as any;

type AdminNavItem = {
  id: string;
  label: string;
  path: string;
  icon: any;
  hint: string;
  group: "main" | "management";
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "overview",
    label: "Dashboard",
    path: "/admin/dashboard/overview",
    icon: LayoutDashboard,
    hint: "Realtime monitoring and system telemetry",
    group: "main",
  },
  {
    id: "account_access",
    label: "Account Access",
    path: "/admin/dashboard/account_access",
    icon: KeyRound,
    hint: "Credentials and permissions",
    group: "main",
  },
  {
    id: "pending_approval",
    label: "Pending Requests",
    path: "/admin/dashboard/pending_approval",
    icon: Inbox,
    hint: "Approval queue",
    group: "main",
  },
  {
    id: "admin_accounts",
    label: "Admin Accounts",
    path: "/admin/dashboard/admin_accounts",
    icon: ShieldCheck,
    hint: "Dedicated admin roster and security visibility",
    group: "main",
  },
  {
    id: "status_logs",
    label: "Status Logs",
    path: "/admin/dashboard/status_logs",
    icon: Activity,
    hint: "Audit trails and events",
    group: "main",
  },
  {
    id: "day_off",
    label: "Day Off",
    path: "/admin/dashboard/day_off",
    icon: CalendarDays,
    hint: "Leave, holiday, and absence controls",
    group: "main",
  },
  {
    id: "manage_user",
    label: "Manage Users",
    path: "/admin/dashboard/manage_user",
    icon: UserCog,
    hint: "Onboarding and role assignment",
    group: "management",
  },
  {
    id: "server_maintenance",
    label: "Server Actions",
    path: "/admin/dashboard/server-maintenance",
    icon: Settings,
    hint: "Backup, restore, and maintenance actions",
    group: "management",
  },
  {
    id: "feedback",
    label: "Feedback Inbox",
    path: "/admin/dashboard/feedback",
    icon: MessageSquare,
    hint: "Reports from users",
    group: "management",
  },
];

const normalizeUserRoleTokens = (user: any): string[] => {
  if (!user || typeof user !== "object") return [];

  const parseValue = (value: unknown): string[] => {
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

  return [
    ...parseValue(user.role),
    ...parseValue(user.roles),
    ...parseValue(user.sub_role),
    ...parseValue(user.sub_roles),
  ];
};

const AdminModuleFrame = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <ModuleSurface>
      <ModuleHeader>
        <h2>{title}</h2>
        <p>{description}</p>
      </ModuleHeader>
      <ModuleBody>{children}</ModuleBody>
    </ModuleSurface>
  );
};

const getModuleSkeletonConfig = (moduleId: string) => {
  switch (moduleId) {
    case "overview":
      return { variant: "dashboard", columns: 4 };
    case "server_maintenance":
      return { variant: "cards", columns: 4 };
    case "status_logs":
    case "manage_user":
      return { variant: "table", columns: 4 };
    case "account_access":
    case "admin_accounts":
    case "pending_approval":
    case "day_off":
      return { variant: "list", columns: 4 };
    default:
      return { variant: "cards", columns: 4 };
  }
};

const ModuleRouteSkeleton = ({ moduleId }: { moduleId: string }) => {
  const config = getModuleSkeletonConfig(moduleId);
  return (
    <ModuleLoadingSurface>
      <ModuleLoadingHead>
        <ModuleLoadingLine />
        <ModuleLoadingLine $short />
      </ModuleLoadingHead>
      <PageSkeleton variant={config.variant} compact columns={config.columns} />
    </ModuleLoadingSurface>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, loading: authLoading, avatarUrl, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [backendLastCheckedAt, setBackendLastCheckedAt] = useState<string | null>(null);
  const [backendBackoffMs, setBackendBackoffMs] = useState(0);
  const backendHealthGuardRef = useRef<{
    inFlight: boolean;
    failureCount: number;
    blockedUntil: number;
    pending: boolean;
    timer: number | null;
  }>({
    inFlight: false,
    failureCount: 0,
    blockedUntil: 0,
    pending: false,
    timer: null,
  });

  const roleSet = useMemo(
    () => new Set(normalizeUserRoleTokens(currentUser)),
    [currentUser],
  );

  const activeNavItem = useMemo(() => {
    return (
      ADMIN_NAV_ITEMS.find(
        (item) =>
          location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
      ) || ADMIN_NAV_ITEMS[0]
    );
  }, [location.pathname]);

  const filteredNavItems = useMemo(() => {
    const query = String(searchQuery || "").trim().toLowerCase();
    if (!query) return ADMIN_NAV_ITEMS;

    return ADMIN_NAV_ITEMS.filter((item) => {
      return (
        item.label.toLowerCase().includes(query) ||
        item.hint.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const mainNavItems = filteredNavItems.filter((item) => item.group === "main");
  const managementNavItems = filteredNavItems.filter((item) => item.group === "management");

  const queueBackendHealthCheck = useCallback((immediate = false) => {
    const guard = backendHealthGuardRef.current;
    const now = Date.now();
    const waitByBackoff = Math.max(0, guard.blockedUntil - now);
    const waitMs = immediate ? waitByBackoff : Math.max(waitByBackoff, 0);

    if (guard.inFlight) {
      guard.pending = true;
      return;
    }

    if (guard.timer != null) {
      if (waitMs > 0) return;
      clearTimeout(guard.timer);
      guard.timer = null;
    }

    guard.timer = window.setTimeout(async () => {
      guard.timer = null;
      if (guard.inFlight) {
        guard.pending = true;
        return;
      }

      guard.inFlight = true;
      try {
        const health = await AdminAPI.getDatabaseHealth();
        if (!health || health.healthy !== true) {
          throw new Error("Backend health check failed.");
        }

        guard.failureCount = 0;
        guard.blockedUntil = 0;
        setBackendUnavailable(false);
        setBackendBackoffMs(0);
        setBackendLastCheckedAt(new Date().toISOString());
      } catch (_) {
        guard.failureCount += 1;
        const backoffMs = computeAdaptiveBackoffMs(guard.failureCount, {
          baseMs: ADMIN_BACKEND_HEALTH_GUARD.retryBaseMs,
          maxMs: ADMIN_BACKEND_HEALTH_GUARD.retryMaxMs,
          multiplier: ADMIN_BACKEND_HEALTH_GUARD.retryMultiplier,
          jitterMs: ADMIN_BACKEND_HEALTH_GUARD.retryJitterMs,
        });
        guard.blockedUntil = Date.now() + backoffMs;
        setBackendBackoffMs(backoffMs);
        if (guard.failureCount >= ADMIN_BACKEND_HEALTH_GUARD.failThreshold) {
          setBackendUnavailable(true);
        }
        guard.pending = true;
      } finally {
        guard.inFlight = false;
        if (guard.pending) {
          guard.pending = false;
          queueBackendHealthCheck(false);
        }
      }
    }, waitMs);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (currentUser && roleSet.has("admin")) return;

    if (!currentUser) {
      navigate("/", { replace: true });
      return;
    }

    if (roleSet.has("teacher") || roleSet.has("faculty")) {
      navigate("/teachers", { replace: true });
      return;
    }

    if (roleSet.has("student")) {
      navigate("/home", { replace: true });
      return;
    }

    if (roleSet.has("nt") || roleSet.has("staff") || roleSet.has("osas") || roleSet.has("treasury")) {
      navigate("/nt/dashboard", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  }, [authLoading, currentUser, navigate, roleSet]);

  useEffect(() => {
    if (authLoading || !currentUser || !roleSet.has("admin")) return;

    queueBackendHealthCheck(true);

    const interval = window.setInterval(() => {
      queueBackendHealthCheck(false);
    }, ADMIN_BACKEND_HEALTH_GUARD.intervalMs);

    const handleFocus = () => queueBackendHealthCheck(true);
    const handleVisibility = () => {
      if (!document.hidden) queueBackendHealthCheck(true);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (backendHealthGuardRef.current.timer != null) {
        clearTimeout(backendHealthGuardRef.current.timer);
        backendHealthGuardRef.current.timer = null;
      }
    };
  }, [authLoading, currentUser, queueBackendHealthCheck, roleSet]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (_) {
      navigate("/", { replace: true });
    }
  };

  const renderContent = () => {
    return (
      <Suspense fallback={<ModuleRouteSkeleton moduleId={activeNavItem.id} />}>
        <Routes>
          <Route path="overview" element={<AdminPortalOverview />} />
          <Route
            path="manage_user"
            element={
              <AdminModuleFrame
                title="Manage Users"
                description="Create, edit, and maintain portal user access from one control panel."
              >
                <ManageUsersView />
              </AdminModuleFrame>
            }
          />
          <Route
            path="feedback"
            element={
              <AdminModuleFrame
                title="Feedback Inbox"
                description="Track incoming user feedback and respond to issues quickly."
              >
                <FeedbackInboxView />
              </AdminModuleFrame>
            }
          />
          <Route
            path="account_access"
            element={
              <AdminModuleFrame
                title="Account Access"
                description="Review account details, update credentials, and control secure access."
              >
                <AccountAccessView />
              </AdminModuleFrame>
            }
          />
          <Route
            path="pending_approval"
            element={
              <AdminModuleFrame
                title="Pending Requests"
                description="Approve or reject incoming account-related requests."
              >
                <PendingApprovalsView />
              </AdminModuleFrame>
            }
          />
          <Route
            path="admin_accounts"
            element={
              <AdminModuleFrame
                title="Admin Accounts"
                description="Dedicated admin account creation and security visibility."
              >
                <AdminAccountsView />
              </AdminModuleFrame>
            }
          />
          <Route
            path="status_logs"
            element={
              <AdminModuleFrame
                title="Status Logs"
                description="Audit login events, account changes, and admin operations."
              >
                <StatusLogsView />
              </AdminModuleFrame>
            }
          />
          <Route
            path="day_off"
            element={
              <AdminModuleFrame
                title="Day Off"
                description="Manage leave/holiday/absent presence status for non-student users."
              >
                <DayOffView />
              </AdminModuleFrame>
            }
          />
          <Route
            path="server-maintenance"
            element={
              <AdminModuleFrame
                title="Server Actions"
                description="Run manual maintenance actions. Monitoring charts are available in Dashboard."
              >
                <SettingsView />
              </AdminModuleFrame>
            }
          />
          <Route path="settings" element={<Navigate to="/admin/dashboard/server-maintenance" replace />} />
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </Suspense>
    );
  };

  if (authLoading && !currentUser) {
    return (
      <AdminCanvas>
        <DashboardBootSurface>
          <PageSkeleton variant="dashboard" />
        </DashboardBootSurface>
      </AdminCanvas>
    );
  }

  if (!currentUser || !roleSet.has("admin")) {
    return null;
  }

  if (backendUnavailable) {
    return (
      <BackendFallbackScreen>
        <BackendFallbackCard>
          <WifiOff size={28} />
          <h1>404</h1>
          <h2>Backend Service Unavailable</h2>
          <p>
            Supabase backend is temporarily unreachable. The admin portal is paused while
            connection recovers.
          </p>
          <small>
            Last successful check: {backendLastCheckedAt ? new Date(backendLastCheckedAt).toLocaleString() : "none"}
          </small>
          <small>
            Retry guard: {backendBackoffMs > 0 ? `${Math.max(1, Math.round(backendBackoffMs / 1000))}s` : "active"}
          </small>
          <BackendRetryButton type="button" onClick={() => queueBackendHealthCheck(true)}>
            Retry Connection
          </BackendRetryButton>
        </BackendFallbackCard>
      </BackendFallbackScreen>
    );
  }

  return (
    <AdminCanvas>
      <AdminGrid>
        <Sidebar>
          <SidebarBrand type="button" onClick={() => navigate("/")}>
            <LogoMark src="/images/tcc-logo.png" alt="TCC logo" />
            <div>
              <h1>Admin Portal</h1>
              <p>TCC Local Portal</p>
            </div>
          </SidebarBrand>

          <BrandStatus>
            <LiveDot />
            Live control plane
          </BrandStatus>

          <SidebarNavArea>
            <SidebarGroup>
              <SidebarLabel>Main Menu</SidebarLabel>
              {mainNavItems.map((item) => {
                const active = activeNavItem.id === item.id;
                return (
                  <SidebarItem
                    key={item.id}
                    type="button"
                    $active={active}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon size={18} />
                    <ItemCopy>
                      <span>{item.label}</span>
                      <small>{item.hint}</small>
                    </ItemCopy>
                  </SidebarItem>
                );
              })}
            </SidebarGroup>

            <SidebarGroup>
              <SidebarLabel>Management</SidebarLabel>
              {managementNavItems.map((item) => {
                const active = activeNavItem.id === item.id;
                return (
                  <SidebarItem
                    key={item.id}
                    type="button"
                    $active={active}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon size={18} />
                    <ItemCopy>
                      <span>{item.label}</span>
                      <small>{item.hint}</small>
                    </ItemCopy>
                  </SidebarItem>
                );
              })}

              {filteredNavItems.length === 0 ? (
                <SidebarEmpty>No module matches “{searchQuery}”.</SidebarEmpty>
              ) : null}
            </SidebarGroup>
          </SidebarNavArea>

          <SidebarFooter>
            <UserCard>
              <img
                src={avatarUrl || "/images/tcc-logo.png"}
                alt="Admin"
                onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
                  event.currentTarget.src = "/images/tcc-logo.png";
                }}
              />
              <div>
                <strong>{currentUser?.full_name || currentUser?.username || "Administrator"}</strong>
                <span>@{currentUser?.username || "admin"}</span>
              </div>
            </UserCard>
            <LogoutButton type="button" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </LogoutButton>
          </SidebarFooter>
        </Sidebar>

        <MainPanel>
          <TopBar>
            <SearchWrap>
              <Search size={17} />
              <input
                type="search"
                placeholder="Find a module, tool, or report"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </SearchWrap>

            <ToolbarActions>
              <ToolbarPill>
                <Clock3 size={15} />
                <span>
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </ToolbarPill>
              <ToolbarPill>
                <CalendarDays size={15} />
                <span>
                  {new Date().toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </ToolbarPill>
              <ToolbarPill>
                <span>{ADMIN_NAV_ITEMS.length} Modules</span>
              </ToolbarPill>
            </ToolbarActions>
          </TopBar>

          <SectionMeta>
            <p>Admin Monitoring Portal</p>
            <h2>{activeNavItem.label}</h2>
            <span>{activeNavItem.hint}</span>
          </SectionMeta>

          <OutletArea>{renderContent()}</OutletArea>
        </MainPanel>
      </AdminGrid>
    </AdminCanvas>
  );
};

const auroraSweep = keyframes`
  0% {
    transform: translate3d(-8%, -4%, 0) scale(1);
  }
  50% {
    transform: translate3d(4%, 4%, 0) scale(1.05);
  }
  100% {
    transform: translate3d(-8%, -4%, 0) scale(1);
  }
`;

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(64, 255, 182, 0.45);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(64, 255, 182, 0);
  }
`;

const rise = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const skeletonShimmer = keyframes`
  0% {
    background-position: 200% 50%;
  }
  100% {
    background-position: -200% 50%;
  }
`;

const AdminCanvas = styled.div`
  min-height: 100vh;
  color: #e9edff;
  background:
    radial-gradient(1300px 740px at 10% 0%, rgba(45, 137, 212, 0.24), transparent 65%),
    radial-gradient(940px 600px at 92% 9%, rgba(100, 68, 225, 0.22), transparent 68%),
    linear-gradient(150deg, #040913 0%, #060c1d 45%, #050812 100%);
  font-family: "Outfit", "Space Grotesk", "DM Sans", "Segoe UI", sans-serif;
  position: relative;
  isolation: isolate;

  &::before {
    content: "";
    position: fixed;
    inset: -30% -10% auto;
    height: 66vh;
    background:
      radial-gradient(circle at 20% 35%, rgba(132, 99, 255, 0.11), transparent 56%),
      radial-gradient(circle at 78% 22%, rgba(58, 162, 255, 0.13), transparent 54%);
    filter: blur(32px);
    pointer-events: none;
    z-index: -1;
    animation: ${auroraSweep} 18s ease-in-out infinite;
  }

  &::after {
    content: "";
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 32px 32px;
    opacity: 0.04;
    pointer-events: none;
    z-index: -1;
  }
`;

const AdminGrid = styled.div`
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  min-height: 100vh;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  height: 100vh;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  padding: 24px 18px;
  padding-bottom: 14px;
  border-right: 1px solid rgba(178, 189, 255, 0.16);
  background: linear-gradient(180deg, rgba(6, 12, 29, 0.94), rgba(7, 10, 22, 0.98));
  backdrop-filter: blur(14px);
  overflow: hidden;

  @media (max-width: 1080px) {
    position: static;
    height: auto;
    overflow: visible;
    border-right: none;
    border-bottom: 1px solid rgba(178, 189, 255, 0.18);
  }
`;

const SidebarBrand = styled.button`
  border: none;
  background: transparent;
  padding: 0;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  h1 {
    margin: 0;
    font-size: 1.12rem;
    color: #f7f8ff;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  p {
    margin: 2px 0 0;
    color: rgba(218, 223, 255, 0.7);
    font-size: 0.78rem;
  }
`;

const LogoMark = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 12px 26px rgba(76, 74, 220, 0.4);
`;

const BrandStatus = styled.div`
  margin-bottom: 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(203, 245, 229, 0.9);
  font-size: 0.77rem;
  border: 1px solid rgba(78, 247, 186, 0.28);
  background: rgba(44, 134, 102, 0.14);
  border-radius: 999px;
  padding: 6px 12px;
  width: fit-content;
`;

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #40ffb6;
  animation: ${pulse} 1.8s infinite;
`;

const SidebarNavArea = styled.div`
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  margin-right: -4px;
  padding-right: 4px;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(135, 152, 219, 0.42);
  }

  @media (max-width: 1080px) {
    overflow: visible;
    margin-right: 0;
    padding-right: 0;
  }
`;

const SidebarGroup = styled.div`
  margin-bottom: 20px;
`;

const SidebarLabel = styled.p`
  margin: 0 0 8px;
  color: rgba(211, 218, 255, 0.58);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-weight: 600;
`;

const SidebarItem = styled.button<{ $active: boolean }>`
  width: 100%;
  border: 1px solid ${(props) => (props.$active ? "rgba(145, 134, 255, 0.76)" : "transparent")};
  background: ${(props) =>
    props.$active
      ? "linear-gradient(140deg, rgba(76, 64, 145, 0.52), rgba(40, 49, 96, 0.55))"
      : "rgba(9, 14, 34, 0.35)"};
  color: ${(props) => (props.$active ? "#ffffff" : "rgba(220, 227, 255, 0.88)")};
  padding: 10px 11px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 7px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  text-align: left;

  &:hover {
    transform: translateX(2px);
    border-color: rgba(145, 134, 255, 0.72);
    background: linear-gradient(140deg, rgba(56, 64, 120, 0.54), rgba(28, 37, 82, 0.62));
  }
`;

const ItemCopy = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;

  span {
    font-size: 0.87rem;
    font-weight: 600;
    color: inherit;
    line-height: 1.2;
  }

  small {
    color: rgba(203, 212, 255, 0.68);
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const SidebarEmpty = styled.div`
  margin-top: 4px;
  border-radius: 12px;
  border: 1px dashed rgba(171, 184, 255, 0.25);
  padding: 11px 12px;
  color: rgba(207, 214, 255, 0.72);
  font-size: 0.77rem;
`;

const SidebarFooter = styled.div`
  margin-top: 12px;
  padding-top: 14px;
  border-top: 1px solid rgba(155, 170, 255, 0.16);
`;

const UserCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid rgba(145, 134, 255, 0.72);
  }

  strong {
    display: block;
    color: #f5f8ff;
    font-size: 0.85rem;
    line-height: 1.2;
  }

  span {
    color: rgba(212, 220, 255, 0.7);
    font-size: 0.75rem;
    line-height: 1.2;
  }
`;

const LogoutButton = styled.button`
  width: 100%;
  border: 1px solid rgba(255, 125, 161, 0.36);
  background: rgba(255, 88, 136, 0.12);
  color: #ffd3df;
  border-radius: 12px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;

  &:hover {
    border-color: rgba(255, 125, 161, 0.62);
  }
`;

const MainPanel = styled.main`
  min-width: 0;
  padding: 24px;
  animation: ${rise} 0.4s ease;

  @media (max-width: 720px) {
    padding: 16px;
  }
`;

const DashboardBootSurface = styled.div`
  width: min(1220px, calc(100vw - 28px));
  margin: 22px auto;
  border-radius: 18px;
  border: 1px solid rgba(151, 167, 255, 0.24);
  background: linear-gradient(155deg, rgba(8, 13, 30, 0.94), rgba(7, 12, 27, 0.96));
  box-shadow: 0 18px 42px rgba(1, 5, 14, 0.54);
  padding: 14px;
`;

const ModuleLoadingSurface = styled.div`
  border-radius: 16px;
  border: 1px solid rgba(153, 170, 255, 0.24);
  background: linear-gradient(155deg, rgba(9, 16, 37, 0.9), rgba(8, 12, 28, 0.9));
  box-shadow: 0 14px 32px rgba(2, 6, 18, 0.48);
  padding: 12px;
`;

const ModuleLoadingHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-bottom: 10px;
  padding: 2px 2px 6px;
`;

const ModuleLoadingLine = styled.div<{ $short?: boolean }>`
  height: ${(props) => (props.$short ? "10px" : "14px")};
  width: ${(props) => (props.$short ? "42%" : "58%")};
  border-radius: 999px;
  background: linear-gradient(
    110deg,
    rgba(67, 95, 164, 0.58) 0%,
    rgba(150, 174, 255, 0.8) 50%,
    rgba(67, 95, 164, 0.58) 100%
  );
  background-size: 220% 100%;
  animation: ${skeletonShimmer} 1.2s linear infinite;
`;

const TopBar = styled.div`
  display: flex;
  gap: 14px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;

  @media (max-width: 980px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchWrap = styled.label`
  width: min(560px, 100%);
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 14px;
  border: 1px solid rgba(158, 170, 255, 0.24);
  background: linear-gradient(120deg, rgba(11, 18, 42, 0.78), rgba(9, 15, 35, 0.66));
  padding: 12px 14px;

  svg {
    color: rgba(212, 221, 255, 0.68);
    flex-shrink: 0;
  }

  input {
    border: none !important;
    background: transparent !important;
    padding: 0;
    color: #f4f7ff !important;
    box-shadow: none !important;
    font-size: 0.92rem;
  }
`;

const ToolbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 980px) {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
`;

const ToolbarPill = styled.div`
  border-radius: 12px;
  border: 1px solid rgba(158, 170, 255, 0.24);
  background: rgba(11, 18, 42, 0.64);
  color: rgba(231, 236, 255, 0.9);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  font-size: 0.82rem;
`;

const SectionMeta = styled.div`
  margin-bottom: 16px;

  p {
    margin: 0;
    color: rgba(152, 220, 255, 0.88);
    font-size: 0.78rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    font-weight: 640;
  }

  h2 {
    margin: 4px 0 0;
    color: #f2f5ff;
    font-size: clamp(1.4rem, 3.3vw, 1.9rem);
    font-weight: 720;
  }

  span {
    margin-top: 4px;
    display: block;
    color: rgba(212, 221, 255, 0.72);
    font-size: 0.9rem;
  }
`;

const OutletArea = styled.div`
  min-width: 0;
`;

const ModuleSurface = styled.section`
  --bg-primary: rgba(6, 11, 28, 0.82);
  --bg-secondary: rgba(10, 16, 38, 0.9);
  --bg-tertiary: rgba(18, 28, 58, 0.84);
  --text-primary: #edf3ff;
  --text-secondary: rgba(206, 218, 255, 0.78);
  --border-color: rgba(132, 151, 222, 0.34);
  --accent-primary: #4ea9ff;
  --accent-highlight: #67b8ff;
  border-radius: 22px;
  border: 1px solid rgba(164, 178, 255, 0.2);
  background: linear-gradient(160deg, rgba(8, 14, 34, 0.9), rgba(11, 14, 30, 0.76));
  box-shadow: 0 22px 44px rgba(3, 4, 10, 0.46);
  padding: 18px;

  @media (max-width: 720px) {
    padding: 12px;
  }
`;

const ModuleHeader = styled.header`
  margin-bottom: 14px;

  h2 {
    margin: 0;
    color: #f5f7ff;
    font-size: 1.08rem;
    font-weight: 650;
  }

  p {
    margin: 6px 0 0;
    color: rgba(211, 219, 255, 0.72);
    font-size: 0.84rem;
  }
`;

const ModuleBody = styled.div`
  min-width: 0;
`;

const BackendFallbackScreen = styled.div`
  min-height: 100vh;
  background: #ffffff;
  display: grid;
  place-items: center;
  padding: 24px;
`;

const BackendFallbackCard = styled.div`
  width: min(520px, 100%);
  border-radius: 16px;
  border: 1px solid #d6dcef;
  background: #ffffff;
  box-shadow: 0 16px 30px rgba(31, 43, 70, 0.16);
  padding: 24px 22px;
  text-align: center;
  color: #1d2b46;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 9px;

  h1 {
    margin: 0;
    font-size: 2.8rem;
    line-height: 1;
    color: #1f3f86;
  }

  h2 {
    margin: 0;
    font-size: 1.18rem;
    color: #24385f;
  }

  p {
    margin: 0;
    color: #46608f;
    font-size: 0.92rem;
    line-height: 1.45;
  }

  small {
    color: #5e739e;
    font-size: 0.78rem;
  }

  svg {
    color: #3b62bb;
  }
`;

const BackendRetryButton = styled.button`
  margin-top: 8px;
  border: 1px solid #4a74d9;
  border-radius: 10px;
  background: linear-gradient(135deg, #4a74d9, #5a61df);
  color: #ffffff;
  padding: 10px 14px;
  font-size: 0.84rem;
  font-weight: 650;
  cursor: pointer;

  &:hover {
    filter: brightness(1.03);
  }
`;

export default AdminDashboard;
