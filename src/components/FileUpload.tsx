import React, { useRef, useState } from "react";
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
  const fileInput = useRef<HTMLInputElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const file = e.target.files[0];
      try {
        console.log(`[FileUpload] Arquivo selecionado: ${file.name}, Tamanho: ${file.size} bytes`);
        const content = await file.text();
        console.log(`[FileUpload] Arquivo lido com sucesso. Tamanho do conteúdo: ${content.length} caracteres`);
        setFileContent(content);
        setShowModal(true);
      } catch (err) {
        console.error("File reading error:", err);
        alert("Erro ao ler o arquivo: " + (err instanceof Error ? err.message : String(err)));
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

  const handleClick = () => {
    if (fileInput.current) {
      fileInput.current.value = "";
    }
    fileInput.current?.click();
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
