import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { addToBlacklist as addTerm, removeFromBlacklist as removeTerm } from "../utils/blacklist_utils";
import "../styles/BlacklistManager.scss";

interface Props {
  blacklist: string[];
  setBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
  showNotification: (message: string) => void;
}

const BlacklistManager: React.FC<Props> = ({ blacklist, setBlacklist, showNotification }) => {
  const { t } = useTranslation();
  const [termo, setTermo] = useState<string>("");

  const handleAdd = () => {
    if (!termo.trim()) return;
    setBlacklist(prev => addTerm(prev, termo));
    showNotification(t('blacklist.added', { term: termo, defaultValue: `Termo '${termo}' adicionado à lista negra.` }));
    setTermo("");
  };

  const handleRemove = (termToRemove: string) => {
    setBlacklist(prev => removeTerm(prev, termToRemove));
    showNotification(t('blacklist.removed', { term: termToRemove, defaultValue: `Termo '${termToRemove}' removido da lista negra.` }));
  };

  return (
    <div className="blacklist-manager animated-fadein">
      <h2>{t('blacklist.title', 'Blacklist')}</h2>
      <ul>
        {blacklist.map((term, i) => (
          <li key={i}>
            {term}
            <button onClick={() => handleRemove(term)}>{t('blacklist.remove', 'Remover')}</button>
          </li>
        ))}
      </ul>
      <div className="add-term">
        <input
          type="text"
          placeholder={t('blacklist.addTerm', 'Adicionar termo')}
          value={termo}
          onChange={e => setTermo(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd}>{t('blacklist.add', 'Adicionar')}</button>
      </div>
    </div>
  );
};

export default BlacklistManager;

