import React from 'react';
import '../styles/Modal.scss';

interface Props {
  onClose: () => void;
  onConfirm: (mode: 'add' | 'replace') => void;
}

export const ImportModeModal: React.FC<Props> = ({ onClose, onConfirm }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Modo de Importação</h2>
        <p>Você deseja adicionar os produtos ao estoque existente ou substituir todo o estoque atual?</p>
        <div className="modal-buttons">
          <button onClick={() => onConfirm('add')}>Adicionar</button>
          <button onClick={() => onConfirm('replace')}>Substituir</button>
          <button className="cancel-btn" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};
