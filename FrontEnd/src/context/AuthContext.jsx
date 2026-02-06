import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthAPI, getAvatarUrl } from '../services/api';

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
    const savedUser = localStorage.getItem('tcc_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem('tcc_avatar') || '/images/sample.jpg');

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
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Don't clear immediately on error to prevent flickering on network hiccups
    } finally {
      setLoading(false);
    }
  }, [updateAvatar]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username, password) => {
    const data = await AuthAPI.login(username, password);
    setUser(data.user);
    localStorage.setItem('tcc_user', JSON.stringify(data.user));
    await updateAvatar(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await AuthAPI.logout();
    } finally {
      setUser(null);
      setAvatarUrl('/images/sample.jpg');
      localStorage.removeItem('tcc_user');
      localStorage.removeItem('tcc_avatar');
    }
  };

  const value = {
    user,
    loading,
    avatarUrl,
    checkAuth,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
