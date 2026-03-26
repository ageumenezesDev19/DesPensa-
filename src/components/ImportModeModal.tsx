import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Modal.scss';

interface Props {
  onClose: () => void;
  onConfirm: (mode: 'add' | 'replace', ignoreNcm: boolean) => void;
}

export const ImportModeModal: React.FC<Props> = ({ onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [ignoreNcm, setIgnoreNcm] = React.useState(true); // Default to true as the user requested to adapt to the new format

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{t('import.modeTitle', 'Modo de Importação')}</h2>
        <p>{t('import.modeQuestion', 'Você deseja adicionar os produtos ao estoque existente ou substituir todo o estoque atual?')}</p>
        
        <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="checkbox" 
            id="ignoreNcm" 
            checked={ignoreNcm} 
            onChange={(e) => setIgnoreNcm(e.target.checked)} 
          />
          <label htmlFor="ignoreNcm" style={{ cursor: 'pointer', fontSize: '14px' }}>
            {t('import.ignoreNcm', 'Ignorar obrigatoriedade de NCM (Recomendado para novos formatos)')}
          </label>
        </div>

        <div className="modal-buttons">
          <button onClick={() => onConfirm('add', ignoreNcm)}>{t('common.add', 'Adicionar')}</button>
          <button onClick={() => onConfirm('replace', ignoreNcm)}>{t('common.replace', 'Substituir')}</button>
          <button className="cancel-btn" onClick={onClose}>{t('common.cancel', 'Cancelar')}</button>
        </div>
      </div>
    </div>
  );
};
