import {
  tratarDados,
  carregarDadosHtmlFromString,
  carregarRetiradosFromString
} from '../utils/db_utils';

import { loadBlacklistFromString } from '../utils/blacklist_utils';
import { Produto } from '../utils/estoque';
import { Retirado } from '../components/WithdrawnTable';

interface FileHandlerProps {
  setLoading: (loading: boolean) => void;
  setProdutos: (produtos: Produto[]) => void;
  produtos: Produto[];
  setRetirados: (retirados: Retirado[]) => void;
  setBlacklist: (blacklist: string[]) => void;
  showNotification: (message: string) => void;
}

export const useFileHandlers = ({
  setLoading,
  setProdutos,
  produtos,
  setRetirados,
  setBlacklist,
  showNotification,
}: FileHandlerProps) => {

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
      const novosRetirados = retiradosData.map((r: any) => {
        const produtoCompleto = produtos.find(p => p.Código === r.Código);
        const produtoParaRetirado: Produto = produtoCompleto || {
          'Código': r.Código,
          'Descrição': r.Descrição,
          'Preço Venda': Number(r['Preço Venda']),
          // Preencha outros campos obrigatórios da interface Produto com valores padrão
          'Cód.Barras': '',
          'Und.Sai.': '',
          'Fornecedor': '',
          'Quantidade': 0,
          'Preço Custo': 0,
          'Margem Lucro': 0,
          'CSOSN': '',
          'ELO': '',
        };

        return {
          id: r.id || `${r.Código}-${Date.now()}`,
          produto: produtoParaRetirado,
          quantidadeRetirada: Number(r['Quantidade Retirada']),
          Data: r.Data,
        };
      });
      setRetirados(novosRetirados);
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
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotification(`${filename} foi salvo com sucesso!`);
    } catch (error) {
      console.error("Erro ao salvar o arquivo:", error);
      showNotification("Ocorreu um erro ao salvar o arquivo.");
    }
  };

  return { handleLoadProducts, handleLoadRetirados, handleLoadBlacklist, handleDownload };
};
