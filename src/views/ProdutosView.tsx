
import React from 'react';
import SearchBar from '../components/SearchBar';
import FileUpload from '../components/FileUpload';
import ProductTable from '../components/ProductTable';
import { Produto } from '../utils/estoque';
import { ProdutoComQuantidade } from '../App';

interface ProdutosViewProps {
  produtos: Produto[];
  handleRetirarSingleProduct: (produto: Produto) => void;
  handleRetirarCombinacao: (combinacao: ProdutoComQuantidade[]) => void;
  searchResult: { status: string; produto?: Produto; combinacao?: ProdutoComQuantidade[] } | null;
  setSearchResult: (result: { status: string; produto?: Produto; combinacao?: ProdutoComQuantidade[] } | null) => void;
  preco: string;
  setPreco: (preco: string) => void;
  searchMode: 'produto' | 'combinacao';
  setSearchMode: (mode: 'produto' | 'combinacao') => void;
  handleSearch: (isRecalculation?: boolean) => void;
  handleRecalculate: () => void;
  searching: boolean;
  onCancelSearch: () => void;
  showCancel: boolean;
  showGlobalCancel: boolean;
  maxProdutos: number;
  setMaxProdutos: React.Dispatch<React.SetStateAction<number>>;
  focusInput: boolean;
  setFocusInput: (focus: boolean) => void;
  setLoading: (loading: boolean) => void;
  onFileUpload: (content: string) => void;
}

export const ProdutosView: React.FC<ProdutosViewProps> = ({
  produtos,
  handleRetirarSingleProduct,
  handleRetirarCombinacao,
  searchResult,
  setSearchResult,
  preco,
  setPreco,
  searchMode,
  setSearchMode,
  handleSearch,
  handleRecalculate,
  searching,
  onCancelSearch,
  showCancel,
  showGlobalCancel,
  maxProdutos,
  setMaxProdutos,
  focusInput,
  setFocusInput,
  setLoading,
  onFileUpload,
}) => {
  return (
    <>
      <SearchBar
        produtos={produtos}
        onRetirar={handleRetirarSingleProduct}
        onRetirarCombinacao={handleRetirarCombinacao}
        result={searchResult}
        setResult={setSearchResult}
        preco={preco}
        setPreco={setPreco}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        handleSearch={() => handleSearch(false)}
        handleRecalculate={handleRecalculate}
        searching={searching && !showGlobalCancel}
        onCancelSearch={onCancelSearch}
        showCancel={showCancel && !showGlobalCancel}
        showGlobalCancel={showGlobalCancel}
        maxProdutos={maxProdutos}
        setMaxProdutos={setMaxProdutos}
        focusInput={focusInput}
        setFocusInput={setFocusInput}
      />
      <div className="controls">
        <FileUpload
          setLoading={setLoading}
          onFileUpload={onFileUpload}
          label="Importar produtos.html"
          accept=".html"
        />
      </div>
      <ProductTable produtos={produtos} />
    </>
  );
};
