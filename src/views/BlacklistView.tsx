
import React from 'react';
import FileUpload from '../components/FileUpload';
import BlacklistManager from '../components/BlacklistManager';
import { saveBlacklistToString } from '../utils/blacklist_utils';

interface BlacklistViewProps {
  blacklist: string[];
  setBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
  setLoading: (loading: boolean) => void;
  onFileUpload: (content: string) => void;
  handleDownload: (filename: string, content: string) => void;
  showNotification: (message: string) => void;
}

export const BlacklistView: React.FC<BlacklistViewProps> = ({
  blacklist,
  setBlacklist,
  setLoading,
  onFileUpload,
  handleDownload,
  showNotification,
}) => {

  const onDownload = () => {
    const content = saveBlacklistToString(blacklist);
    handleDownload('blacklist.txt', content);
  }

  return (
    <>
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={onFileUpload}
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
