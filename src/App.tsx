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
import { buscarProdutoProximo, buscarCombinacaoGulosa, buscarCombinacaoExaustiva } from "./utils/busca";
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

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000); // Notification disappears after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
    const novosProdutos = produtos
      .map(p =>
        p.Código === produtoParaRetirar.Código
          ? { ...p, Quantidade: p.Quantidade - 1 }
          : p
      )
      .filter(p => p.Quantidade > 0);

    setProdutos(novosProdutos);

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
  };

  const handleSearch = () => {
    if (!preco) return;
    setLoading(true);
    const precoDesejado = Number(preco);

    if (searchMode === "produto") {
      const produtoEncontrado = buscarProdutoProximo(produtos, precoDesejado, blacklist);
      if (produtoEncontrado) {
        setSearchResult({ status: 'ok', produto: produtoEncontrado });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    } else {
      let combinacao = buscarCombinacaoGulosa(produtos, precoDesejado, 0.4, new Set(), blacklist);
      if (!combinacao || combinacao.length === 0) {
        combinacao = buscarCombinacaoExaustiva(produtos, precoDesejado, 0.4, 5, new Set(), blacklist);
      }

      if (combinacao && combinacao.length > 0) {
        setSearchResult({ status: 'ok', combinacao: combinacao });
      } else {
        setSearchResult({ status: 'not_found' });
      }
    }
    setLoading(false);
  };

  return (
    <div className="app-container">
      {notification && (
        <div className="notification success">
          {notification}
        </div>
      )}
      <header>
        <h1>DesPensa</h1>
        <nav>
          <button onClick={() => setView("produtos")} className={view === 'produtos' ? 'active' : ''}>Estoque</button>
          <button onClick={() => setView("retirados")} className={view === 'retirados' ? 'active' : ''}>Retirados</button>
          <button onClick={() => setView("blacklist")} className={view === 'blacklist' ? 'active' : ''}>Blacklist</button>
        </nav>
      </header>
      <main>
        {loading && <Loader />}
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
              handleSearch={handleSearch}
            />
            <FileUpload
              setLoading={setLoading}
              onFileUpload={handleLoadProducts}
              label="Importar produtos.html"
              accept=".html"
            />
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