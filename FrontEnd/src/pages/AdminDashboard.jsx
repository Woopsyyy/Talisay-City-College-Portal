import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { AuthAPI, getAvatarUrl } from "../services/api";
import {
  LayoutDashboard,
  Megaphone,
  Building2,
  FolderKanban,
  Users,
  UserCog,
  GraduationCap,
  ClipboardCheck,
  Layers,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import AnnouncementsView from "../components/views/admin/AnnouncementsView";
import TeacherManagementView from "../components/views/admin/TeacherManagementView";
import DashboardOverview from "../components/views/admin/DashboardOverview";
import FacilitiesView from "../components/views/admin/FacilitiesView";
import ProjectsView from "../components/views/admin/ProjectsView";
import ManageStudentsView from "../components/views/admin/ManageStudentsView";
import ManageUsersView from "../components/views/admin/ManageUsersView";
import EvaluationView from "../components/views/admin/EvaluationView";
import SectionsView from "../components/views/admin/SectionsView";
import SubjectsView from "../components/views/admin/SubjectsView";
import StudyLoadView from "../components/views/admin/StudyLoadView";
import GradeSystemView from "../components/views/admin/GradeSystemView";
import SettingsView from "../components/views/admin/SettingsView";
import Loader from "../components/Loader";
import ClockCard from "../components/common/ClockCard";
import ThemeToggle from "../components/common/ThemeToggle";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentSection, setCurrentSection] = useState("overview");
  const [avatarUrl, setAvatarUrl] = useState("/images/sample.jpg");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await AuthAPI.checkSession();
        if (data.authenticated && data.user.role === "admin") {
          setCurrentUser(data.user);
          if (data.user.avatar_url) {
            setAvatarUrl(data.user.avatar_url);
          } else if (data.user.image_path) {
            const url = await getAvatarUrl(data.user.id, data.user.image_path);
            setAvatarUrl(url);
          }
        } else {
          navigate("/");
        }
      } catch (_) {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await AuthAPI.logout();
      navigate("/");
    } catch (_) {
      navigate("/");
    }
  };

  const navItems = [
    { id: "overview", icon: LayoutDashboard, label: "Overview" },
    { id: "announcements", icon: Megaphone, label: "Announcements" },
    { id: "buildings", icon: Building2, label: "Buildings" },
    { id: "projects", icon: FolderKanban, label: "Projects" },
    { id: "manage_students", icon: Users, label: "Manage Students" },
    { id: "manage_user", icon: UserCog, label: "Manage Users" },
    { id: "teacher_management", icon: GraduationCap, label: "Teachers" },
    { id: "evaluation", icon: ClipboardCheck, label: "Evaluation" },
    { id: "sections", icon: Layers, label: "Sections" },
    { id: "subjects", icon: BookOpen, label: "Subjects" },
    { id: "study_load", icon: BookOpen, label: "Study Load" },
    { id: "grade_system", icon: BarChart3, label: "Grade System" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const heroSpotlights = {
    overview: {
      title: "Dashboard Overview",
      copy: "Get a quick snapshot of the system's status, including total users, buildings, and active subjects.",
    },
    announcements: {
      title: "Announcements",
      copy: "Broadcast important updates and news to the entire campus community instantly.",
    },
    teacher_management: {
      title: "Teacher Management",
      copy: "Oversee faculty assignments, manage schedules, and ensure optimal subject coverage.",
    },
    buildings: {
      title: "Buildings & Facilities",
      copy: "Manage campus infrastructure, track room usage, and organize section allocations.",
    },
    projects: {
      title: "Campus Projects",
      copy: "Monitor ongoing development projects, track budgets, and oversee completion statuses.",
    },
    manage_students: {
      title: "Manage Students",
      copy: "Handle student enrollments, section assignments, and monitor financial statuses.",
    },
    manage_user: {
      title: "User Roles",
      copy: "Manage user permissions, assign roles, and control access across the platform.",
    },
    evaluation: {
      title: "Evaluation System",
      copy: "Configure teacher evaluation settings and view performance leaderboards.",
    },
    sections: {
      title: "Section Management",
      copy: "Organize student sections by year level and manage academic groupings.",
    },
    subjects: {
      title: "Subject Catalog",
      copy: "Maintain the comprehensive list of academic subjects, units, and curriculum details.",
    },
    study_load: {
      title: "Study Load",
      copy: "Curate and assign subject loads to sections based on course and year level requirements.",
    },
    grade_system: {
      title: "Grade System",
      copy: "View student academic records, monitor performance, and manage grade data.",
    },
    settings: {
      title: "System Settings",
      copy: "Perform maintenance tasks, clean up database records, and manage system configurations.",
    },
  };

  const renderContent = () => {
    switch (currentSection) {
      case "overview":
        return <DashboardOverview />;
      case "announcements":
        return <AnnouncementsView />;
      case "teacher_management":
        return <TeacherManagementView />;
      case "buildings":
        return <FacilitiesView />;
      case "projects":
        return <ProjectsView />;
      case "manage_students":
        return <ManageStudentsView />;
      case "manage_user":
        return <ManageUsersView />;
      case "evaluation":
        return <EvaluationView />;
      case "sections":
        return <SectionsView />;
      case "subjects":
        return <SubjectsView />;
      case "study_load":
        return <StudyLoadView />;
      case "grade_system":
        return <GradeSystemView />;
      case "settings":
        return <SettingsView />;
      default:
        return null;
    }
  };

  if (loading) {
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
        <Loader />
      </div>
    );
  }

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
            <UserRole>
              {currentUser?.role
                ? currentUser.role.charAt(0).toUpperCase() +
                  currentUser.role.slice(1)
                : "Administrator"}
            </UserRole>
          </UserInfo>
        </SidebarHeader>

        <Nav>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              $active={currentSection === item.id}
              onClick={() => setCurrentSection(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavItem>
          ))}
        </Nav>

        <SidebarFooter>
          <SwitchViewLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/home");
            }}
          >
            <Users size={16} /> User View
          </SwitchViewLink>
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
  width: 280px;
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
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-bottom: 1px solid var(--border-color);
`;

const Avatar = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
  border: 3px solid var(--accent-primary);
  box-shadow: var(--shadow-md);
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const UserName = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`;

const SchoolId = styled.span`
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-family: monospace;
`;

const UserRole = styled.span`
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
`;

const Nav = styled.nav`
  flex: 1;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;

  /* Scrollbar styling */
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
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: ${(props) =>
    props.$active ? "var(--bg-tertiary)" : "transparent"};
  color: ${(props) =>
    props.$active ? "var(--accent-primary)" : "var(--text-secondary)"};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: ${(props) => (props.$active ? "600" : "500")};
  text-align: left;
  transition: all 0.2s ease;
  border-left: 3px solid
    ${(props) => (props.$active ? "var(--accent-primary)" : "transparent")};

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-highlight); /* Teal Hover */
    transform: translateX(4px);
  }
`;

const SidebarFooter = styled.div`
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SwitchViewLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  border: 1px solid var(--border-color);
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--accent-primary);
  }
`;

const LogoutButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
  margin-left: 280px;
  padding: 2rem 3rem;
  max-width: 100%;
  overflow-x: hidden;
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
