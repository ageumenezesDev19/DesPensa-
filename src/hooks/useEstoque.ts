
import { useStorage } from './useStorage';
import { Produto } from '../utils/estoque';
import { Retirado } from '../components/WithdrawnTable';

export const useEstoque = () => {
  const [produtos, setProdutos] = useStorage<Produto[]>('produtos', []);
  const [retirados, setRetirados] = useStorage<Retirado[]>('retirados', []);
  const [blacklist, setBlacklist] = useStorage<string[]>('blacklist', []);

  return {
    produtos,
    setProdutos,
    retirados,
    setRetirados,
    blacklist,
    setBlacklist,
  };
};
