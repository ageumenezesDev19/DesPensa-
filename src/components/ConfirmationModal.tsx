import React from 'react';
import { useTranslation } from 'react-i18next';
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
  confirmText, 
  cancelText 
}) => {
  const { t } = useTranslation();
  const finalConfirmText = confirmText || t('common.confirm', 'Confirmar');
  const finalCancelText = cancelText || t('common.cancel', 'Cancelar');

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <p>{message}</p>
        <div className="modal-buttons">
          <button className="danger" onClick={onConfirm}>{finalConfirmText}</button>
          <button className="cancel-btn" onClick={onClose}>{finalCancelText}</button>
        </div>
      </div>
    </div>
  );
};
