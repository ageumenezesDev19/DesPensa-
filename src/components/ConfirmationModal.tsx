import React from 'react';
import '../styles/Modal.scss'; // Reusing base modal styles

interface Props {
  message: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<Props> = ({ 
  message, 
  onConfirm, 
  onClose, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar' 
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <p>{message}</p>
        <div className="modal-buttons">
          <button className="danger" onClick={onConfirm}>{confirmText}</button>
          <button className="cancel-btn" onClick={onClose}>{cancelText}</button>
        </div>
      </div>
    </div>
  );
};
