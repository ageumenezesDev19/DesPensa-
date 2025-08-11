import React, { useState } from "react";
import { addToBlacklist as addTerm, removeFromBlacklist as removeTerm } from "../utils/blacklist_utils";
import "../styles/BlacklistManager.scss";

interface Props {
  blacklist: string[];
  setBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
  showNotification: (message: string) => void;
}

const BlacklistManager: React.FC<Props> = ({ blacklist, setBlacklist, showNotification }) => {
  const [termo, setTermo] = useState<string>("");

  const handleAdd = () => {
    if (!termo.trim()) return;
    setBlacklist(prev => addTerm(prev, termo));
    setTermo("");
    showNotification(`Termo '${termo}' adicionado à blacklist.`);
  };

  const handleRemove = (termToRemove: string) => {
    setBlacklist(prev => removeTerm(prev, termToRemove));
    showNotification(`Termo '${termToRemove}' removido da blacklist.`);
  };

  return (
    <div className="blacklist-manager animated-fadein">
      <h2>Blacklist</h2>
      <ul>
        {blacklist.map((term, i) => (
          <li key={i}>
            {term}
            <button onClick={() => handleRemove(term)}>Remover</button>
          </li>
        ))}
      </ul>
      <div className="add-term">
        <input
          type="text"
          placeholder="Adicionar termo"
          value={termo}
          onChange={e => setTermo(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd}>Adicionar</button>
      </div>
    </div>
  );
};

export default BlacklistManager;

