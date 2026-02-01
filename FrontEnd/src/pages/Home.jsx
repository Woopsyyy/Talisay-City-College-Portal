import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { AuthAPI, getAvatarUrl } from "../services/api";
import {
  FileText,
  Megaphone,
  Award,
  Shield,
  ClipboardCheck,
  Settings,
  LogOut,
  User,
  LayoutDashboard
} from "lucide-react";


import RecordsView from "../components/views/RecordsView";
import AnnouncementsView from "../components/views/student/AnnouncementsView";
import GradesView from "../components/views/student/GradesView";
import TransparencyView from "../components/views/student/TransparencyView";
import EvaluationView from "../components/views/student/EvaluationView";
import SettingsView from "../components/views/student/SettingsView";

import Loader from "../components/Loader";
import ClockCard from "../components/common/ClockCard";
import ThemeToggle from "../components/common/ThemeToggle";

const Home = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentSection, setCurrentSection] = useState("records");
  const [avatarUrl, setAvatarUrl] = useState("/images/sample.jpg");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await AuthAPI.checkSession();
        if (data.authenticated) {
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
    { id: "records", icon: FileText, label: "My Records" },
    { id: "announcements", icon: Megaphone, label: "Announcements" },
    { id: "grades", icon: Award, label: "Grades" },
    { id: "transparency", icon: Shield, label: "Transparency" },
    { id: "evaluation", icon: ClipboardCheck, label: "Evaluation" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

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
    settings: {
      title: "Account Settings",
      copy: "Manage your profile, update password, and personalization.",
    },
  };

  const renderContent = () => {
    switch (currentSection) {
      case "records":
        return <RecordsView />;
      case "announcements":
        return <AnnouncementsView />;
      case "grades":
        return <GradesView />;
      case "transparency":
        return <TransparencyView />;
      case "evaluation":
        return <EvaluationView />;
      case "settings":
        return <SettingsView currentUser={currentUser} />;
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
            alt="User"
          />
          <UserInfo>
            <UserName>{currentUser?.full_name || "Student"}</UserName>
            {currentUser?.school_id && (
              <SchoolId>{currentUser.school_id}</SchoolId>
            )}
            <UserRole>Student</UserRole>
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
          {currentUser?.role === 'admin' && (
            <AdminButton onClick={() => navigate('/admin/dashboard')}>
              <LayoutDashboard size={20} /> Back to Admin
            </AdminButton>
          )}
          <LogoutButton onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </LogoutButton>
        </SidebarFooter>
      </Sidebar>

      <MainContent>
        <HeroSection>
          <HeroContent>
            <HeroEyebrow>Student Portal</HeroEyebrow>
            <HeroTitle>
              Hello, {currentUser?.full_name?.split(" ")[0] || "Student"}.
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
              <SpotlightLabel>Current Section</SpotlightLabel>
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

const AdminButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--accent-primary);
  border: none;
  color: white;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    transform: translateY(-2px);
    background: var(--accent-highlight);
    box-shadow: var(--shadow-sm);
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

export default Home;
