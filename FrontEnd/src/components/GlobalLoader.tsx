import React from 'react';
import Loader from './Loader';
import { useLoading } from '../context/LoadingContext';

const GlobalLoader = () => {
  const { isLoading } = useLoading();
  if (!isLoading) return null;
  return <Loader fullScreen />;
};

export default GlobalLoader;

