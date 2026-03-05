import React, { useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import '../styles/FileUpload.scss';
import { ImportModeModal } from "./ImportModeModal";

export type ImportMode = 'add' | 'replace';

interface Props {
  setLoading: (loading: boolean) => void;
  onFileUpload: (content: string, mode: ImportMode) => void;
  label: string;
  accept: string;
}

const FileUpload: React.FC<Props> = ({ setLoading, onFileUpload, label, accept }) => {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const file = e.target.files[0];
      try {
        console.log(`[FileUpload] Selected file: ${file.name}, Size: ${file.size} bytes`);
        const content = await file.text();
        console.log(`[FileUpload] File read successfully. Content length: ${content.length} characters`);
        setFileContent(content);
        setShowModal(true);
      } catch (err) {
        console.error("File reading error:", err);
        alert(t('common.errorReadingFile', { error: (err instanceof Error ? err.message : String(err)), defaultValue: "Erro ao ler o arquivo." }));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConfirmImport = (mode: ImportMode) => {
    if (fileContent) {
      onFileUpload(fileContent, mode);
    }
    setShowModal(false);
    setFileContent(null);
  };

  const handleClick = async () => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    
    if (isTauri) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        
        const acceptExtensions = accept.split(',').map(a => a.trim().replace('.', ''));
        
        const selected = await open({
          multiple: false,
          filters: [{ name: label, extensions: acceptExtensions }]
        });
        
        if (selected) {
          setLoading(true);
          try {
            const content = await readTextFile(selected as string);
            setFileContent(content);
            setShowModal(true);
          } catch (readErr) {
            console.error("Tauri file read error:", readErr);
            alert(t('common.errorReadingFile', { error: String(readErr), defaultValue: "Erro ao ler o arquivo." }));
          } finally {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Tauri open dialog error, falling back to web:", err);
        // Fall back to regular file input
        if (fileInput.current) fileInput.current.value = "";
        fileInput.current?.click();
      }
    } else {
      if (fileInput.current) fileInput.current.value = "";
      fileInput.current?.click();
    }
  };

  return (
    <>
      {showModal && <ImportModeModal onClose={() => setShowModal(false)} onConfirm={handleConfirmImport} />}
      <div className="file-upload">
        <input
          type="file"
          accept={accept}
          ref={fileInput}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button onClick={handleClick}>{label}</button>
      </div>
    </>
  );
};

export default FileUpload;
