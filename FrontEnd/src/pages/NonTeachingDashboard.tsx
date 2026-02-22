import React, { lazy, Suspense, useEffect } from "react";
import { useNavigate, Routes, Route, Navigate, useLocation } from "react-router-dom";
import baseStyled from "styled-components";
import { useAuth } from "../context/AuthContext";
import {
  Building2,
  Layers,
  BookOpen,
  ClipboardList,
  CalendarCheck,
  Megaphone,
  FolderKanban,
  AlertTriangle,
  ReceiptText,
  Settings,
  LogOut,
  ShieldAlert,
  CreditCard,
  UserCheck,
  Users,
} from "lucide-react";
import Loader from "../components/Loader";
import ClockCard from "../components/common/ClockCard";
import RoleSidebarNavigator from "../components/common/RoleSidebarNavigator";
import { GLOBAL_ROLE_SIDEBAR_MENUS } from "../components/common/roleSidebarMenus";
import PageSkeleton from "../components/loaders/PageSkeleton";
import ChatBot from "../components/ChatBot";

const FacilitiesView = lazy(() => import("../components/views/admin/FacilitiesView"));
const SectionsView = lazy(() => import("../components/views/admin/SectionsView"));
const SubjectsView = lazy(() => import("../components/views/admin/SubjectsView"));
const StudyLoadView = lazy(() => import("../components/views/admin/StudyLoadView"));
const TeacherManagementView = lazy(() => import("../components/views/admin/TeacherManagementView"));
const IrregularStudyLoadView = lazy(() => import("../components/views/admin/IrregularStudyLoadView"));
const ManageStudentsView = lazy(() => import("../components/views/admin/ManageStudentsView"));
const StaffSanctionsView = lazy(() => import("../components/views/staff/SanctionsView"));
const StaffPaymentsView = lazy(() => import("../components/views/staff/PaymentsView"));
const StaffWarningsView = lazy(() => import("../components/views/staff/WarningsView"));
const StaffDisciplineRecordsView = lazy(() => import("../components/views/staff/DisciplineRecordsView"));
const StaffTreasuryPaymentView = lazy(() => import("../components/views/staff/TreasuryPaymentView"));
const StaffPaymentRecordsView = lazy(() => import("../components/views/staff/PaymentRecordsView"));
const AnnouncementsView = lazy(() => import("../components/views/admin/AnnouncementsView"));
const ProjectsView = lazy(() => import("../components/views/admin/ProjectsView"));
const SettingsView = lazy(() => import("../components/views/teacher/SettingsView"));
const styled = baseStyled as any;

