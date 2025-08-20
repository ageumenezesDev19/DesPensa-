import React, { useState, useEffect } from "react";
import ProductTable from "./components/ProductTable";
import WithdrawnTable, { Retirado } from "./components/WithdrawnTable";
import SearchBar from "./components/SearchBar";
import BlacklistManager from "./components/BlacklistManager";
import Loader from "./components/Loader";
import FileUpload from "./components/FileUpload";
import { Produto } from "./utils/estoque";
import { carregarDadosHtmlFromString, tratarDados, carregarRetiradosFromString, exportarRetiradosParaCsv } from "./utils/db_utils";
import { loadBlacklistFromString, saveBlacklistToString } from "./utils/blacklist_utils";
import { buscarProdutoProximo } from "./utils/busca";
import "./styles/main.scss";

const App: React.FC = () => {
  const [view, setView] = useState<"produtos" | "retirados" | "blacklist">("produtos");
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [retirados, setRetirados] = useState<Retirado[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [preco, setPreco] = useState<string>("");
  const [searchMode, setSearchMode] = useState<"produto" | "combinacao">("produto");
  const [maxProdutos, setMaxProdutos] = useState<number>(5);
  const [previouslyFound, setPreviouslyFound] = useState<Set<string>>(new Set());
  const [focusSearchInput, setFocusSearchInput] = useState<boolean>(false);

  useEffect(() => {
    const produtosStorage = localStorage.getItem("produtos");
    const retiradosStorage = localStorage.getItem("retirados");
    const blacklistStorage = localStorage.getItem("blacklist");
    if (produtosStorage) setProdutos(JSON.parse(produtosStorage));
    if (retiradosStorage) setRetirados(JSON.parse(retiradosStorage));
    if (blacklistStorage) setBlacklist(JSON.parse(blacklistStorage));
  }, []);

  useEffect(() => {
    localStorage.setItem("produtos", JSON.stringify(produtos));
  }, [produtos]);

  useEffect(() => {
    localStorage.setItem("retirados", JSON.stringify(retirados));
  }, [retirados]);

  useEffect(() => {
    localStorage.setItem("blacklist", JSON.stringify(blacklist));
  }, [blacklist]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1':
            setView('produtos');
            break;
          case '2':
            setView('retirados');
            break;
          case '3':
            setView('blacklist');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
  };

  const handleLoadProducts = (htmlContent: string) => {
    setLoading(true);
    try {
      const { df } = carregarDadosHtmlFromString(htmlContent);
      const dadosTratados = tratarDados(df);
      setProdutos(dadosTratados);
      showNotification("Produtos carregados com sucesso!");
    } catch (error) {
      console.error("Failed to load products:", error);
      showNotification("Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRetirados = (csvContent: string) => {
    setLoading(true);
    try {
      const retiradosData = carregarRetiradosFromString(csvContent);
      setRetirados(retiradosData);
      showNotification("Retirados carregados com sucesso!");
    } catch (error) {
      console.error("Failed to load withdrawn products:", error);
      showNotification("Erro ao carregar retirados.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadBlacklist = (textContent: string) => {
    setLoading(true);
    try {
      const blacklistItems = loadBlacklistFromString(textContent);
      setBlacklist(blacklistItems);
      showNotification("Blacklist carregada com sucesso!");
    } catch (error) {
      console.error("Failed to load blacklist:", error);
      showNotification("Erro ao carregar blacklist.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`${filename} foi baixado com sucesso!`);
  };

  const handleRetirar = (produtoParaRetirar: Produto) => {
    setLoading(true);
    setProdutos(prevProdutos => {
      const novosProdutos = prevProdutos
        .map(p =>
          p.Código === produtoParaRetirar.Código
            ? { ...p, Quantidade: p.Quantidade - 1 }
            : p
        )
        .filter(p => p.Quantidade > 0);
      return novosProdutos;
    });

    const hoje = new Date();
    const dataFormatada = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')} ${String(hoje.getHours()).padStart(2, '0')}:${String(hoje.getMinutes()).padStart(2, '0')}:${String(hoje.getSeconds()).padStart(2, '0')}`;

    const produtoRetirado: Retirado = {
      Código: produtoParaRetirar.Código,
      Descrição: produtoParaRetirar.Descrição,
      "Quantidade Retirada": "1",
      "Preço Venda": String(produtoParaRetirar["Preço Venda"]),
      Data: dataFormatada,
    };

    setRetirados(prevRetirados => [...prevRetirados, produtoRetirado]);
    setLoading(false);
    showNotification(`Produto ${produtoParaRetirar.Descrição} retirado do estoque.`);
    setFocusSearchInput(true);
    setPreco("");
    setSearchResult(null);
  };

  const [searching, setSearching] = useState(false);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

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
    setLoading(true);
    showNotification("Busca cancelada.");
    setTimeout(() => setLoading(false), 1500);
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

    setLoading(true);
    setSearching(true);
    setSearchCancelled(false);
    const precoDesejado = Number(preco.replace(',', '.'));

    await new Promise(resolve => setTimeout(resolve, 50));
    if (searchCancelled) {
      setLoading(false);
      setSearching(false);
      return;
    }

    if (searchMode === "produto") {
      const produtoEncontrado = buscarProdutoProximo(produtos, precoDesejado, blacklist);
      if (searchCancelled) {
        setLoading(false);
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

      let combinacao = await (await import("./utils/busca")).buscarCombinacaoGulosaAsync(
        produtosFiltrados,
        precoDesejado,
        0.4,
        new Set(),
        blacklist,
        5,
        () => searchCancelled
      );

      if (searchCancelled) {
        setLoading(false);
        setSearching(false);
        return;
      }

      if (!combinacao || combinacao.length === 0) {
        const worker = new Worker(new URL('./workers/combinationWorker.ts', import.meta.url), { type: 'module' });
        let workerResult: Produto[] | null = null;

        const workerPromise = new Promise<Produto[] | null>((resolve) => {
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
              usados: Array.from(new Set()),
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

        combinacao = workerResult;
      }

      if (searchCancelled) {
        setLoading(false);
        setSearching(false);
        return;
      }

      if (combinacao && combinacao.length > 0) {
        setSearchResult({ status: 'ok', combinacao: combinacao });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    }
    setLoading(false);
    setSearching(false);
  };

  const [showClearModal, setShowClearModal] = useState(false);

  const handleClearAll = () => {
    setProdutos([]);
    setRetirados([]);
    setBlacklist([]);
    localStorage.removeItem("produtos");
    localStorage.removeItem("retirados");
    localStorage.removeItem("blacklist");
    setShowClearModal(false);
    showNotification("Todos os dados foram apagados.");
  };

  const showGlobalCancel = searching && showCancel;

  return (
    <div className="app-container">
      {notification && (
        <div className="notification success">
          {notification}
        </div>
      )}
      {showClearModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Tem certeza?</h3>
            <p>Esta ação irá apagar <b>todos</b> os dados do app. Deseja continuar?</p>
            <div className="modal-actions">
              <button className="danger" onClick={handleClearAll}>Apagar Tudo</button>
              <button onClick={() => setShowClearModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {(loading && (!searching || showGlobalCancel)) && (
        <div className="loader-overlay">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="loader"></div>
            {showGlobalCancel && (
              <button className="cancel-btn loading-cancel" onClick={handleCancelSearch} type="button" style={{ marginTop: 32, minWidth: 180, fontSize: '1.1em', boxShadow: '0 2px 8px rgba(244,67,54,0.10)' }}>
                Cancelar Busca
              </button>
            )}
          </div>
        </div>
      )}
      <button
        className="clear-fab"
        title="Limpar todos os dados"
        onClick={() => setShowClearModal(true)}
      >
        🧹
      </button>
      <header>
        <h1>DesPensa</h1>
        <nav>
          <button onClick={() => setView("produtos")} className={view === 'produtos' ? 'active' : ''}>Estoque</button>
          <button onClick={() => setView("retirados")} className={view === 'retirados' ? 'active' : ''}>Retirados</button>
          <button onClick={() => setView("blacklist")} className={view === 'blacklist' ? 'active' : ''}>Blacklist</button>
        </nav>
      </header>
      <main>
        {loading && !searching && <Loader />}
        {view === "produtos" && (
          <>
            <SearchBar
              produtos={produtos}
              onRetirar={handleRetirar}
              result={searchResult}
              setResult={setSearchResult}
              preco={preco}
              setPreco={setPreco}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              handleSearch={() => handleSearch(false)}
              handleRecalculate={handleRecalculate}
              searching={searching && !showGlobalCancel}
              onCancelSearch={handleCancelSearch}
              showCancel={showCancel && !showGlobalCancel}
              showGlobalCancel={showGlobalCancel}
              maxProdutos={maxProdutos}
              setMaxProdutos={setMaxProdutos}
              focusInput={focusSearchInput}
              setFocusInput={setFocusSearchInput}
            />
            <div className="controls">
              <FileUpload
                setLoading={setLoading}
                onFileUpload={handleLoadProducts}
                label="Importar produtos.html"
                accept=".html"
              />
            </div>
            <ProductTable produtos={produtos} />
          </>
        )}
        {view === "retirados" && (
          <>
            <div className="controls">
              <FileUpload
                setLoading={setLoading}
                onFileUpload={handleLoadRetirados}
                label="Importar retirados.csv"
                accept=".csv"
              />
              <button onClick={() => handleDownload('retirados.csv', exportarRetiradosParaCsv(retirados, ['Código', 'Descrição', 'Quantidade Retirada', 'Preço Venda', 'Data']))} disabled={retirados.length === 0}>
                Salvar/Baixar Retirados
              </button>
            </div>
            <WithdrawnTable produtos={retirados} />
          </>
        )}
        {view === "blacklist" && (
          <>
            <div className="controls">
              <FileUpload
                setLoading={setLoading}
                onFileUpload={handleLoadBlacklist}
                label="Importar blacklist.txt"
                accept=".txt"
              />
              <button onClick={() => handleDownload('blacklist.txt', saveBlacklistToString(blacklist))} disabled={blacklist.length === 0}>
                Salvar/Baixar Blacklist
              </button>
            </div>
            <BlacklistManager
              blacklist={blacklist}
              setBlacklist={setBlacklist}
              showNotification={showNotification}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default App;