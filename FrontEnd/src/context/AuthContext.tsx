import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Toast from '../components/common/Toast';
import { AuthAPI } from '../services/apis/auth';
import { getAvatarUrl } from '../services/apis/avatar';
import { subscribeToUnauthorized } from '../services/apiEvents';
import {
  refreshActiveUserPresence,
  startActiveUserPresence,
  stopActiveUserPresence,
} from '../services/activeUsers';
import { supabase } from '../supabaseClient';
import { APP_POLLING_GUARD, SESSION_RUNTIME_GUARD } from '../config/runtimeGuards';

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
  avatarRequired: boolean;
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
const AUTH_DEFAULT_AVATAR = '/images/tcc-logo.png';

const isSampleAvatarUrl = (value: string) => {
  const normalized = String(value || '').trim().toLowerCase();
  return (
    !normalized ||
    normalized === 'images/sample.jpg' ||
    normalized === '/images/sample.jpg' ||
    normalized.endsWith('/images/sample.jpg')
  );
};

const isDefaultProfileImage = (userData: AuthUser | null) => {
  const imagePath = String(userData?.image_path || "")
    .trim()
    .toLowerCase();

  return (
    !imagePath ||
    imagePath === "images/sample.jpg" ||
    imagePath === "/images/sample.jpg"
  );
};

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
      return localStorage.getItem('tcc_avatar') || AUTH_DEFAULT_AVATAR;
    } catch (e) {
      return AUTH_DEFAULT_AVATAR;
    }
  });
  const [avatarRequired, setAvatarRequired] = useState<boolean>(() => isDefaultProfileImage(user));
  const [idleToast, setIdleToast] = useState<{
    show: boolean;
    message: string;
    type: 'warning' | 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'warning',
  });

  const [activeRole, setActiveRole] = useState<string | null>(() => {
    return localStorage.getItem('tcc_active_role') || null;
  });

  const [activeSubRole, setActiveSubRole] = useState<string | null>(() => {
    return localStorage.getItem('tcc_active_sub_role') || null;
  });

  const clearSessionHiddenMarker = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_RUNTIME_GUARD.tabHiddenAtStorageKey);
    } catch (_) {}
  }, []);

  const markSessionHiddenNow = useCallback(() => {
    try {
      localStorage.setItem(
        SESSION_RUNTIME_GUARD.tabHiddenAtStorageKey,
        String(Date.now()),
      );
    } catch (_) {}
  }, []);

  const updateAvatar = useCallback(async (userData: AuthUser | null) => {
    if (!userData) {
      setAvatarUrl(AUTH_DEFAULT_AVATAR);
      setAvatarRequired(false);
      localStorage.removeItem('tcc_avatar');
      return;
    }
    setAvatarRequired(isDefaultProfileImage(userData));

    const rawAvatarUrl = String(userData.avatar_url || '').trim();
    if (rawAvatarUrl && !isSampleAvatarUrl(rawAvatarUrl)) {
      setAvatarUrl(rawAvatarUrl);
      localStorage.setItem('tcc_avatar', rawAvatarUrl);
      return;
    }

    if (userData.image_path) {
      const url = await getAvatarUrl(userData.id, userData.image_path);
      const resolved = isSampleAvatarUrl(url) ? AUTH_DEFAULT_AVATAR : url;
      const cacheBusted = resolved + (resolved.includes('?') ? '&' : '?') + 't=' + Date.now();
      setAvatarUrl(cacheBusted);
      localStorage.setItem('tcc_avatar', cacheBusted);
      return;
    }

    setAvatarUrl(AUTH_DEFAULT_AVATAR);
    localStorage.setItem('tcc_avatar', AUTH_DEFAULT_AVATAR);
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

  const login = useCallback(async (username: string, password: string) => {
    const data = await AuthAPI.login(username, password);
    setUser(data.user);
    if (data.user) {
      localStorage.setItem('tcc_user', JSON.stringify(data.user));
    } else {
      localStorage.removeItem('tcc_user');
    }
    try {
      const nonce = String(data?.session_nonce || "").trim();
      if (nonce) {
        localStorage.setItem(SESSION_RUNTIME_GUARD.sessionNonceStorageKey, nonce);
      } else {
        localStorage.removeItem(SESSION_RUNTIME_GUARD.sessionNonceStorageKey);
      }
    } catch (_) {}
    clearSessionHiddenMarker();
    await updateAvatar(data.user);
    return data;
  }, [clearSessionHiddenMarker, updateAvatar]);

  const logout = useCallback(async () => {
    try {
      await AuthAPI.logout();
    } finally {
      stopActiveUserPresence();
      setUser(null);
      setAvatarUrl(AUTH_DEFAULT_AVATAR);
      setActiveRole(null);
      setActiveSubRole(null);
      setAvatarRequired(false);
      localStorage.removeItem('tcc_user');
      localStorage.removeItem('tcc_avatar');
      localStorage.removeItem('tcc_active_role');
      localStorage.removeItem('tcc_active_sub_role');
      localStorage.removeItem(SESSION_RUNTIME_GUARD.sessionNonceStorageKey);
      clearSessionHiddenMarker();
    }
  }, [clearSessionHiddenMarker]);

  const checkAuth = useCallback(async () => {
    try {
      const data = await AuthAPI.checkSession();
      if (data.authenticated) {
        setUser(data.user);
        localStorage.setItem('tcc_user', JSON.stringify(data.user));
        clearSessionHiddenMarker();
        await updateAvatar(data.user);
      } else {
        setUser(null);
        localStorage.removeItem('tcc_user');
        localStorage.removeItem('tcc_avatar');
        localStorage.removeItem('tcc_active_role');
        localStorage.removeItem('tcc_active_sub_role');
        clearSessionHiddenMarker();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [clearSessionHiddenMarker, updateAvatar]);

  useEffect(() => {
    const path = String(window.location?.pathname || "").trim();
    const hasSupabaseSessionToken = (() => {
      try {
        return Object.keys(localStorage).some(
          (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
        );
      } catch (_) {
        return false;
      }
    })();
    const shouldSkipInitialCheck = path === "/" && !user && !hasSupabaseSessionToken;
    if (shouldSkipInitialCheck) {
      setLoading(false);
      return;
    }

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
    if (!user?.id) {
      clearSessionHiddenMarker();
      return;
    }

    let forcedLogoutQueued = false;
    const forceLogoutIfHiddenTooLong = () => {
      let hiddenAt = 0;
      try {
        hiddenAt = Number(localStorage.getItem(SESSION_RUNTIME_GUARD.tabHiddenAtStorageKey) || 0);
      } catch (_) {
        hiddenAt = 0;
      }

      if (!Number.isFinite(hiddenAt) || hiddenAt <= 0) return false;

      const elapsedMs = Date.now() - hiddenAt;
      if (elapsedMs < SESSION_RUNTIME_GUARD.autoLogoutAfterMs) return false;
      if (forcedLogoutQueued) return true;

      forcedLogoutQueued = true;
      clearSessionHiddenMarker();
      setIdleToast({
        show: true,
        type: "warning",
        message:
          "This session was inactive for more than 15 minutes while the tab was hidden or closed. Please sign in again.",
      });
      void logout();
      return true;
    };

    if (forceLogoutIfHiddenTooLong()) {
      return;
    }
    clearSessionHiddenMarker();

    const handleVisibility = () => {
      if (document.hidden) {
        markSessionHiddenNow();
        return;
      }
      if (forceLogoutIfHiddenTooLong()) return;
      clearSessionHiddenMarker();
    };

    const handlePageHide = () => {
      markSessionHiddenNow();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      if (!document.hidden) {
        clearSessionHiddenMarker();
      }
    };
  }, [clearSessionHiddenMarker, logout, markSessionHiddenNow, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      stopActiveUserPresence();
      return;
    }

    startActiveUserPresence(user);
    const heartbeatTimer = window.setInterval(() => {
      refreshActiveUserPresence();
    }, APP_POLLING_GUARD.activeUserHeartbeatIntervalMs);

    return () => {
      clearInterval(heartbeatTimer);
      stopActiveUserPresence();
    };
  }, [user?.id, user?.username, user?.full_name, user?.role]);

  // Handle Session Inactivity
  useEffect(() => {
    if (!user) return;

    let warningTimer: number | undefined;
    let logoutTimer: number | undefined;
    let lastServerTouchAt = 0;
    const WARNING_TIMEOUT = SESSION_RUNTIME_GUARD.warningAfterMs;
    const LOGOUT_TIMEOUT = Math.max(
      1,
      SESSION_RUNTIME_GUARD.autoLogoutAfterMs - SESSION_RUNTIME_GUARD.warningAfterMs,
    );
    const warningMinutes = Math.round(WARNING_TIMEOUT / 60000);
    const logoutMinutes = Math.max(1, Math.round(LOGOUT_TIMEOUT / 60000));

    const hideIdleToast = () => {
      setIdleToast((prev) => (prev.show ? { ...prev, show: false } : prev));
    };

    const handleInactivityWarning = () => {
      setIdleToast({
        show: true,
        type: 'warning',
        message:
          `Your session has been idle for ${warningMinutes} minutes. Move your mouse or press any key within ${logoutMinutes} minutes to stay logged in.`,
      });
      logoutTimer = window.setTimeout(handleAutoLogout, LOGOUT_TIMEOUT);
    };

    const handleAutoLogout = () => {
      clearTimers();
      hideIdleToast();
      void logout();
    };

    const clearTimers = () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
    };

    const resetTimers = () => {
      clearTimers();
      hideIdleToast();
      warningTimer = window.setTimeout(handleInactivityWarning, WARNING_TIMEOUT);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    const touchServerGuard = () => {
      const now = Date.now();
      if (now - lastServerTouchAt < SESSION_RUNTIME_GUARD.serverTouchMinGapMs) {
        return;
      }
      lastServerTouchAt = now;
      void AuthAPI.touchSessionGuard("activity_heartbeat");
    };

    const resetOnInteraction = () => {
      resetTimers();
      touchServerGuard();
    };

    events.forEach(event => window.addEventListener(event, resetOnInteraction));
    resetTimers(); // Initialize
    touchServerGuard();

    return () => {
      events.forEach(event => window.removeEventListener(event, resetOnInteraction));
      clearTimers();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const userId = Number(user?.id);
    if (!Number.isFinite(userId) || userId <= 0) return;

    let forcedLogoutQueued = false;
    const channel = supabase
      .channel(`tcc-session-guard-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "status_logs",
          filter: `target_user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (forcedLogoutQueued) return;
          const row = payload?.new || {};
          const action = String(row?.action || "").trim().toLowerCase();
          if (action !== SESSION_RUNTIME_GUARD.sessionRotationAction) return;

          const metadata =
            row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
              ? row.metadata
              : {};
          const incomingNonce = String(
            metadata?.new_session_nonce || metadata?.session_nonce || "",
          ).trim();

          let localNonce = "";
          try {
            localNonce = String(
              localStorage.getItem(SESSION_RUNTIME_GUARD.sessionNonceStorageKey) || "",
            ).trim();
          } catch (_) {}

          if (!incomingNonce || !localNonce || incomingNonce === localNonce) return;
          forcedLogoutQueued = true;
          setIdleToast({
            show: true,
            type: "warning",
            message:
              "This account was signed in from another IP/device. For security, this older session is now logged out.",
          });
          window.setTimeout(() => {
            void logout();
          }, 1200);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [logout, user?.id]);

  useEffect(() => {
    const unsubscribe = subscribeToUnauthorized(() => {
      setUser(null);
      setAvatarUrl(AUTH_DEFAULT_AVATAR);
      setActiveRole(null);
      try {
        localStorage.removeItem('tcc_user');
        localStorage.removeItem('tcc_avatar');
        localStorage.removeItem('tcc_active_role');
        localStorage.removeItem('tcc_active_sub_role');
        localStorage.removeItem(SESSION_RUNTIME_GUARD.sessionNonceStorageKey);
        clearSessionHiddenMarker();
        setAvatarRequired(false);
      } catch (_) {}
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [clearSessionHiddenMarker]);

  const value: AuthContextValue = {
    user,
    loading,
    avatarUrl,
    avatarRequired,
    activeRole,
    activeSubRole,
    switchRole,
    switchSubRole,
    checkAuth,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {idleToast.show ? (
        <Toast
          message={idleToast.message}
          type={idleToast.type}
          duration={Math.max(
            65000,
            SESSION_RUNTIME_GUARD.autoLogoutAfterMs - SESSION_RUNTIME_GUARD.warningAfterMs + 2000,
          )}
          onClose={() => setIdleToast((prev) => ({ ...prev, show: false }))}
        />
      ) : null}
    </AuthContext.Provider>
  );
};
