
import { useState, useEffect } from 'react';
import { Produto } from '../utils/estoque';
import { buscarProdutoProximo } from '../utils/busca';
import { ProdutoComQuantidade } from '../App';

export type SearchMode = 'combinacao' | 'produto_preco' | 'produto_nome';

interface SearchProps {
  produtos: Produto[];
  blacklist: string[];
  preco: string;
  searchMode: SearchMode;
  showNotification: (message: string) => void;
}

export const useSearch = ({ produtos, blacklist, preco, searchMode, showNotification }: SearchProps) => {
  const [searchResult, setSearchResult] = useState<{ status: string; produto?: Produto; combinacao?: ProdutoComQuantidade[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [previouslyFound, setPreviouslyFound] = useState<Set<string>>(new Set());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (searching) {
      setShowCancel(false);
      timer = setTimeout(() => setShowCancel(true), 10000);
    } else {
      setShowCancel(false);
    }
    return () => clearTimeout(timer);
  }, [searching]);

  const handleCancelSearch = () => {
    setSearchCancelled(true);
    setSearching(false);
    showNotification("Busca cancelada.");
  };

  const handleRecalculate = () => {
    if (!searchResult) return;

    const newPreviouslyFound = new Set(previouslyFound);

    if (searchResult.combinacao) {
      searchResult.combinacao.forEach((p: Produto) => newPreviouslyFound.add(p.Código));
    } else if (searchResult.produto) {
      newPreviouslyFound.add(searchResult.produto.Código);
    }

    setPreviouslyFound(newPreviouslyFound);
    handleSearch(true, newPreviouslyFound);
  };

  const handleSearch = async (isRecalculation = false, previouslyFoundSet: Set<string> | null = null) => {
    if (!preco) return;

    if (!isRecalculation) {
      setPreviouslyFound(new Set());
    }

    setSearching(true);
    setSearchCancelled(false);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    if (searchCancelled) {
      setSearching(false);
      return;
    }

    if (searchMode === 'produto_nome' || searchMode === 'produto_preco') {
      let produtoEncontrado: Produto | undefined;
      if (searchMode === 'produto_nome') {
        const searchTerm = preco.toLowerCase();
                produtoEncontrado = produtos.find(p => {
          const isBlacklisted = blacklist.some((term: string) => p.Descrição.toLowerCase().includes(term.toLowerCase()) || p.Código.toLowerCase().includes(term.toLowerCase()));
          return p.Descrição.toLowerCase().includes(searchTerm) && !isBlacklisted;
        });
      } else { // produto_preco
        const precoDesejado = Number(preco.replace(',', '.'));
        produtoEncontrado = buscarProdutoProximo(produtos, precoDesejado, blacklist);
      }

      if (searchCancelled) {
        setSearching(false);
        return;
      }
      if (produtoEncontrado) {
        setSearchResult({ status: 'ok', produto: produtoEncontrado });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    } else { // searchMode === 'combinacao'
      const precoDesejado = Number(preco.replace(',', '.'));
      if (isNaN(precoDesejado)) {
        showNotification("Preço inválido para busca de combinação.");
        setSearching(false);
        return;
      }

      const currentPreviouslyFound = previouslyFoundSet || previouslyFound;

      // Fast path: try exact-price match (in cents) before starting worker
      const precoCents = Math.round(precoDesejado * 100);
      const exactMatch = produtos.find(p => {
        try {
          return !currentPreviouslyFound.has(p.Código) && p.Quantidade >= 0.001 && Math.round((p['Preço Venda'] ?? 0) * 100) === precoCents && !blacklist.some(term => p.Descrição.toLowerCase().includes(term.toLowerCase()));
        } catch (_) { return false; }
      });
      if (exactMatch) {
        setSearchResult({ status: 'ok', produto: exactMatch });
        setSearching(false);
        return;
      }

      // Heuristic candidate filtering to keep worker input small and fast:
      // - exclude previously found and blacklisted
      // - require in-stock
      // - keep products with unit price <= target price
      // - sort by price desc and limit to top N candidates
      const MAX_CANDIDATES = 300;
      const produtosCandidatos = produtos
        .filter(p => !currentPreviouslyFound.has(p.Código) && p.Quantidade >= 0.001)
        .filter(p => !blacklist.some(term => p.Descrição.toLowerCase().includes(term.toLowerCase()) || p.Código.toLowerCase().includes(term.toLowerCase())))
        .filter(p => (p['Preço Venda'] ?? 0) > 0 && (p['Preço Venda'] ?? 0) <= precoDesejado)
        .sort((a, b) => (b['Preço Venda'] ?? 0) - (a['Preço Venda'] ?? 0))
        .slice(0, MAX_CANDIDATES);

      const produtosFiltrados = produtosCandidatos;

      const worker = new Worker(new URL('../workers/combinationWorker.ts', import.meta.url), { type: 'module' });
      let workerResult: ProdutoComQuantidade[] | null = null;

      const workerPromise = new Promise<ProdutoComQuantidade[] | null>((resolve) => {
        worker.onmessage = (event) => {
          const { type, result, error } = event.data;
          if (type === 'result') {
            resolve(result);
          } else if (type === 'cancelled') {
            resolve(null);
          } else if (type === 'error') {
            console.error("Worker error:", error);
            resolve(null);
          }
        };

        worker.postMessage({
          type: 'startSearch',
          payload: {
            df: produtosFiltrados,
            precoDesejado,
            tolerancia: 0.4,
            usados: Array.from(currentPreviouslyFound),
            blacklist,
          },
        });
      });

      const cancellationCheckInterval = setInterval(() => {
        if (searchCancelled) {
          worker.postMessage({ type: 'cancel' });
          clearInterval(cancellationCheckInterval);
        }
      }, 100);

      workerResult = await workerPromise;
      clearInterval(cancellationCheckInterval);
      worker.terminate();

      if (searchCancelled) {
        setSearching(false);
        return;
      }

      if (workerResult && workerResult.length > 0) {
        const finalResult = workerResult.filter(p => p.quantidadeUtilizada >= 0.001);
        if (finalResult.length > 0) {
          setSearchResult({ status: 'ok', combinacao: finalResult });
        } else {
          setSearchResult({ status: 'not_found' });
        }
      } else {
        setSearchResult({ status: 'not_found' });
      }
    }
    setSearching(false);
  };

  return {
    searchResult,
    setSearchResult,
    searching,
    showCancel,
    handleCancelSearch,
    handleRecalculate,
    handleSearch,
  };
};
