import React, { lazy, Suspense, useEffect } from "react";
import { useNavigate, Routes, Route, Navigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  UserCog,
  Settings,
  LogOut,
  MessageSquare,
} from "lucide-react";
import CampfireLoader from "../components/loaders/CampfireLoader";
import PageSkeleton from "../components/loaders/PageSkeleton";
import ClockCard from "../components/common/ClockCard";
import ThemeToggle from "../components/common/ThemeToggle";
import UnifiedRoleSwitcher from "../components/common/UnifiedRoleSwitcher";

const DashboardOverview = lazy(() => import("../components/views/admin/DashboardOverview"));
const ManageUsersView = lazy(() => import("../components/views/admin/ManageUsersView"));
const SettingsView = lazy(() => import("../components/views/admin/SettingsView"));
const FeedbackInboxView = lazy(() => import("../components/views/admin/FeedbackInboxView"));

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading, avatarUrl, logout } = useAuth();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const currentSection = pathParts[pathParts.length - 1] === 'dashboard' ? 'overview' : pathParts[pathParts.length - 1];

  useEffect(() => {
    const roles = Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : currentUser?.role ? [currentUser.role] : [];
    if (!authLoading && (!currentUser || !roles.includes("admin"))) {
      if (roles.includes('teacher')) navigate('/teachers');
      else if (roles.includes('student')) navigate('/home');
      else if (roles.includes('nt')) navigate('/nt/dashboard');
      else navigate("/");
    }
  }, [authLoading, currentUser, navigate]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logout();
      navigate("/");
    } catch (_) {
      navigate("/");
    }
  };

  const navItems = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "feedback", icon: MessageSquare, label: "Feedback" },
    { id: "settings", icon: Settings, label: "Settings" },
    { id: "manage_user", icon: UserCog, label: "Manage Users" },
  ];

  const heroSpotlights = {
    overview: {
      title: "Dashboard Overview",
      copy: "Get a quick snapshot of the system's status, including total users, buildings, and active subjects.",
    },
    sanctions: {
      title: "Sanction Management",
      copy: "Monitor and manage student disciplinary actions.",
    },
    payments: {
      title: "Financial Tracking",
      copy: "Monitor student payment statuses and financial balances.",
    },
    manage_user: {
      title: "User Roles",
      copy: "Manage user permissions, assign roles, and control access across the platform.",
    },
    feedback: {
      title: "Feedback Inbox",
      copy: "Review and respond to anonymous feedback from students.",
    },
    settings: {
      title: "System Settings",
      copy: "Perform maintenance tasks, clean up database records, and manage system configurations.",
    },
  };

  const renderContent = () => {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="overview" element={<DashboardOverview />} />
          <Route path="manage_user" element={<ManageUsersView />} />
          <Route path="feedback" element={<FeedbackInboxView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="/" element={<Navigate to="overview" replace />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </Suspense>
    );
  };

  if (authLoading && !currentUser) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "var(--bg-primary)",
        }}
      >
        <CampfireLoader />
      </div>
    );
  }

  const currentRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length
    ? currentUser.roles
    : currentUser?.role ? [currentUser.role] : [];
  if (!currentUser || !currentRoles.includes("admin")) return null;

  return (
    <DashboardContainer>
      <Sidebar>
        <SidebarHeader>
          <Avatar
            src={avatarUrl}
            onError={(e) => {
              e.target.src = "/images/sample.jpg";
            }}
            alt="Admin"
          />
          <UserInfo>
            <UserName>{currentUser?.full_name}</UserName>
            {currentUser?.school_id && (
              <SchoolId>{currentUser.school_id}</SchoolId>
            )}
            <UserRole>Administrator</UserRole>
          </UserInfo>
        </SidebarHeader>

        <div style={{ padding: '0 0.75rem' }}>
          <UnifiedRoleSwitcher label="Admin Controls" />
        </div>

        <Nav>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              $active={currentSection === item.id}
              onClick={() => navigate(`/admin/dashboard/${item.id}`)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavItem>
          ))}
        </Nav>

        <SidebarFooter>
          <LogoutButton onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </LogoutButton>
        </SidebarFooter>
      </Sidebar>

      <MainContent>
        <HeroSection>
          <HeroContent>
            <HeroEyebrow>Administrative Portal</HeroEyebrow>
            <HeroTitle>
              Welcome back, {currentUser?.full_name}.
            </HeroTitle>
            <HeroDescription>
              Stay in control of campus activity with quick insights.
              {heroSpotlights[currentSection]?.copy}
            </HeroDescription>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <ThemeToggle />
                 <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Toggle Theme</span>
            </div>
          </HeroContent>
          <HeroSpotlight>
            <SpotlightCard>
              <SpotlightLabel>Current Focus</SpotlightLabel>
              <SpotlightTitle>
                {heroSpotlights[currentSection]?.title || "Overview"}
              </SpotlightTitle>
              <SpotlightText>Manage operations efficiently.</SpotlightText>
            </SpotlightCard>
            <ClockCard />
          </HeroSpotlight>
        </HeroSection>

        <ContentArea>{renderContent()}</ContentArea>
      </MainContent>
    </DashboardContainer>
  );
};

const DashboardContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: all 0.3s ease;
`;

const Sidebar = styled.aside`
  width: 240px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 50;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
`;

const SidebarHeader = styled.div`
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
`;

const Avatar = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 0.75rem;
  border: 2px solid var(--accent-primary);
  box-shadow: var(--shadow-md);
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const UserName = styled.h3`
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`;

const SchoolId = styled.span`
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-family: monospace;
`;

const UserRole = styled.span`
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
`;

const Nav = styled.nav`
  flex: 1;
  padding: 1rem 0.75rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
  }
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: ${(props) =>
    props.$active ? "var(--bg-tertiary)" : "transparent"};
  color: ${(props) =>
    props.$active ? "var(--accent-primary)" : "var(--text-secondary)"};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: ${(props) => (props.$active ? "600" : "500")};
  text-align: left;
  transition: all 0.2s ease;
  border-left: 3px solid
    ${(props) => (props.$active ? "var(--accent-primary)" : "transparent")};

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-highlight);
    transform: translateX(2px);
  }
`;

const SidebarFooter = styled.div`
  padding: 1rem 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 8px;
  transition: color 0.2s;

  &:hover {
    color: #ef4444;
  }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 240px;
  padding: 2rem;
  background-color: var(--bg-primary);
  min-height: 100vh;
  transition: all 0.3s ease;
`;

const HeroSection = styled.section`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
  animation: fadeIn 0.5s ease-out;

  @media (max-width: 1100px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
  }
`;

const HeroContent = styled.div`
  max-width: 600px;
`;

const HeroEyebrow = styled.span`
  color: var(--accent-primary);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 1px;
  margin-bottom: 0.5rem;
  display: block;
`;

const HeroTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.2;
`;

const HeroDescription = styled.p`
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
  margin: 0;
`;

const HeroSpotlight = styled.div`
  display: flex;
  gap: 1.5rem;
`;

const SpotlightCard = styled.div`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  border-radius: 16px;
  min-width: 260px;
  box-shadow: var(--shadow-md);
`;

const SpotlightLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 8px;
`;

const SpotlightTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
`;

const SpotlightText = styled.p`
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
`;

const ContentArea = styled.div`
  animation: slideUp 0.4s ease-out;
`;

export default AdminDashboard;
