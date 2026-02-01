import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Moon, Sun } from 'lucide-react';

const ToggleButton = styled.button`
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 40px;
  height: 40px;
  border-radius: 50%; /* Circle shape matches profile */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
  
  &:hover {
      background: var(--bg-tertiary);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      color: var(--accent-primary);
  }
`;

const ThemeToggle = () => {
    
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ToggleButton onClick={toggleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </ToggleButton>
    );
};

export default ThemeToggle;
