import React from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertTriangle } from 'lucide-react';

const DeleteModal = ({ isOpen, onClose, onConfirm, title, message, itemName, isLoading }) => {
  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <DeleteModalContent onClick={e => e.stopPropagation()}>
        <DeleteHeader>
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h3>{title || 'Confirm Deletion'}</h3>
          <p>{message || 'Are you sure you want to delete this item?'}</p>
          {itemName && (
            <div className="preview-text">
              "{itemName}"
            </div>
          )}
        </DeleteHeader>
        <ModalFooter>
          <SecondaryButton onClick={onClose}>No, Cancel</SecondaryButton>
          <DeleteConfirmButton onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Yes, Delete'}
          </DeleteConfirmButton>
        </ModalFooter>
      </DeleteModalContent>
    </ModalOverlay>
  );
};


const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
`;

const ModalContent = styled.div`
  background: white;
  width: 90%;
  max-width: 600px;
  border-radius: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DeleteModalContent = styled(ModalContent)`
  max-width: 400px;
  text-align: center;
`;

const DeleteHeader = styled.div`
  padding: 2.5rem 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;

  h3 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; }
  p { color: #64748b; margin-bottom: 1rem; }
  
  .preview-text {
    background: #f1f5f9;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 500;
    color: #475569;
    font-size: 0.9rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const ModalFooter = styled.div`
  padding: 1.25rem 2rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

const Button = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); transform: translateY(-1px); }
  &:disabled { opacity: 0.7; cursor: not-allowed; }
`;

const SecondaryButton = styled(Button)`
  background: white;
  color: #64748b;
  border: 1px solid #cbd5e1;
  &:hover { background: #f8fafc; color: #334155; border-color: #94a3b8; }
`;

const DeleteConfirmButton = styled(Button)`
  background: #ef4444;
  &:hover { background: #dc2626; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2); }
`;

export default DeleteModal;
