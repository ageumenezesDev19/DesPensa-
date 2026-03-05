import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Modal.scss';

interface ClearDataModalProps {
  onClose: () => void;
  onClear: (type: "products" | "withdrawn" | "all") => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({ onClose, onClear }) => {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{t('clearData.title', 'O que você deseja apagar?')}</h3>
        <p>{t('clearData.warning', 'Esta ação é irreversível. Selecione o que deseja limpar:')}</p>
        <div className="modal-actions vertical">
          <button className="danger" onClick={() => onClear("products")}>
            {t('clearData.clearInventory', 'Apagar Estoque')}
          </button>
          <button className="danger" onClick={() => onClear("withdrawn")}>
            {t('clearData.clearWithdrawn', 'Apagar Retirados')}
          </button>
          <button className="danger" onClick={() => onClear("all")}>
            {t('clearData.clearAll', 'Apagar Tudo')}
          </button>
          <button onClick={onClose}>{t('common.cancel', 'Cancelar')}</button>
        </div>
      </div>
    </div>
  );
};