const NonTeachingDashboard = () => {
  const navigate = useNavigate();
  const {
    user: currentUser,
    loading: authLoading,
    avatarUrl,
    logout,
    activeRole,
    activeSubRole,
  } = useAuth();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
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
  const normalizedRoles =
    Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles.map((role) => String(role || "").toLowerCase().trim())
      : currentUser?.role
        ? [String(currentUser.role).toLowerCase().trim()]
        : [];
  const hasNtRole = normalizedRoles.includes("nt") || normalizedSubRoles.includes("nt");
  const hasOsasRole = normalizedSubRoles.includes("osas");
  const hasTreasuryRole = normalizedSubRoles.includes("treasury");

  const preferredSubRole = String(activeSubRole || "")
    .trim()
    .toLowerCase();
  const staffContext = (() => {
    if (preferredSubRole === "osas" && hasOsasRole) return "osas";
    if (preferredSubRole === "treasury" && hasTreasuryRole) return "treasury";
    if (preferredSubRole === "nt" && hasNtRole) return "nt";
    if (hasNtRole) return "nt";
    if (hasOsasRole) return "osas";
    if (hasTreasuryRole) return "treasury";
    return "nt";
  })();

  const isOsasMode = staffContext === "osas";
  const isTreasuryMode = staffContext === "treasury";

  useEffect(() => {
    const roles = Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : currentUser?.role ? [currentUser.role] : [];

    const roleSet = new Set(roles.map((role) => String(role || "").toLowerCase().trim()));
    const subRoles = gatherSubRoles(currentUser);
    const hasStaffAccess =
      roleSet.has("admin") ||
      roleSet.has("nt") ||
      subRoles.some((role) => ["nt", "osas", "treasury"].includes(role));

    if (!authLoading && (!currentUser || !hasStaffAccess)) {
      if (roleSet.has("admin")) navigate("/admin/dashboard");
      else if (roleSet.has("teacher")) navigate("/teachers");
      else if (roleSet.has("student")) navigate("/home");
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

  const ntNavItems = [
    { id: "study_load", icon: ClipboardList, label: "Study Load" },
    { id: "irregular_study_load", icon: UserCheck, label: "Irregular Study Load" },
    { id: "manage_students", icon: Users, label: "Manage Students" },
    { id: "teacher_scheduling", icon: CalendarCheck, label: "Teacher Scheduling" },
    { id: "subjects", icon: BookOpen, label: "Subjects" },
    { id: "sections", icon: Layers, label: "Sections" },
    { id: "buildings", icon: Building2, label: "Buildings" },
  ];

  const osasNavItems = [
    { id: "announcements", icon: Megaphone, label: "Announcement" },
    { id: "projects", icon: FolderKanban, label: "Project" },
    { id: "warning", icon: AlertTriangle, label: "Warning" },
    { id: "sanction", icon: ShieldAlert, label: "Sanction" },
    { id: "record", icon: BookOpen, label: "Record" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const treasuryNavItems = [
    { id: "announcements", icon: Megaphone, label: "Announcement" },
    { id: "projects", icon: FolderKanban, label: "Project" },
    { id: "payment", icon: CreditCard, label: "Payment" },
    { id: "record", icon: ReceiptText, label: "Record" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const navItems = isOsasMode ? osasNavItems : isTreasuryMode ? treasuryNavItems : ntNavItems;
  const defaultSection = navItems.length > 0 ? navItems[0].id : "study_load";
  const allowedSections = navItems.map((item) => item.id);
  const currentSection =
    lastPart === "dashboard" || !allowedSections.includes(lastPart)
      ? defaultSection
      : lastPart;

  const sidebarRoleLabel = isOsasMode
    ? "OSAS"
    : isTreasuryMode
      ? "TREASURY"
      : activeRole === "faculty"
        ? "FACULTY STAFF"
        : "STAFF";

  const heroSpotlights = {
    study_load: {
      title: "Study Load",
      copy: "Assign subject loads to sections based on course and year level requirements.",
    },
    manage_students: {
      title: "Manage Students",
      copy: "Assign and update section, year, department, major, and gender.",
    },
    irregular_study_load: {
      title: "Irregular Study Load",
      copy: "Arrange custom subject study loads for irregular students.",
    },
    teacher_scheduling: {
      title: "Teacher Scheduling",
      copy: "Assign teachers to subjects, sections, buildings, rooms, and schedule times.",
    },
    subjects: {
      title: "Subject Catalog",
      copy: "Maintain the comprehensive list of academic subjects, units, and curriculum details.",
    },
    sections: {
      title: "Section Management",
      copy: "Organize student sections by year level and manage academic groupings.",
    },
    buildings: {
      title: "Buildings & Facilities",
      copy: "Manage campus infrastructure, track room usage, and organize section allocations.",
    },
    announcements: {
      title: "Announcements",
      copy: "Create and publish announcements for students and staff audiences.",
    },
    projects: {
      title: "Projects",
      copy: "Track ongoing projects, budgets, and progress updates.",
    },
    warning: {
      title: "Warning",
      copy: "Issue student warnings with required descriptions and offense level.",
    },
    sanction: {
      title: "Sanction",
      copy: "Manage sanctions and disciplinary status of students.",
    },
    payment: {
      title: "Payment",
      copy: "Assign general lacking payments by department, year, and section.",
    },
    record: {
      title: "Record",
      copy: "Review per-student warning/sanction and payment history records.",
    },
    settings: {
      title: "Settings",
      copy: "Manage your profile details and account preferences.",
    },
  };

  const renderContent = () => {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {!isOsasMode && !isTreasuryMode && (
            <>
              <Route
                path="manage_students"
                element={
                  <ManageStudentsView
                    mode="nt"
                    onOpenIrregularStudyLoad={() => navigate("/nt/dashboard/irregular_study_load")}
                  />
                }
              />
              <Route path="study_load" element={<StudyLoadView />} />
              <Route path="irregular_study_load" element={<IrregularStudyLoadView />} />
              <Route path="teacher_scheduling" element={<TeacherManagementView />} />
              <Route path="subjects" element={<SubjectsView />} />
              <Route path="sections" element={<SectionsView />} />
              <Route path="buildings" element={<FacilitiesView />} />
              <Route path="sanctions" element={<StaffSanctionsView />} />
              <Route path="payments" element={<StaffPaymentsView />} />
            </>
          )}

          {isOsasMode && (
            <>
              <Route path="announcements" element={<AnnouncementsView />} />
              <Route path="projects" element={<ProjectsView />} />
              <Route path="warning" element={<StaffWarningsView />} />
              <Route path="sanction" element={<StaffSanctionsView />} />
              <Route path="record" element={<StaffDisciplineRecordsView />} />
              <Route path="settings" element={<SettingsView currentUser={currentUser} />} />
              <Route path="sanctions" element={<Navigate to="/nt/dashboard/sanction" replace />} />
              <Route path="payments" element={<Navigate to="/nt/dashboard/record" replace />} />
            </>
          )}

          {isTreasuryMode && (
            <>
              <Route path="announcements" element={<AnnouncementsView />} />
              <Route path="projects" element={<ProjectsView />} />
              <Route path="payment" element={<StaffTreasuryPaymentView />} />
              <Route path="record" element={<StaffPaymentRecordsView />} />
              <Route path="settings" element={<SettingsView currentUser={currentUser} />} />
              <Route path="payments" element={<Navigate to="/nt/dashboard/payment" replace />} />
              <Route path="sanctions" element={<Navigate to="/nt/dashboard/record" replace />} />
            </>
          )}

          <Route index element={<Navigate to={defaultSection} replace />} />
          <Route
            path="*"
            element={<Navigate to={`/nt/dashboard/${defaultSection}`} replace />}
          />
        </Routes>
      </Suspense>
    );
  };

  if (authLoading && !currentUser) {
    return <Loader fullScreen />;
  }

  const currentRoles = (
    Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : currentUser?.role
        ? [currentUser.role]
        : []
  ).map((role) => String(role || "").toLowerCase().trim());

  const currentSubRoles = (
    Array.isArray(currentUser?.sub_roles)
      ? currentUser.sub_roles
      : [currentUser?.sub_role].filter(Boolean)
  ).map((role) => String(role || "").toLowerCase().trim());
  const hasStaffAccess =
    currentRoles.includes("admin") ||
    currentRoles.includes("nt") ||
    currentSubRoles.some((role) => ["nt", "osas", "treasury"].includes(role));

  if (!currentUser || (!hasStaffAccess)) return null;

  return (
    <DashboardContainer>
      <Sidebar>
        <SidebarHeader>
          <Avatar
            src={avatarUrl}
            onError={(e) => {
              const image = e.currentTarget as HTMLImageElement;
              image.src = "/images/sample.jpg";
            }}
            alt="Non-Teaching"
          />
          <UserInfo>
            <UserName>{currentUser?.full_name}</UserName>
            {currentUser?.school_id && <SchoolId>{currentUser.school_id}</SchoolId>}
            <UserRole>{sidebarRoleLabel}</UserRole>
          </UserInfo>
        </SidebarHeader>

        <RoleSidebarNavigator menus={GLOBAL_ROLE_SIDEBAR_MENUS} />

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
            {isOsasMode
              ? "OSAS Portal"
              : isTreasuryMode
                ? "Treasury Portal"
                : "Non-Teaching Portal"}
          </HeroEyebrow>
            <HeroTitle>
              Welcome back, {currentUser?.full_name}.
            </HeroTitle>
            <HeroDescription>
              {heroSpotlights[currentSection]?.copy || "Manage campus operations."}
            </HeroDescription>
            <HeroActions>
              <ChatBot placement="hero" />
            </HeroActions>
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

export default NonTeachingDashboard;
