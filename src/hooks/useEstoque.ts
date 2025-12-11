
import { useStorage } from './useStorage';
import { Produto } from '../utils/estoque';
import { tratarDados } from '../utils/db_utils';
import { useEffect } from 'react';
import { Retirado } from '../components/WithdrawnTable';

export const useEstoque = () => {
  const [produtos, setProdutos] = useStorage<Produto[]>('produtos', []);
  const [retirados, setRetirados] = useStorage<Retirado[]>('retirados', []);
  const [blacklist, setBlacklist] = useStorage<string[]>('blacklist', []);

  // Normalize numeric fields if they were stored as strings (legacy or different environment)
  useEffect(() => {
    try {
      if (Array.isArray(produtos) && produtos.length > 0) {
        const first = produtos[0] as any;
        // Heuristic: if Preço Venda is a string, run tratarDados to coerce numbers
        if (typeof first['Preço Venda'] === 'string' || typeof first['Quantidade'] === 'string') {
          const normalized = tratarDados(produtos as any[]);
          setProdutos(normalized as Produto[]);
          console.log('[useEstoque] Produtos normalizados após carregar do storage');
        }
      }
    } catch (e) {
      console.error('[useEstoque] Erro ao normalizar produtos:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    produtos,
    setProdutos,
    retirados,
    setRetirados,
    blacklist,
    setBlacklist,
  };
};
