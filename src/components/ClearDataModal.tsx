
import React from 'react';

interface ClearDataModalProps {
  onClose: () => void;
  onClear: (type: "produtos" | "retirados" | "all") => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({ onClose, onClear }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>O que você deseja apagar?</h3>
        <p>Esta ação é irreversível. Selecione o que deseja limpar:</p>
        <div className="modal-actions vertical">
          <button className="danger" onClick={() => onClear("produtos")}>
            Apagar Estoque
          </button>
          <button className="danger" onClick={() => onClear("retirados")}>
            Apagar Retirados
          </button>
          <button className="danger" onClick={() => onClear("all")}>
            Apagar Tudo
          </button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};
