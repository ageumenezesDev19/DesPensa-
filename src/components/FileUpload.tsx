import React, { useRef } from "react";
import '../styles/FileUpload.scss';

interface Props {
  setLoading: (loading: boolean) => void;
  onFileUpload: (content: string) => void;
  label: string;
  accept: string;
}

const FileUpload: React.FC<Props> = ({ setLoading, onFileUpload, label, accept }) => {
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      const file = e.target.files[0];
      try {
        const content = await file.text();
        onFileUpload(content);
      } catch (err) {
        console.error("File reading error:", err);
        alert("Erro ao ler o arquivo: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClick = () => {
    // Reset the file input value to allow re-uploading the same file
    if (fileInput.current) {
      fileInput.current.value = "";
    }
    fileInput.current?.click();
  };

  return (
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
  );
};

export default FileUpload;
