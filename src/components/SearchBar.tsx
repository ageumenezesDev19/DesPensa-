import React, { useEffect, useRef } from "react";
import { Produto } from "../utils/estoque";
import AnimatedButton from "./AnimatedButton";
import "../styles/SearchBar.scss";
import { ProdutoComQuantidade } from "../context/EstoqueContext";
import { SearchMode } from "../hooks/useSearch";
import { useEstoqueContext } from "../context/EstoqueContext";

const SearchBar: React.FC = () => {
  const {
    produtos,
    handleRetirarSingleProduct: onRetirar,
    handleRetirarCombinacao: onRetirarCombinacao,
    searchResult: result,
    setSearchResult: setResult,
    preco,
    setPreco,
    searchMode,
    setSearchMode,
    handleSearch,
    handleRecalculate,
    searching,
    handleCancelSearch: onCancelSearch,
    showCancel,
    focusSearchInput: focusInput,
    setFocusSearchInput: setFocusInput
  } = useEstoqueContext();

  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);


  useEffect(() => {
    if (focusInput && inputRef.current) {
      inputRef.current.focus();
      setFocusInput?.(false);
    }
  }, [focusInput, setFocusInput]);

  const handleCopy = async (product: any, index: number) => {
    const isFractional = product.quantidadeUtilizada % 1 !== 0;
    const includeQuantity = isFractional || product.quantidadeUtilizada > 1;
    let quantityStr = '';
    if (includeQuantity) {
      if (isFractional) {
        quantityStr = product.quantidadeUtilizada.toFixed(3).replace('.', ',');
      } else {
        quantityStr = product.quantidadeUtilizada.toString();
      }
    }
    const textToCopy = includeQuantity ? `${quantityStr}*${product.Descrição}` : product.Descrição;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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
        handleSearch(false);
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
        <button onClick={() => handleSearch(false)} disabled={produtos.length === 0 || !preco || !!searching}>
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
                <span className="product-name">
                  <span>{p.Descrição}</span>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(p, i)}
                    title="Copiar nome do produto"
                    tabIndex={0}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="8" y="2" width="8" height="6" rx="1" ry="1" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                  {copiedIndex === i && <span className="copied-feedback">Copiado!</span>}
                </span>
                (<b>x{(p['Und.Sai.'] === 'KG' || p['Und.Sai.'] === 'SC') ? p.quantidadeUtilizada.toFixed(3) : p.quantidadeUtilizada}</b>) 
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