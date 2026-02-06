import React from 'react';
import styled from 'styled-components';

const Loader = () => {
  return (
    <Wrapper role="status" aria-live="polite" aria-label="Loading">
      <Spinner />
      <Label>Loading...</Label>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 28px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 16px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
`;

const Spinner = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 4px solid rgba(0, 0, 0, 0.12);
  border-top-color: #0a66ff;
  animation: spin 0.9s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Label = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #1f2a37;
  letter-spacing: 0.2px;
`;

export default Loader;
