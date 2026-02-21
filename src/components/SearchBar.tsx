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
  const [combPage, setCombPage] = React.useState<number>(1);
  const COMB_ITEMS_PER_PAGE = 4;

  React.useEffect(() => {
    setCombPage(1);
  }, [result]);


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
        if ((searchMode === 'produto_preco' || searchMode === 'produto_nome') && result.produtos && result.produtos.length > 0) {
          handleRetirarClick(result.produtos[0]);
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
          <option value="produto_preco">Buscar Unidade por Preço</option>
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

      {!searching && result && result.status === "ok" && (searchMode === 'produto_preco' || searchMode === 'produto_nome') && result.produtos && result.produtos.length > 0 && (
        <div className="search-result-card animated-slideUp">
          <div className="result-header">
            <h4>{result.produtos.length > 1 ? `${result.produtos.length} Produtos Encontrados` : "Produto Encontrado"}</h4>
          </div>
          
          <ul className="result-list">
            {result.produtos.map((p: any, i: number) => (
              <li key={p.Código || i} className="result-item">
                <div className="item-info">
                  <span className="item-name">
                    {p.Descrição}
                  </span>
                  <div className="item-details">
                    <span className="item-price">
                      Preço: <b>R$ {Number(p["Preço Venda"]).toFixed(2)}</b>
                    </span>
                    <span className="item-stock">
                      Estoque: {p.Quantidade} {p.Und}
                    </span>
                  </div>
                </div>
                
                <div className="item-actions">
                  <button 
                    className="primary-btn small-btn" 
                    onClick={() => handleRetirarClick(p)}
                    title="Retirar 1 unidade do estoque"
                    style={{ marginRight: '8px' }}
                  >
                    Retirar 1
                  </button>
                   <button
                    className={`icon-action-btn copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                    onClick={() => handleCopy(p, i)}
                    title="Copiar nome do produto"
                  >
                    {copiedIndex === i ? (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="result-actions">
            <AnimatedButton onClick={handleRecalculate} title="Buscar novamente" className="secondary-btn">
              Recalcular
            </AnimatedButton>
          </div>
        </div>
      )}
      {!searching && result && result.status === "ok" && searchMode === "combinacao" && result.combinacao && (
        <div className="search-result-card">
          <div className="result-header">
            <h4>Combinação Encontrada</h4>
            <span className="total-price">
              Total: <strong>R$ {result.combinacao.reduce((acc: number, p: any) => acc + p["Preço Venda"] * p.quantidadeUtilizada, 0).toFixed(2)}</strong>
            </span>
          </div>
          
          <ul className="result-list">
            {result.combinacao
              .slice((combPage - 1) * COMB_ITEMS_PER_PAGE, combPage * COMB_ITEMS_PER_PAGE)
              .map((p: any, i: number) => (
              <li key={i} className="result-item">
                <div className="item-info">
                  <span className="item-name">
                    {p.Descrição}
                  </span>
                  <div className="item-details">
                    <span className="item-quantity">
                      Retirar: {(p['Und.Sai.'] === 'KG' || p['Und.Sai.'] === 'SC') ? p.quantidadeUtilizada.toFixed(3) : p.quantidadeUtilizada} {p['Und.Sai.']} 
                      <span style={{ fontSize: '0.9em', color: '#666', marginLeft: '8px' }}>
                        (Estoque: {p.Quantidade})
                      </span>
                    </span>
                    <span className="item-price">
                      R$ {Number(p["Preço Venda"]).toFixed(2)}
                    </span>
                    <span className="item-total">
                      Subtotal: <b>R$ {(Number(p["Preço Venda"]) * p.quantidadeUtilizada).toFixed(2)}</b>
                    </span>
                  </div>
                </div>
                
                <div className="item-actions">
                   <button
                    className={`icon-action-btn copy-btn ${copiedIndex === i ? 'copied' : ''}`}
                    onClick={() => handleCopy(p, i)}
                    title="Copiar nome do produto"
                  >
                    {copiedIndex === i ? (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          
          {result.combinacao.length > COMB_ITEMS_PER_PAGE && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '1rem', marginBottom: '1rem' }}>
              <button 
                className="secondary-btn small-btn" 
                disabled={combPage === 1} 
                onClick={() => setCombPage(prev => prev - 1)}
                style={{ padding: '4px 12px', fontSize: '0.9em' }}
              >
                Anterior
              </button>
              <span style={{ alignSelf: 'center', fontWeight: 'bold', fontSize: '0.95em' }}>
                Página {combPage} de {Math.ceil(result.combinacao.length / COMB_ITEMS_PER_PAGE)}
              </span>
              <button 
                className="secondary-btn small-btn" 
                disabled={combPage === Math.ceil(result.combinacao.length / COMB_ITEMS_PER_PAGE)} 
                onClick={() => setCombPage(prev => prev + 1)}
                style={{ padding: '4px 12px', fontSize: '0.9em' }}
              >
                Próxima
              </button>
            </div>
          )}

          <div className="result-actions">
            <button className="primary-btn" onClick={() => handleRetirarCombinacaoClick(result.combinacao!)}>
              Retirar Combinação
            </button>
            <AnimatedButton onClick={handleRecalculate} title="Buscar outra combinação" className="secondary-btn">
              Recalcular
            </AnimatedButton>
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