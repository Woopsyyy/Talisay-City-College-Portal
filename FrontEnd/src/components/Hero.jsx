import React, { useState, useEffect } from 'react';
import ClockCard from './common/ClockCard';
import ThemeToggle from './common/ThemeToggle';

const heroSpotlights = {
  records: {
    hero_copy:
      "Review building assignments, finances, and grades in a single, refreshed timeline built for clarity.",
    spotlight_eyebrow: "Records overview",
    spotlight_title: "My Records",
    spotlight_copy:
      "Check building assignments, sanctions, financial status, and detailed grades in one cohesive space.",
  },
  announcements: {
    hero_copy:
      "Catch up on campus headlines, filter by year or department, and keep every announcement at your fingertips.",
    spotlight_eyebrow: "Latest broadcasts",
    spotlight_title: "Announcements",
    spotlight_copy:
      "Browse targeted updates, stay informed on school activities, and never miss important campus news.",
  },
  grades: {
    hero_copy:
      "Review your academic progress, semester summaries, and detailed subject grades in one comprehensive view.",
    spotlight_eyebrow: "Academic records",
    spotlight_title: "My Grades",
    spotlight_copy:
      "View all your subject grades organized by semester, track your academic performance, and monitor your progress throughout the year.",
  },
  transparency: {
    hero_copy:
      "See where resources go, review project milestones, and keep the community informed with transparent reporting.",
    spotlight_eyebrow: "Project insights",
    spotlight_title: "Transparency",
    spotlight_copy:
      "Explore school project budgets, completion status, and milestones through an accessible transparency log.",
  },
  evaluation: {
    hero_copy:
      "Evaluate your teachers and provide feedback to help improve the learning experience for everyone.",
    spotlight_eyebrow: "Teacher evaluation",
    spotlight_title: "Teacher Evaluation",
    spotlight_copy:
      "Share your thoughts about your teachers and help improve the quality of education through constructive feedback.",
  },
  settings: {
    hero_copy:
      "Update your profile details and keep your account information aligned with your current data.",
    spotlight_eyebrow: "Account controls",
    spotlight_title: "Settings",
    spotlight_copy:
      "Update your username, display name, email, and profile picture. Password updates are handled by administrators.",
  },
};

const Hero = ({ currentUser, currentView, onViewChange }) => {
  const spotlight = heroSpotlights[currentView] || heroSpotlights.records;

  const actions = [
      { id: 'records', icon: 'bi-journal-text', label: 'Records' },
      { id: 'announcements', icon: 'bi-megaphone-fill', label: 'Announcements' },
      { id: 'grades', icon: 'bi-journal-bookmark-fill', label: 'Grades' },
      { id: 'transparency', icon: 'bi-graph-up-arrow', label: 'Transparency' },
      { id: 'evaluation', icon: 'bi-clipboard-check', label: 'Evaluation' },
      { id: 'settings', icon: 'bi-gear-fill', label: 'Settings' },
  ];

  return (
    <section className="dashboard-hero">
      <div className="hero-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <span className="hero-eyebrow">Student Dashboard</span>
                <h1 className="hero-title">
                Hi, <span>{currentUser?.full_name || currentUser?.username || "User"}</span>!
                </h1>
            </div>
            {}
            <ThemeToggle />
        </div>
        
        <p className="hero-copy">{spotlight.hero_copy}</p>
        <div className="hero-action-group">
          {actions.map(action => (
              <a 
                href="#" 
                key={action.id}
                className={`hero-action ${currentView === action.id ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); onViewChange(action.id); }}
              >
                <i className={`bi ${action.icon}`}></i>
                <span>{action.label}</span>
              </a>
          ))}
        </div>
      </div>
      <div className="hero-spotlight">
        <div className="spotlight-card">
          <span className="spotlight-eyebrow">{spotlight.spotlight_eyebrow}</span>
          <h2 className="spotlight-title">{spotlight.spotlight_title}</h2>
          <p className="spotlight-copy">{spotlight.spotlight_copy}</p>
        </div>
        {}
        <ClockCard className="spotlight-card alt clock-card" />
      </div>
    </section>
  );
};

export default Hero;
