import React from 'react';
import Loader from './Loader';
import { useLoading } from '../context/LoadingContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const GlobalLoader = () => {
  const { isLoading } = useLoading();
  const { user } = useAuth();
  const location = useLocation();

  const role = String(user?.role || "").trim().toLowerCase();
  const roles = Array.isArray(user?.roles)
    ? user.roles.map((entry: unknown) => String(entry || "").trim().toLowerCase())
    : [];
  const isAdminPanel =
    location.pathname.startsWith("/admin/dashboard") &&
    (role === "admin" || roles.includes("admin"));

  if (!isLoading || isAdminPanel) return null;
  return <Loader fullScreen />;
};

export default GlobalLoader;

