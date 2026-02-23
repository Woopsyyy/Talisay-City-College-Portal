import React, { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, Routes, Route, Navigate, useLocation } from "react-router-dom";
import baseStyled from "styled-components";
import { useAuth } from "../context/AuthContext";
import {
  FileText,
  Megaphone,
  Award,
  Shield,
  ClipboardCheck,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  CreditCard,
  UserCheck
} from "lucide-react";

import Loader from "../components/Loader";
import PageSkeleton from "../components/loaders/PageSkeleton";
import ClockCard from "../components/common/ClockCard";
import RoleSidebarNavigator from "../components/common/RoleSidebarNavigator";
import { GLOBAL_ROLE_SIDEBAR_MENUS } from "../components/common/roleSidebarMenus";
import ModernSidebar from "../components/common/ModernSidebar";
import ChatBot from "../components/ChatBot";
import NotificationBell from "../components/common/NotificationBell";

const RecordsView = lazy(() => import("../components/views/RecordsView"));
const AnnouncementsView = lazy(() => import("../components/views/student/AnnouncementsView"));
const GradesView = lazy(() => import("../components/views/student/GradesView"));
const TransparencyView = lazy(() => import("../components/views/student/TransparencyView"));
const EvaluationView = lazy(() => import("../components/views/student/EvaluationView"));
const SettingsView = lazy(() => import("../components/views/student/SettingsView"));
const FeedbackView = lazy(() => import("../components/views/student/FeedbackView"));
const ManageStudentsView = lazy(() => import("../components/views/admin/ManageStudentsView"));
const styled = baseStyled as any;

const Home = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading, avatarUrl, logout } = useAuth();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const currentSection = lastPart === 'home' ? 'records' : lastPart;

  const { activeRole, activeSubRole, switchSubRole } = useAuth();
  const effectiveSubRole = (activeSubRole || 'student').toLowerCase();
  const effectiveSubRoleLabel =
    effectiveSubRole === 'student' ? 'Student' : effectiveSubRole.toUpperCase();

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      navigate("/");
      return;
    }
    const roles = Array.isArray(currentUser.roles) && currentUser.roles.length
      ? currentUser.roles
      : [currentUser.role || 'student'];
    if (roles.includes('admin') && activeSubRole === 'student') {
        // Allow admin to stay on home if they want, but usually redirect
    }
  }, [authLoading, currentUser, navigate, activeSubRole]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logout();
      navigate("/");
    } catch (_) {
      navigate("/");
    }
  };

  const studentNavItems = [
    { id: "records", icon: FileText, label: "My Records" },
    { id: "announcements", icon: Megaphone, label: "Announcements" },
    { id: "grades", icon: Award, label: "Grades" },
    { id: "transparency", icon: Shield, label: "Transparency" },
    { id: "evaluation", icon: ClipboardCheck, label: "Evaluation" },
    { id: "feedback", icon: MessageSquare, label: "Feedback" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const osasNavItems = [
    { id: "manage_students", icon: ShieldAlert, label: "Sanctions" },
  ];

  const treasuryNavItems = [
    { id: "manage_students", icon: CreditCard, label: "Payments" },
  ];

  const getNavItems = () => {
    return [...studentNavItems];
  };


  const navItems = getNavItems();

  const heroSpotlights = {
    records: {
      title: "My Records",
      copy: "View your enrollment status, section assignment, and schedule.",
    },
    announcements: {
      title: "Campus Announcements",
      copy: "Stay updated with the latest news and events from the college.",
    },
    grades: {
      title: "Academic Grades",
      copy: "Monitor your performance and view your evaluation results.",
    },
    transparency: {
      title: "Transparency Board",
      copy: "Access public records and official college documents.",
    },
    evaluation: {
      title: "Faculty Evaluation",
      copy: "Provide feedback on your instructors and courses.",
    },
    feedback: {
      title: "Feedback System",
      copy: "Submit anonymous suggestions or concerns to the college administration.",
    },
    sanctions: {
        title: "Sanction Management",
        copy: "Record and monitor student disciplinary actions.",
    },
    payments: {
        title: "Payment Tracking",
        copy: "Manage and verify student payment balances.",
    },
    settings: {
      title: "Account Settings",
      copy: "Manage your profile information and personalization options.",
    },
  };

  const renderContent = () => {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="records" element={<RecordsView />} />
          <Route path="announcements" element={<AnnouncementsView />} />
          <Route path="grades" element={<GradesView currentUser={currentUser} />} />
          <Route path="transparency" element={<TransparencyView />} />
          <Route path="evaluation" element={<EvaluationView />} />
          <Route path="feedback" element={<FeedbackView />} />
          <Route path="manage_students" element={<ManageStudentsView mode="nt" />} />
          <Route path="sanctions" element={<ManageStudentsView mode="osas" />} />
          <Route path="payments" element={<ManageStudentsView mode="treasury" />} />
          <Route path="settings" element={<SettingsView currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to="records" replace />} />
          <Route path="*" element={<Navigate to="records" replace />} />
        </Routes>
      </Suspense>
    );
  };

  if (authLoading && !currentUser) {
    return <Loader fullScreen />;
  }

  if (!currentUser) {
    return <Loader fullScreen />;
  }

  const hasOsas = currentUser?.sub_role?.toLowerCase() === 'osas';
  const hasTreasury = currentUser?.sub_role?.toLowerCase() === 'treasury';

  return (
    <DashboardContainer>
      <ModernSidebar />

      <MainContent>
        <HeroSection>
          <HeroContent>
            <HeroEyebrow>
              {effectiveSubRole === 'student'
                ? 'Student Portal'
                : `${effectiveSubRole.toUpperCase()} Portal`}
            </HeroEyebrow>
            <HeroTitle>
              Hello, {currentUser?.full_name?.split(" ")[0] || "Student"}.
            </HeroTitle>
            <HeroDescription>
              {heroSpotlights[currentSection]?.copy || "Welcome to your portal."}
            </HeroDescription>
            <HeroActions>
              <NotificationBell />
              <ChatBot placement="hero" />
            </HeroActions>
          </HeroContent>
          <HeroSpotlight>
            <SpotlightCard>
              <SpotlightLabel>Current View</SpotlightLabel>
              <SpotlightTitle>
                {heroSpotlights[currentSection]?.title}
              </SpotlightTitle>
              <SpotlightText>Active Session</SpotlightText>
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
  z-index: 12000;
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
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
`;

const NavItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  background: ${(props) => props.$active ? "var(--bg-tertiary)" : "transparent"};
  color: ${(props) => props.$active ? "var(--accent-primary)" : "var(--text-secondary)"};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: ${(props) => (props.$active ? "600" : "500")};
  text-align: left;
  transition: all 0.2s ease;
  border-left: 3px solid ${(props) => (props.$active ? "var(--accent-primary)" : "transparent")};

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-highlight);
    transform: translateX(2px);
  }
`;

const SidebarFooter = styled.div`
  margin-top: auto;
  padding: 1rem 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SubRoleButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  &:hover { border-color: var(--accent-primary); transform: translateY(-1px); }
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
  &:hover { color: #ef4444; }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: var(--sidebar-width, 280px);
  padding: 2rem;
  max-width: 100%;
  overflow-x: hidden;
  transition: margin-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  @media (max-width: 1024px) {
    margin-left: 0;
    padding: 1rem;
  }
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

const HeroActions = styled.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 10px;
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

export default Home;
