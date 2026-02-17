import React, { createContext, useContext, useState, ReactNode } from "react";
import { Produto } from "../utils/estoque";
import { Retirado } from "../components/WithdrawnTable";
import { useNotification } from "../hooks/useNotification";
import { useEstoque } from "../hooks/useEstoque";
import { useViewManager } from "../hooks/useViewManager";
import { useFileHandlers } from "../hooks/useFileHandlers";
import { useSearch, SearchMode } from "../hooks/useSearch";
import { formatDateForDB } from "../utils/date";
import { ImportMode } from "../components/FileUpload";

export interface ProdutoComQuantidade extends Produto {
  quantidadeUtilizada: number;
}

interface EstoqueContextType {
  // State
  produtos: Produto[];
  retirados: Retirado[];
  blacklist: string[];
  loading: boolean;
  notification: string | null;
  view: string;
  
  // Search State
  searchResult: { status: string; produto?: Produto; combinacao?: ProdutoComQuantidade[] } | null;
  searching: boolean;
  showCancel: boolean;
  preco: string;
  searchMode: SearchMode;
  focusSearchInput: boolean;
  
  // Setters
  setProdutos: React.Dispatch<React.SetStateAction<Produto[]>>;
  setRetirados: React.Dispatch<React.SetStateAction<Retirado[]>>;
  setBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
  setLoading: (loading: boolean) => void;
  setView: (view: any) => void;
  setSearchResult: (result: any) => void;
  setPreco: (preco: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setFocusSearchInput: (focus: boolean) => void;

  // Actions
  handleLoadProducts: (htmlContent: string, mode: ImportMode) => void;
  handleLoadRetirados: (csvContent: string) => void;
  handleLoadBlacklist: (textContent: string) => void;
  handleDownload: (filename: string, content: string) => void;
  handleRetirarSingleProduct: (produto: Produto) => void;
  handleRetirarCombinacao: (combinacao: ProdutoComQuantidade[]) => void;
  handleDeleteRetirado: (id: string) => void;
  handleClearData: (type: "produtos" | "retirados" | "all") => void;
  handleSearch: (isRecalculation?: boolean) => void;
  handleRecalculate: () => void;
  handleCancelSearch: () => void;
  showNotification: (message: string) => void;
}

const EstoqueContext = createContext<EstoqueContextType | undefined>(undefined);

export const useEstoqueContext = () => {
  const context = useContext(EstoqueContext);
  if (!context) {
    throw new Error("useEstoqueContext must be used within an EstoqueProvider");
  }
  return context;
};

export const EstoqueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [preco, setPreco] = useState<string>("");
  const [searchMode, setSearchMode] = useState<SearchMode>("combinacao");
  const [focusSearchInput, setFocusSearchInput] = useState<boolean>(true);

  const { notification, showNotification } = useNotification();
  const { produtos, setProdutos, retirados, setRetirados, blacklist, setBlacklist } = useEstoque();
  const { view, setView } = useViewManager("produtos");

  const {
    handleLoadProducts, handleLoadRetirados, handleLoadBlacklist, handleDownload
  } = useFileHandlers({
    setLoading,
    setProdutos,
    produtos,
    setRetirados,
    setBlacklist,
    showNotification,
  });

  const {
    searchResult,
    setSearchResult,
    searching,
    showCancel,
    handleCancelSearch,
    handleRecalculate,
    handleSearch
  } = useSearch({
    produtos,
    blacklist,
    preco,
    searchMode,
    showNotification,
  });

  const handleRetirar = (produtoParaRetirar: Produto, quantidade: number = 1) => {
    setProdutos(prevProdutos => {
      const novosProdutos = prevProdutos
        .map(p =>
          p.Código === produtoParaRetirar.Código
            ? { ...p, Quantidade: p.Quantidade - quantidade }
            : p
        )
        .filter(p => p.Quantidade > 0);
      return novosProdutos;
    });

    const dataFormatada = formatDateForDB(new Date());

    const produtoRetirado: Retirado = {
      id: `${produtoParaRetirar.Código}-${Date.now()}`,
      produto: produtoParaRetirar,
      quantidadeRetirada: quantidade,
      Data: dataFormatada,
    };

    setRetirados(prevRetirados => [...prevRetirados, produtoRetirado]);
  };

