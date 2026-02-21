import React from 'react';
import FileUpload from '../components/FileUpload';
import BlacklistManager from '../components/BlacklistManager';
import { useEstoqueContext } from '../context/EstoqueContext';

export const BlacklistView: React.FC = () => {
  const {
    blacklist,
    setBlacklist,
    setLoading,
    handleLoadBlacklist,
    showNotification
  } = useEstoqueContext();


  return (
    <>
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={(content) => handleLoadBlacklist(content)}
          label="Importar blacklist.txt"
          accept=".txt"
        />
      </div>
      <BlacklistManager
        blacklist={blacklist}
        setBlacklist={setBlacklist}
        showNotification={showNotification}
      />
    </>
  );
};
