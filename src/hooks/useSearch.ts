
import { useState, useEffect } from 'react';
import { Produto } from '../utils/estoque';
import { buscarProdutoProximo } from '../utils/busca';
import { ProdutoComQuantidade } from '../App';

interface SearchProps {
  produtos: Produto[];
  blacklist: string[];
  preco: string;
  searchMode: 'produto' | 'combinacao';
  maxProdutos: number;
  showNotification: (message: string) => void;
}

export const useSearch = ({ produtos, blacklist, preco, searchMode, maxProdutos, showNotification }: SearchProps) => {
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
    setSearchResult(null);
    handleSearch(true, newPreviouslyFound);
  };

  const handleSearch = async (isRecalculation = false, previouslyFoundSet: Set<string> | null = null) => {
    if (!preco) return;

    if (!isRecalculation) {
      setPreviouslyFound(new Set());
    }

    setSearching(true);
    setSearchCancelled(false);
    const precoDesejado = Number(preco.replace(',', '.'));

    await new Promise(resolve => setTimeout(resolve, 50));
    if (searchCancelled) {
      setSearching(false);
      return;
    }

    if (searchMode === "produto") {
      const produtoEncontrado = buscarProdutoProximo(produtos, precoDesejado, blacklist);
      if (searchCancelled) {
        setSearching(false);
        return;
      }
      if (produtoEncontrado) {
        setSearchResult({ status: 'ok', produto: produtoEncontrado });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    } else {
      const currentPreviouslyFound = previouslyFoundSet || previouslyFound;
      const produtosFiltrados = produtos.filter(p => !currentPreviouslyFound.has(p.Código));

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
            maxProdutos,
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
        setSearchResult({ status: 'ok', combinacao: workerResult });
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
