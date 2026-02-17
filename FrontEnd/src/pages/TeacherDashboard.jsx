import React, { lazy, Suspense, useEffect } from "react";
import { useNavigate, Routes, Route, Navigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext";
import {
  Megaphone,
  CalendarDays,
  LineChart,
  ClipboardList,
  Settings,
  LogOut,
  GraduationCap,
  MessageSquare,
  Crown,
  LayoutDashboard,
  Users,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import ClockCard from "../components/common/ClockCard";
import ThemeToggle from "../components/common/ThemeToggle";
import UnifiedRoleSwitcher from "../components/common/UnifiedRoleSwitcher";
import CampfireLoader from "../components/loaders/CampfireLoader";
import PageSkeleton from "../components/loaders/PageSkeleton";


const ScheduleView = lazy(() => import("../components/views/teacher/ScheduleView"));
const AnnouncementsView = lazy(() => import("../components/views/teacher/AnnouncementsView"));
const TransparencyView = lazy(() => import("../components/views/teacher/TransparencyView"));
const GradeSystemView = lazy(() => import("../components/views/teacher/GradeSystemView"));
const EvaluationView = lazy(() => import("../components/views/teacher/EvaluationView"));
const SettingsView = lazy(() => import("../components/views/teacher/SettingsView"));
const FeedbackInboxView = lazy(() => import("../components/views/admin/FeedbackInboxView"));
const ManageStudentsView = lazy(() => import("../components/views/admin/ManageStudentsView"));
const FacultySanctionsView = lazy(() => import("../components/views/faculty/SanctionsView"));
const FacultyPaymentsView = lazy(() => import("../components/views/faculty/PaymentsView"));

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading, avatarUrl, logout } = useAuth();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];

  const { activeRole } = useAuth();
  const gatherSubRoles = (user) => {
    if (!user) return [];
    const raw = [
      user.sub_role,
      ...(Array.isArray(user.sub_roles) ? user.sub_roles : []),
      user.sub_roles,
    ];
    const processed = raw.flatMap((item) => {
      if (!item) return [];
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          return Array.isArray(parsed) ? parsed : [item];
        } catch (_) {
          return [item];
        }
      }
      return [item];
    });
    return [...new Set(processed.map((role) => String(role || '').toLowerCase().trim()))].filter(Boolean);
  };

  const normalizedSubRoles = gatherSubRoles(currentUser);
  const isFacultyMode = activeRole === 'faculty';
  const hasDeanRole = normalizedSubRoles.includes('dean');
  const isDeanMode = isFacultyMode && hasDeanRole;

  useEffect(() => {
    const roles = Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : currentUser?.role ? [currentUser.role] : [];
    const hasTeacherRole = roles.includes('teacher');
    const hasDeanAccess = activeRole === 'faculty' && normalizedSubRoles.includes('dean');
    const hasStaffSubRole = normalizedSubRoles.includes('osas') || normalizedSubRoles.includes('treasury');

    if (!authLoading && (!currentUser || (!hasTeacherRole && !hasDeanAccess))) {
      if (currentUser) {
        if (roles.includes('admin')) navigate('/admin/dashboard');
        else if (hasStaffSubRole) navigate('/nt/dashboard');
        else if (roles.includes('nt')) navigate('/nt/dashboard');
        else navigate('/home');
      } else {
        navigate("/");
      }
    }
  }, [authLoading, currentUser, navigate, activeRole, normalizedSubRoles]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logout();
      navigate("/");
    } catch (_) {
      navigate("/");
    }
  };

  const teacherNavItems = [
    { id: "schedule", icon: CalendarDays, label: "Schedule" },
    { id: "announcements", icon: Megaphone, label: "Announcements" },
    { id: "transparency", icon: LineChart, label: "Transparency" },
    { id: "grade_system", icon: GraduationCap, label: "Grade System" },
    { id: "evaluation", icon: ClipboardList, label: "Evaluation" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const deanNavItems = [
    { id: "announcements", icon: Megaphone, label: "Manage Announcements" },
    { id: "transparency", icon: LayoutDashboard, label: "Manage Projects" },
    { id: "grade_system", icon: GraduationCap, label: "Grade Monitoring" },
    { id: "evaluation", icon: ClipboardList, label: "Evaluation Mgmt" },
    { id: "manage_students", icon: Users, label: "Manage Students" },
    { id: "feedback", icon: MessageSquare, label: "Feedback Replies" },
  ];

  const facultyNavItems = [
    ...(normalizedSubRoles.includes('dean') ? deanNavItems : []),
    ...(normalizedSubRoles.includes('osas') ? [{ id: "sanctions", icon: ShieldAlert, label: "Sanctions" }] : []),
    ...(normalizedSubRoles.includes('treasury') ? [{ id: "payments", icon: CreditCard, label: "Payments" }] : []),
  ];

  const dedupedFacultyNavItems = Array.from(
    new Map(facultyNavItems.map((item) => [item.id, item])).values()
  );

  const navItems = isFacultyMode && dedupedFacultyNavItems.length > 0
    ? dedupedFacultyNavItems
    : teacherNavItems;

  const defaultSection = navItems.length > 0 ? navItems[0].id : 'schedule';
  const currentSection = lastPart === 'teachers' ? defaultSection : lastPart;

  const heroSpotlights = {
    schedule: {
      title: "My Schedule",
      copy: "Check your weekly schedule, see which classes you teach, and manage your time effectively.",
    },
    announcements: {
      title: isDeanMode ? "Global Announcements" : "Announcements",
      copy: isDeanMode ? "Create and manage announcements for the whole department." : "Browse targeted updates and stay informed on school activities.",
    },
    transparency: {
      title: isDeanMode ? "Project Oversight" : "Transparency",
      copy: isDeanMode ? "Manage school project budgets, completion status, and milestones." : "Explore school project budgets and milestones through the transparency log.",
    },
    grade_system: {
      title: isDeanMode ? "Grade Monitoring" : "Grade System",
      copy: isDeanMode ? "View and filter student grades across the department (Read-only)." : "Manage student grades and maintain accurate records for your classes.",
    },
    evaluation: {
      title: isDeanMode ? "Evaluation Management" : "Evaluation Statistics",
      copy: isDeanMode ? "Enable/Disable evaluations, update templates, and view overall statistics." : "Review detailed evaluation statistics and student feedback.",
    },
    manage_students: {
        title: "Section Assignments",
        copy: "Assign students to sections and update their regular/irregular status.",
    },
    sanctions: {
        title: "Sanction Management",
        copy: "Monitor and manage student disciplinary actions.",
    },
    payments: {
        title: "Financial Tracking",
        copy: "Monitor student payment statuses and financial balances.",
    },
    feedback: {
      title: "Feedback Inbox",
      copy: "Review and respond to anonymous feedback from students.",
    },
    settings: {
      title: "Settings",
      copy: "Update your account details and profile picture.",
    },
  };

  const renderContent = () => {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="schedule" element={<ScheduleView />} />
          <Route path="announcements" element={<AnnouncementsView isAdmin={isDeanMode} />} />
          <Route path="transparency" element={<TransparencyView isAdmin={isDeanMode} />} />
          <Route path="grade_system" element={<GradeSystemView isReadOnly={isDeanMode} />} />
          <Route path="evaluation" element={<EvaluationView isAdmin={isDeanMode} />} />
          <Route path="manage_students" element={<ManageStudentsView mode="dean" />} />
          <Route path="sanctions" element={<FacultySanctionsView />} />
          <Route path="payments" element={<FacultyPaymentsView />} />
          <Route path="feedback" element={<FeedbackInboxView />} />
          <Route path="settings" element={<SettingsView currentUser={currentUser} />} />
          <Route path="/" element={<Navigate to={defaultSection} replace />} />
          <Route path="*" element={<Navigate to={defaultSection} replace />} />
        </Routes>
      </Suspense>
    );
  };

  if (authLoading && !currentUser) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg-primary)" }}>
        <CampfireLoader />
      </div>
    );
  }

  const currentRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length
    ? currentUser.roles
    : currentUser?.role ? [currentUser.role] : [];
  const hasTeacherRole = currentRoles.includes("teacher");
  const hasDeanAccess = activeRole === 'faculty' && normalizedSubRoles.includes('dean');
  if (!currentUser || (!hasTeacherRole && !hasDeanAccess)) return null;

  return (
    <DashboardContainer>
      <Sidebar>
        <SidebarHeader>
          <Avatar
            src={avatarUrl}
            onError={(e) => { e.target.src = "/images/sample.jpg"; }}
            alt="Teacher"
          />
          <UserInfo>
            <UserName>{currentUser?.full_name}</UserName>
            {currentUser?.school_id && <SchoolId>{currentUser.school_id}</SchoolId>}
            <UserRole>{isDeanMode ? "Dean" : (isFacultyMode ? "Faculty" : "Teacher")}</UserRole>
          </UserInfo>
        </SidebarHeader>

        <div style={{ padding: '0 0.75rem' }}>
          <UnifiedRoleSwitcher label="Faculty Context" />
        </div>

        <Nav>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              $active={currentSection === item.id}
              onClick={() => navigate(`/teachers/${item.id}`)}
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
            <HeroEyebrow>
              {isDeanMode ? "Dean Portal" : (isFacultyMode ? "Faculty Portal" : "Teacher Dashboard")}
            </HeroEyebrow>
            <HeroTitle>
              Hi, {currentUser?.full_name}!
            </HeroTitle>
            <HeroDescription>
              {heroSpotlights[currentSection]?.copy || "Welcome to your dashboard."}
            </HeroDescription>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                 <ThemeToggle />
                 <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Toggle Theme</span>
            </div>
          </HeroContent>
          <HeroSpotlight>
            <SpotlightCard>
              <SpotlightLabel>{currentSection.replace('_', ' ')}</SpotlightLabel>
              <SpotlightTitle>
                {heroSpotlights[currentSection]?.title}
              </SpotlightTitle>
              <SpotlightText>View Details</SpotlightText>
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

const ModeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  background: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
  &:hover { background: var(--accent-highlight); transform: translateY(-1px); }
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

export default TeacherDashboard;
