import React from 'react';
import FileUpload from '../components/FileUpload';
import BlacklistManager from '../components/BlacklistManager';
import { saveBlacklistToString } from '../utils/blacklist_utils';
import { useEstoqueContext } from '../context/EstoqueContext';

export const BlacklistView: React.FC = () => {
  const {
    blacklist,
    setBlacklist,
    setLoading,
    handleLoadBlacklist,
    handleDownload,
    showNotification
  } = useEstoqueContext();

  const onDownload = () => {
    const content = saveBlacklistToString(blacklist);
    handleDownload('blacklist.txt', content);
  }

  return (
    <>
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={(content) => handleLoadBlacklist(content)}
          label="Importar blacklist.txt"
          accept=".txt"
        />
        <button onClick={onDownload} disabled={blacklist.length === 0}>
          Salvar/Baixar Blacklist
        </button>
      </div>
      <BlacklistManager
        blacklist={blacklist}
        setBlacklist={setBlacklist}
        showNotification={showNotification}
      />
    </>
  );
};