  const handleRetirarSingleProduct = (produto: Produto) => {
    setLoading(true);
    handleRetirar(produto, 1);
    setLoading(false);
    showNotification(`Produto ${produto.Descrição} retirado do estoque.`);
    setFocusSearchInput(true);
    setPreco("");
    setSearchResult(null);
  };

  const handleRetirarCombinacao = (combinacao: ProdutoComQuantidade[]) => {
    setLoading(true);

    const produtosRetiradosMap = new Map<string, number>();
    combinacao.forEach(p => {
      produtosRetiradosMap.set(p.Código, (produtosRetiradosMap.get(p.Código) || 0) + p.quantidadeUtilizada);
    });

    setProdutos(prevProdutos => {
      return prevProdutos
        .map(p => {
          if (produtosRetiradosMap.has(p.Código)) {
            return { ...p, Quantidade: p.Quantidade - produtosRetiradosMap.get(p.Código)! };
          }
          return p;
        })
        .filter(p => p.Quantidade > 0);
    });

    const hoje = new Date();
    const dataFormatada = formatDateForDB(hoje);
    const novosRetirados: Retirado[] = combinacao.map(p => ({
      id: `${p.Código}-${Date.now()}`,
      produto: p,
      quantidadeRetirada: p.quantidadeUtilizada,
      Data: dataFormatada,
    }));

    setRetirados(prevRetirados => [...prevRetirados, ...novosRetirados]);

    const totalItems = combinacao.reduce((acc, p) => acc + p.quantidadeUtilizada, 0);

    setLoading(false);
    showNotification(`${totalItems} itens retirados do estoque.`);
    setFocusSearchInput(true);
    setPreco("");
    setSearchResult(null);
  };

  const handleDeleteRetirado = (id: string) => {
    const retiradoParaRestaurar = retirados.find(r => r.id === id);
    if (!retiradoParaRestaurar) return;

    setProdutos(prevProdutos => {
      const produtoExistente = prevProdutos.find(p => p.Código === retiradoParaRestaurar.produto.Código);
      if (produtoExistente) {
        return prevProdutos.map(p => 
          p.Código === retiradoParaRestaurar.produto.Código 
            ? { ...p, Quantidade: p.Quantidade + retiradoParaRestaurar.quantidadeRetirada } 
            : p
        );
      } else {
        return [...prevProdutos, { ...retiradoParaRestaurar.produto, Quantidade: retiradoParaRestaurar.quantidadeRetirada }];
      }
    });

    setRetirados(prevRetirados => prevRetirados.filter(r => r.id !== id));
    showNotification("Item retornado ao estoque.");
  };

  const handleClearData = (type: "produtos" | "retirados" | "all") => {
    if (type === "produtos" || type === "all") {
      setProdutos([]);
    }
    if (type === "retirados" || type === "all") {
      setRetirados([]);
    }
    if (type === "all") {
      setBlacklist([]);
    }
    const message = {
      produtos: "Dados do estoque apagados.",
      retirados: "Dados de retirados apagados.",
      all: "Todos os dados foram apagados."
    };
    showNotification(message[type]);
  };

  const value = {
    produtos,
    retirados,
    blacklist,
    loading,
    notification,
    view,
    searchResult,
    searching,
    showCancel,
    preco,
    searchMode,
    focusSearchInput,
    setProdutos,
    setRetirados,
    setBlacklist,
    setLoading,
    setView,
    setSearchResult,
    setPreco,
    setSearchMode,
    setFocusSearchInput,
    handleLoadProducts,
    handleLoadRetirados,
    handleLoadBlacklist,
    handleDownload,
    handleRetirarSingleProduct,
    handleRetirarCombinacao,
    handleDeleteRetirado,
    handleClearData,
    handleSearch,
    handleRecalculate,
    handleCancelSearch,
    showNotification
  };

  return (
    <EstoqueContext.Provider value={value}>
      {children}
    </EstoqueContext.Provider>
  );
};
