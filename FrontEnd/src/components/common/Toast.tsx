import React, { useEffect } from 'react';
import baseStyled, { keyframes } from 'styled-components';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

const styled = baseStyled as any;

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  let Icon = CheckCircle;
  if (type === 'error') Icon = AlertCircle;
  if (type === 'warning') Icon = AlertTriangle;

  return (
    <ToastContainer $type={type}>
      <Icon size={20} />
      {message}
    </ToastContainer>
  );
};

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const ToastContainer = styled.div`
  position: fixed;
  top: 24px;
  right: 24px;
  background: white;
  color: ${props => {
     if (props.$type === 'error') return '#ef4444';
     if (props.$type === 'warning') return '#f59e0b'; // Amber
     return '#10b981';
  }};
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  z-index: 4000;
  animation: ${slideIn} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  border-left: 4px solid ${props => {
     if (props.$type === 'error') return '#ef4444';
     if (props.$type === 'warning') return '#f59e0b';
     return '#10b981';
  }};
`;

export default Toast;
