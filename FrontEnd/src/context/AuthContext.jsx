import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthAPI, getAvatarUrl, subscribeToUnauthorized } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tcc_user');
      if (!savedUser || savedUser === 'undefined') return null;
      return JSON.parse(savedUser);
    } catch (e) {
      console.error("AuthContext: Error parsing tcc_user", e);
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(() => {
    try {
      return localStorage.getItem('tcc_avatar') || '/images/sample.jpg';
    } catch (e) {
      return '/images/sample.jpg';
    }
  });

  const [activeRole, setActiveRole] = useState(() => {
    return localStorage.getItem('tcc_active_role') || null;
  });

  const [activeSubRole, setActiveSubRole] = useState(() => {
    return localStorage.getItem('tcc_active_sub_role') || null;
  });

  const updateAvatar = useCallback(async (userData) => {
    if (userData.avatar_url) {
      setAvatarUrl(userData.avatar_url);
      localStorage.setItem('tcc_avatar', userData.avatar_url);
    } else if (userData.image_path) {
      const url = await getAvatarUrl(userData.id, userData.image_path);
      const cacheBusted = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
      setAvatarUrl(cacheBusted);
      localStorage.setItem('tcc_avatar', cacheBusted);
    }
  }, []);

  const switchRole = useCallback((role) => {
    setActiveRole(role);
    localStorage.setItem('tcc_active_role', role);
  }, []);

  const switchSubRole = useCallback((subRole) => {
    setActiveSubRole(subRole);
    localStorage.setItem('tcc_active_sub_role', subRole);
    // When switching sub-role, we might want to clear main activeRole if it's strictly a functional switch
    // but the user said "upper part is the main role", so we keep both.
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const data = await AuthAPI.checkSession();
      if (data.authenticated) {
        setUser(data.user);
        localStorage.setItem('tcc_user', JSON.stringify(data.user));
        await updateAvatar(data.user);
      } else {
        setUser(null);
        localStorage.removeItem('tcc_user');
        localStorage.removeItem('tcc_avatar');
        localStorage.removeItem('tcc_active_role');
        localStorage.removeItem('tcc_active_sub_role');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [updateAvatar]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user && !activeRole) {
      const mainRoles = ['admin', 'teacher', 'student'];
      const userRoles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role || 'student'];
      const defaultRole = userRoles.find(r => mainRoles.includes(r.toLowerCase())) || userRoles[0];
      
      setActiveRole(defaultRole);
      localStorage.setItem('tcc_active_role', defaultRole);
    }
    
    if (user && !activeSubRole) {
        const functionalRoles = ['nt', 'osas', 'treasury'];
        const userSubRoles = Array.isArray(user.sub_roles) ? user.sub_roles : [user.sub_role].filter(Boolean);
        if (userSubRoles.length > 0) {
            const defaultSub = userSubRoles.find(r => functionalRoles.includes(r.toLowerCase())) || userSubRoles[0];
            setActiveSubRole(defaultSub);
            localStorage.setItem('tcc_active_sub_role', defaultSub);
        }
    }
  }, [user, activeRole, activeSubRole]);

  useEffect(() => {
    const unsubscribe = subscribeToUnauthorized(() => {
      setUser(null);
      setAvatarUrl('/images/sample.jpg');
      setActiveRole(null);
      try {
        localStorage.removeItem('tcc_user');
        localStorage.removeItem('tcc_avatar');
        localStorage.removeItem('tcc_active_role');
        localStorage.removeItem('tcc_active_sub_role');
      } catch (_) {}
    });
    return () => unsubscribe();
  }, []);

  const login = async (username, password) => {
    const data = await AuthAPI.login(username, password);
    setUser(data.user);
    if (data.user) {
      localStorage.setItem('tcc_user', JSON.stringify(data.user));
    } else {
      localStorage.removeItem('tcc_user');
    }
    await updateAvatar(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await AuthAPI.logout();
    } finally {
      setUser(null);
      setAvatarUrl('/images/sample.jpg');
      setActiveRole(null);
      setActiveSubRole(null);
      localStorage.removeItem('tcc_user');
      localStorage.removeItem('tcc_avatar');
      localStorage.removeItem('tcc_active_role');
      localStorage.removeItem('tcc_active_sub_role');
    }
  };

  const value = {
    user,
    loading,
    avatarUrl,
    activeRole,
    activeSubRole,
    switchRole,
    switchSubRole,
    checkAuth,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
