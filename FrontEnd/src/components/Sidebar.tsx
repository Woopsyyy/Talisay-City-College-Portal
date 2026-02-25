import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthAPI } from '../services/apis/auth';
import { getAvatarUrl } from '../services/apis/avatar';

const Sidebar = ({ currentUser, currentView, onViewChange }) => {
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState("images/sample.jpg");

  useEffect(() => {
    if (currentUser && !currentUser.avatar_url) {
        getAvatarUrl(currentUser.id, currentUser.image_path).then(url => {
            setAvatarUrl(prev => prev !== url ? url : prev);
        });
    }
  }, [currentUser]);

  const displayAvatarUrl = currentUser?.avatar_url || avatarUrl;

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await AuthAPI.logout();
        navigate('/');
    } catch (err) {
        console.error("Logout failed", err);
        navigate('/');
    }
  };

  const navItems = [
    { id: 'announcements', icon: 'bi-megaphone-fill', label: 'Announcements' },
    { id: 'records', icon: 'bi-journal-text', label: 'Records' },
    { id: 'grades', icon: 'bi-journal-bookmark-fill', label: 'Grades' },
    { id: 'transparency', icon: 'bi-graph-up', label: 'Transparency' },
    { id: 'evaluation', icon: 'bi-clipboard-check', label: 'Evaluation' },
    { id: 'settings', icon: 'bi-gear-fill', label: 'Settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-glass"></div>
      <div className="sidebar-top">
        <div className="sidebar-profile-tile">
          <img loading="lazy"
            id="sidebarUserImage"
            src={displayAvatarUrl}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/images/sample.jpg";
            }}
            alt="User"
            className="sidebar-logo"
          />
          {currentUser?.role === 'student' && currentUser?.school_id && (
              <span className="sidebar-school-id">{currentUser.school_id}</span>
          )}
          <span className="sidebar-role" style={{ display: 'inline' }}>
            {currentUser?.role ? currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1) : ''}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <ul>
          {navItems.map(item => (
              <li key={item.id}>
                <a
                  href="#"
                  className={`nav-link ${currentView === item.id ? 'active' : ''}`}
                  onClick={(e) => { e.preventDefault(); onViewChange(item.id); }}
                  title={item.label}
                >
                  <i className={`bi ${item.icon}`}></i>
                  <span className="nav-label">{item.label}</span>
                </a>
              </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-bottom">
        {currentUser?.role === 'admin' && (
            <a
                href="/admin/dashboard"
                className="btn btn-switch-view sidebar-switch-btn"
                title="Switch to Admin Dashboard"
                onClick={(e) => { e.preventDefault(); navigate('/admin/dashboard'); }}
            >
                <i className="bi bi-shield-lock-fill"></i>
                <span>Admin View</span>
            </a>
        )}
        <a href="#" className="btn logout-icon" title="Logout" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right"></i>
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;
