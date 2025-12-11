import React, { useEffect, useRef } from "react";
import { Produto } from "../utils/estoque";
import AnimatedButton from "./AnimatedButton";
import "../styles/SearchBar.scss";
import { ProdutoComQuantidade } from "../App";
import { SearchMode } from "../hooks/useSearch";

interface Props {
  produtos: Produto[];
  onRetirar: (produto: Produto) => void;
  onRetirarCombinacao: (combinacao: ProdutoComQuantidade[]) => void;
  result: { status: string; produto?: Produto; combinacao?: ProdutoComQuantidade[] } | null;
  setResult: (result: any) => void;
  preco: string;
  setPreco: (preco: string) => void;
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  handleSearch: (isRecalculation: boolean, previouslyFoundSet: Set<string> | null) => void;
  handleRecalculate: () => void;
  searching?: boolean;
  onCancelSearch?: () => void;
  showCancel?: boolean;
  showGlobalCancel?: boolean;
  focusInput?: boolean;
  setFocusInput?: (focus: boolean) => void;
}

const SearchBar: React.FC<Props> = ({ produtos, onRetirar, onRetirarCombinacao, result, setResult, preco, setPreco, searchMode, setSearchMode, handleSearch, handleRecalculate, searching, onCancelSearch, showCancel, focusInput, setFocusInput }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusInput && inputRef.current) {
      inputRef.current.focus();
      setFocusInput?.(false);
    }
  }, [focusInput, setFocusInput]);

  const handleRetirarClick = (produto: Produto) => {
    onRetirar(produto);
    setResult(null);
  };

  const handleRetirarCombinacaoClick = (combinacao: ProdutoComQuantidade[]) => {
    onRetirarCombinacao(combinacao);
    setResult(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (result && result.status === 'ok') {
        if ((searchMode === 'produto_preco' || searchMode === 'produto_nome') && result.produto) {
          handleRetirarClick(result.produto);
        } else if (searchMode === 'combinacao' && result.combinacao) {
          handleRetirarCombinacaoClick(result.combinacao);
        }
      } else {
        handleSearch(false, null);
      }
    }
  };

  const getPlaceholder = () => {
    switch (searchMode) {
      case 'combinacao':
      case 'produto_preco':
        return "Pesquisar por preço (R$)";
      case 'produto_nome':
        return "Pesquisar por nome do produto";
      default:
        return "";
    }
  }

  return (
    <div className="search-bar animated-fadein">
      <div className="search-controls">
        <input
          ref={inputRef}
          type={searchMode === 'produto_nome' ? "text" : "text"} // Using text for both for flexibility with comma
          pattern={searchMode !== 'produto_nome' ? "[0-9,.]*" : undefined}
          placeholder={getPlaceholder()}
          value={preco}
          onChange={e => setPreco(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!!searching}
        />
        <select
          value={searchMode}
          onChange={e => {
            setSearchMode(e.target.value as SearchMode);
            setResult(null);
          }}
          disabled={!!searching}
        >
          <option value="combinacao">Buscar Combinação</option>
          <option value="produto_preco">Buscar Produto por Preço</option>
          <option value="produto_nome">Buscar Produto por Nome</option>
        </select>
        <button onClick={() => handleSearch(false, null)} disabled={produtos.length === 0 || !preco || !!searching}>
          Buscar
        </button>
      </div>

      {searching && (
        <div className="search-loading">
          <span className="loader-inline" /> Buscando produtos...
          {showCancel && (
            <button className="cancel-btn loading-cancel" onClick={onCancelSearch} type="button">
              Cancelar
            </button>
          )}
        </div>
      )}

      {produtos.length === 0 && <p>Por favor, importe o arquivo `produtos.html` para começar.</p>}

      {!searching && result && result.status === "ok" && (searchMode === 'produto_preco' || searchMode === 'produto_nome') && result.produto && (
        <div className="search-result">
          <p>
            <b>{result.produto.Descrição}</b> - R$ {Number(result.produto["Preço Venda"]).toFixed(2)} (Estoque: {result.produto.Quantidade})
          </p>
          <div className="comb-actions single-product-actions">
            <button onClick={() => handleRetirarClick(result.produto!)}>
              Retirar 1 unidade
            </button>
            <AnimatedButton onClick={handleRecalculate} title="Buscar outro produto" className="recalculate-btn">
              Recalcular
            </AnimatedButton>
          </div>
        </div>
      )}
      {!searching && result && result.status === "ok" && searchMode === "combinacao" && result.combinacao && (
        <div className="search-result">
          <h4>Combinação encontrada:</h4>
          <ul>
            {result.combinacao.map((p: any, i: number) => (
              <li key={i}>
                {p.Descrição} (<b>x{(p['Und.Sai.'] === 'KG' || p['Und.Sai.'] === 'SC') ? p.quantidadeUtilizada.toFixed(3) : p.quantidadeUtilizada}</b>) 
                - R$ {Number(p["Preço Venda"]).toFixed(2)} ({p['Und.Sai.']})
                <span className="total-item-price"> / Total: R$ {(Number(p["Preço Venda"]) * p.quantidadeUtilizada).toFixed(2)}</span>
                <span className="stock-info"> (Estoque: {p.Quantidade})</span>
              </li>
            ))}
          </ul>
          <div className="comb-row">
            <b>Total da Combinação: R$ {result.combinacao.reduce((acc: number, p: any) => acc + p["Preço Venda"] * p.quantidadeUtilizada, 0).toFixed(2)}</b>
            <div className="comb-actions">
              <button onClick={() => handleRetirarCombinacaoClick(result.combinacao!)}>
                Retirar Combinação
              </button>
              <AnimatedButton onClick={handleRecalculate} title="Buscar outra combinação" className="recalculate-btn">
                Recalcular
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}
      {!searching && result && result.status !== "ok" && (
        <div className="search-result">
          <p>Nenhum produto ou combinação encontrada.</p>
        </div>
      )}
    </div>
  );
};

export default SearchBar;