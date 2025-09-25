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
  
  const produtosFiltrados = df.filter(p => 
    p['Preço Venda'] > 0 && 
    p['Quantidade'] > 0 &&
    !usados.has(p['Código']) &&
    !blacklist.some(termo => p['Descrição'].toLowerCase().includes(termo.toLowerCase()))
  );

  const produtosUnidade = produtosFiltrados.filter(p => p['Und.Sai.'] !== 'KG');
  const produtosKg = produtosFiltrados.filter(p => p['Und.Sai.'] === 'KG');

  const precoDesejadoCents = Math.round(precoDesejado * 100);
  const toleranciaCents = Math.round(tolerancia * 100);
  const limiteMaxPreco = precoDesejadoCents + toleranciaCents;

  const dp = new Array(limiteMaxPreco + 1).fill(0);
  const backtrack = new Array(limiteMaxPreco + 1).fill(null);

  for (const produto of produtosUnidade) {
    if (isCancelled && isCancelled()) return null;

    const precoProdutoCents = Math.round(produto['Preço Venda'] * 100);

    for (let j = limiteMaxPreco; j >= precoProdutoCents; j--) {
      for (let k = 1; k <= produto['Quantidade']; k++) {
        const custoTotalProduto = precoProdutoCents * k;
        if (j >= custoTotalProduto) {
          const valorAnterior = dp[j - custoTotalProduto];
          const novoValor = valorAnterior + custoTotalProduto;
          
          if (novoValor > dp[j]) {
            dp[j] = novoValor;
            backtrack[j] = { produto, quantidade: k };
          }
        } else {
          break;
        }
      }
    }
  }

  let melhorPrecoCents = 0;
  let menorDiferenca = Infinity;

  for (let j = precoDesejadoCents; j <= limiteMaxPreco; j++) {
    if (dp[j] > 0) {
      const diferenca = Math.abs(j - precoDesejadoCents);
      if (diferenca < menorDiferenca) {
        menorDiferenca = diferenca;
        melhorPrecoCents = j;
      }
    }
  }

  let combinacao: ProdutoComQuantidade[] = [];
  if (melhorPrecoCents > 0) {
    let precoAtual = melhorPrecoCents;
    while (precoAtual > 0 && backtrack[precoAtual]) {
      const { produto, quantidade } = backtrack[precoAtual];
      combinacao.push({ ...produto, quantidadeUtilizada: quantidade });
      precoAtual -= Math.round(produto['Preço Venda'] * 100) * quantidade;
    }
  }

  const precoCombinacaoAtualCents = combinacao.reduce((acc, p) => acc + Math.round(p['Preço Venda'] * 100) * p.quantidadeUtilizada, 0);
  const diferencaRestanteCents = precoDesejadoCents - precoCombinacaoAtualCents;

  if (diferencaRestanteCents >= 10 && produtosKg.length > 0 && combinacao.length < maxProdutos) { // Only top-off if difference is 10 cents or more
    produtosKg.sort((a, b) => a['Preço Venda'] - b['Preço Venda']);
    const produtoKgParaTopOff = produtosKg[0];

    if (produtoKgParaTopOff) {
      const precoProdutoKgCents = Math.round(produtoKgParaTopOff['Preço Venda'] * 100);
      if (precoProdutoKgCents > 0) {
        const quantidadeNecessaria = diferencaRestanteCents / precoProdutoKgCents;

        if (quantidadeNecessaria > 0 && quantidadeNecessaria <= produtoKgParaTopOff.Quantidade) {
          combinacao.push({ ...produtoKgParaTopOff, quantidadeUtilizada: Number(quantidadeNecessaria.toFixed(3)) });
        }
      }
    }
  }

  if (combinacao.length === 0) {
    return null;
  }

  // Group combination
  const grouped = new Map<string, { produto: Produto, quantidade: number }>();
  for (const p of combinacao) {
    const existing = grouped.get(p.Código);
    if (existing) {
      existing.quantidade += p.quantidadeUtilizada;
    } else {
      grouped.set(p.Código, { produto: p, quantidade: p.quantidadeUtilizada });
    }
  }

  const finalCombination: ProdutoComQuantidade[] = [];
  for (const [_, value] of grouped.entries()) {
    finalCombination.push({ ...value.produto, quantidadeUtilizada: value.quantidade });
  }

  return finalCombination;
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