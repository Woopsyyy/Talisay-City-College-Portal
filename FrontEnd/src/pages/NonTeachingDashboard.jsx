import React, { useEffect } from "react";
import { useNavigate, Routes, Route, Navigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Layers,
  BookOpen,
  ClipboardList,
  LogOut,
  Users,
} from "lucide-react";
import DashboardOverview from "../components/views/admin/DashboardOverview";
import FacilitiesView from "../components/views/admin/FacilitiesView";
import SectionsView from "../components/views/admin/SectionsView";
import SubjectsView from "../components/views/admin/SubjectsView";
import StudyLoadView from "../components/views/admin/StudyLoadView";
import Loader from "../components/Loader";
import ClockCard from "../components/common/ClockCard";
import ThemeToggle from "../components/common/ThemeToggle";

const NonTeachingDashboard = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading, avatarUrl, logout } = useAuth();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const currentSection = pathParts[pathParts.length - 1] === 'dashboard' ? 'overview' : pathParts[pathParts.length - 1];

  useEffect(() => {
    const roles = Array.isArray(currentUser?.roles) && currentUser.roles.length
      ? currentUser.roles
      : currentUser?.role ? [currentUser.role] : [];
    if (!authLoading && (!currentUser || !roles.includes("nt"))) {
      if (roles.includes('admin')) navigate('/admin/dashboard');
      else if (roles.includes('teacher')) navigate('/teachers');
      else if (roles.includes('student')) navigate('/home');
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
    { id: "study_load", icon: ClipboardList, label: "Study Load" },
    { id: "subjects", icon: BookOpen, label: "Subjects" },
    { id: "sections", icon: Layers, label: "Sections" },
    { id: "buildings", icon: Building2, label: "Buildings" },
  ];

  const heroSpotlights = {
    overview: {
      title: "Dashboard Overview",
      copy: "Track academic operations for subjects, sections, and study loads.",
    },
    study_load: {
      title: "Study Load",
      copy: "Assign subject loads to sections based on course and year level requirements.",
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
  };

  const renderContent = () => {
    return (
      <Routes>
        <Route path="overview" element={<DashboardOverview />} />
        <Route path="study_load" element={<StudyLoadView />} />
        <Route path="subjects" element={<SubjectsView />} />
        <Route path="sections" element={<SectionsView />} />
        <Route path="buildings" element={<FacilitiesView />} />
        <Route path="/" element={<Navigate to="overview" replace />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
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
        <Loader />
      </div>
    );
  }

  const currentRoles = Array.isArray(currentUser?.roles) && currentUser.roles.length
    ? currentUser.roles
    : currentUser?.role ? [currentUser.role] : [];
  if (!currentUser || !currentRoles.includes("nt")) return null;

  return (
    <DashboardContainer>
      <Sidebar>
        <SidebarHeader>
          <Avatar
            src={avatarUrl}
            onError={(e) => {
              e.target.src = "/images/sample.jpg";
            }}
            alt="Non-Teaching"
          />
          <UserInfo>
            <UserName>{currentUser?.full_name}</UserName>
            {currentUser?.school_id && (
              <SchoolId>{currentUser.school_id}</SchoolId>
            )}
            <UserRole>Non-Teaching</UserRole>
          </UserInfo>
        </SidebarHeader>

        <Nav>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              $active={currentSection === item.id}
              onClick={() => navigate(`/nt/dashboard/${item.id}`)}
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
            <HeroEyebrow>Non-Teaching Portal</HeroEyebrow>
            <HeroTitle>
              Welcome back, {currentUser?.full_name}.
            </HeroTitle>
            <HeroDescription>
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
    color: var(--accent-highlight);
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

export default NonTeachingDashboard;
