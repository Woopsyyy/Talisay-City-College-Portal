import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthAPI, getAvatarUrl, subscribeToUnauthorized } from '../services/api';

type AuthUser = {
  id?: number;
  username?: string;
  full_name?: string;
  role?: string;
  roles?: string[];
  sub_role?: string | null;
  sub_roles?: string[];
  image_path?: string | null;
  avatar_url?: string | null;
  [key: string]: any;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  avatarUrl: string;
  activeRole: string | null;
  activeSubRole: string | null;
  switchRole: (role: string) => void;
  switchSubRole: (subRole: string) => void;
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('tcc_user');
      if (!savedUser || savedUser === 'undefined') return null;
      return JSON.parse(savedUser);
    } catch (e) {
      console.error("AuthContext: Error parsing tcc_user", e);
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('tcc_avatar') || '/images/sample.jpg';
    } catch (e) {
      return '/images/sample.jpg';
    }
  });

  const [activeRole, setActiveRole] = useState<string | null>(() => {
    return localStorage.getItem('tcc_active_role') || null;
  });

  const [activeSubRole, setActiveSubRole] = useState<string | null>(() => {
    return localStorage.getItem('tcc_active_sub_role') || null;
  });

  const updateAvatar = useCallback(async (userData: AuthUser | null) => {
    if (!userData) {
      setAvatarUrl('/images/sample.jpg');
      localStorage.removeItem('tcc_avatar');
      return;
    }
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

  const switchRole = useCallback((role: string) => {
    setActiveRole(role);
    localStorage.setItem('tcc_active_role', role);
  }, []);

  const switchSubRole = useCallback((subRole: string) => {
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
      const defaultRole = userRoles.find((r: string) => mainRoles.includes(r.toLowerCase())) || userRoles[0];
      
      setActiveRole(defaultRole);
      localStorage.setItem('tcc_active_role', defaultRole);
    }
    
    if (user && !activeSubRole) {
        const functionalRoles = ['nt', 'osas', 'treasury'];
        const userSubRoles = Array.isArray(user.sub_roles) ? user.sub_roles : [user.sub_role].filter(Boolean);
        if (userSubRoles.length > 0) {
            const defaultSub = userSubRoles.find((r: string) => functionalRoles.includes(r.toLowerCase())) || userSubRoles[0];
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
    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string) => {
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

  const value: AuthContextValue = {
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
