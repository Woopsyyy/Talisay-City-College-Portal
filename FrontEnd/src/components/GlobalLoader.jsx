import React from 'react';
import styled from 'styled-components';
import Loader from './Loader';
import { useLoading } from '../context/LoadingContext';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const GlobalLoader = () => {
  const { isLoading } = useLoading();
  if (!isLoading) return null;
  return (
    <Backdrop>
      <Loader />
    </Backdrop>
  );
};

export default GlobalLoader;

