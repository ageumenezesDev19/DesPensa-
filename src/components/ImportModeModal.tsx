import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Modal.scss';

interface Props {
  onClose: () => void;
  onConfirm: (mode: 'add' | 'replace') => void;
}

export const ImportModeModal: React.FC<Props> = ({ onClose, onConfirm }) => {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{t('import.modeTitle', 'Modo de Importação')}</h2>
        <p>{t('import.modeQuestion', 'Você deseja adicionar os produtos ao estoque existente ou substituir todo o estoque atual?')}</p>
        <div className="modal-buttons">
          <button onClick={() => onConfirm('add')}>{t('common.add', 'Adicionar')}</button>
          <button onClick={() => onConfirm('replace')}>{t('common.replace', 'Substituir')}</button>
          <button className="cancel-btn" onClick={onClose}>{t('common.cancel', 'Cancelar')}</button>
        </div>
      </div>
    </div>
  );
};
