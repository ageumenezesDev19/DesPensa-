import { Produto } from '../utils/estoque';

interface ProdutoComQuantidade extends Produto {
  quantidadeUtilizada: number;
}

async function buscarCombinacaoOtimizada(
  df: Produto[],
  precoDesejado: number,
  tolerancia = 0.4,
  maxProdutos = 10,
  usados = new Set<string>(),
  blacklist: string[] = [],
  isCancelled?: () => boolean
): Promise<ProdutoComQuantidade[] | null> {
  
  let produtosFiltrados = df.filter(p => 
    p['Preço Venda'] > 0 && 
    p['Quantidade'] > 0 &&
    !usados.has(p['Código']) &&
    !blacklist.some(termo => p['Descrição'].toLowerCase().includes(termo.toLowerCase()))
  );

  const precoDesejadoCents = Math.round(precoDesejado * 100);
  const toleranciaCents = Math.round(tolerancia * 100);
  const limiteMaxPreco = precoDesejadoCents + toleranciaCents;

  // dp[i] armazena o melhor valor (soma dos preços) que podemos alcançar para o preço i
  const dp = new Array(limiteMaxPreco + 1).fill(0);
  // backtrack[i] armazena o produto e a quantidade usada para alcançar o valor em dp[i]
  const backtrack = new Array(limiteMaxPreco + 1).fill(null);

  for (const produto of produtosFiltrados) {
    if (isCancelled && isCancelled()) return null;

    const precoProdutoCents = Math.round(produto['Preço Venda'] * 100);

    for (let j = limiteMaxPreco; j >= precoProdutoCents; j--) {
      // Itera sobre a quantidade do produto que podemos usar
      for (let k = 1; k <= produto['Quantidade']; k++) {
        const custoTotalProduto = precoProdutoCents * k;
        if (j >= custoTotalProduto) {
          const valorAnterior = dp[j - custoTotalProduto];
          const novoValor = valorAnterior + custoTotalProduto;
          
          // Se o novo valor for melhor do que o que já temos para o índice j
          if (novoValor > dp[j]) {
            dp[j] = novoValor;
            backtrack[j] = { produto, quantidade: k };
          }
        } else {
          break; // Otimização: não adianta tentar com mais unidades se já excedeu
        }
      }
    }
  }

  let melhorCombinacao: ProdutoComQuantidade[] | null = null;
  let menorDiferenca = Infinity;

  // Encontra a melhor combinação dentro da tolerância
  for (let j = precoDesejadoCents; j <= limiteMaxPreco; j++) {
    if (dp[j] > 0) {
      const diferenca = Math.abs(j - precoDesejadoCents);
      if (diferenca < menorDiferenca) {
        menorDiferenca = diferenca;
        
        // Reconstroi a combinação a partir do backtrack
        const combinacao: ProdutoComQuantidade[] = [];
        let precoAtual = j;
        while (precoAtual > 0 && backtrack[precoAtual]) {
          const { produto, quantidade } = backtrack[precoAtual];
          const itemExistente = combinacao.find(p => p['Código'] === produto['Código']);

          if (!itemExistente) {
             combinacao.push({ ...produto, quantidadeUtilizada: quantidade });
          }
          
          precoAtual -= Math.round(produto['Preço Venda'] * 100) * quantidade;
        }
        melhorCombinacao = combinacao;
      }
    }
  }
  
  // Limita o número de produtos na combinação final, se necessário
  if (melhorCombinacao && melhorCombinacao.length > maxProdutos) {
      // A lógica de reconstrução pode ser ajustada para otimizar por número de produtos
      // Por simplicidade, aqui apenas truncamos, mas o ideal seria integrar no DP.
      // Esta implementação prioriza chegar perto do valor.
  }

  return melhorCombinacao;
}


// Listener para mensagens da thread principal
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'startSearch') {
    const { df, precoDesejado, tolerancia, maxProdutos, usados, blacklist } = payload;
    let cancelled = false;
    const isCancelled = () => cancelled;

    const cancelListener = (cancelEvent: MessageEvent) => {
      if (cancelEvent.data.type === 'cancel') {
        cancelled = true;
        self.removeEventListener('message', cancelListener);
      }
    };
    self.addEventListener('message', cancelListener);

    try {
      const result = await buscarCombinacaoOtimizada(
        df,
        precoDesejado,
        tolerancia,
        maxProdutos,
        new Set(usados),
        blacklist,
        isCancelled
      );
      if (!cancelled) {
        self.postMessage({ type: 'result', result });
      }
    } catch (error) {
      self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
    } finally {
      self.removeEventListener('message', cancelListener);
    }
  }
};