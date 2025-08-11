type Produto = Record<string, any>;

// Versão assíncrona exaustiva, adaptada para Web Worker
async function buscarCombinacaoExaustivaAsync(
  df: Produto[],
  precoDesejado: number,
  tolerancia = 0.4,
  maxProdutos = 5,
  usados = new Set<string>(),
  blacklist: string[] = [],
  isCancelled?: () => boolean
): Promise<Produto[] | null> {
  let filtrados = df.filter(p => p['Margem Lucro'] > 0 && p['Quantidade'] >= 1);
  for (const termo of blacklist) {
    filtrados = filtrados.filter(p => !p['Descrição'].toLowerCase().includes(termo.toLowerCase()));
  }
  filtrados = filtrados.filter(p => !usados.has(p['Código']));
  const produtos = filtrados;

  // Dynamic Programming approach for Subset Sum
  // Work with cents to avoid floating point issues and scale the target sum
  const precoDesejadoCents = Math.round(precoDesejado * 100);
  const toleranciaCents = Math.round(tolerancia * 100);
  const maxPossibleSumCents = precoDesejadoCents + toleranciaCents;

  // dp[i] will store the combination that sums up to i, or null if not reachable
  const dp: (Produto[] | null)[] = new Array(maxPossibleSumCents + 1).fill(null);
  dp[0] = []; // Base case: sum 0 can be formed with an empty set of products

  let bestCombination: Produto[] | null = null;
  let bestDiff = Infinity;

  for (let i = 0; i < produtos.length; i++) {
    if (isCancelled && isCancelled()) return null;
    const produto = produtos[i];
    const precoProdutoCents = Math.round(produto['Preço Venda'] * 100);

    // Iterate backwards to avoid using the same product multiple times in one combination
    for (let j = maxPossibleSumCents; j >= precoProdutoCents; j--) {
      if (dp[j - precoProdutoCents] !== null) {
        const prevCombination = dp[j - precoProdutoCents] as Produto[]; // Assert as Produto[]
        const currentCombination = [...prevCombination, produto];

        if (currentCombination.length <= maxProdutos) {
          // If we haven't found a combination for this sum yet, or if this new combination is better
          // (e.g., closer to the target, or simply the first one found)
          if (dp[j] === null) {
            dp[j] = currentCombination;
          }

          const currentSumCents = j;
          const diffCents = Math.abs(currentSumCents - precoDesejadoCents);

          if (diffCents <= toleranciaCents && diffCents < bestDiff) {
            bestCombination = currentCombination;
            bestDiff = diffCents;
            if (bestDiff === 0) return bestCombination; // Found exact match, can stop early
          }
        }
      }
    }
    if (i % 100 === 0) { // Yield control to UI periodically
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return bestCombination;
}

// Listener para mensagens da thread principal
self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'startSearch') {
    const { df, precoDesejado, tolerancia, maxProdutos, usados, blacklist } = payload;
    let cancelled = false;
    const isCancelled = () => cancelled;

    // Adiciona um listener para mensagens de cancelamento
    const cancelListener = (cancelEvent: MessageEvent) => {
      if (cancelEvent.data.type === 'cancel') {
        cancelled = true;
        self.removeEventListener('message', cancelListener); // Remove o listener após o cancelamento
      }
    };
    self.addEventListener('message', cancelListener);

    try {
      const result = await buscarCombinacaoExaustivaAsync(
        df,
        precoDesejado,
        tolerancia,
        maxProdutos,
        new Set(usados), // Reconstroi Set pois ele não é serializável diretamente
        blacklist,
        isCancelled
      );
      if (!cancelled) {
        self.postMessage({ type: 'result', result });
      }
    } catch (error) {
      self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
    } finally {
      self.removeEventListener('message', cancelListener); // Garante que o listener seja removido
    }
  }
};
