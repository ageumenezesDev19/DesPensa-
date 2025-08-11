type Produto = Record<string, any>;

export function buscarProdutosProximos(df: Produto[], precoDesejado: number, n = 3): Produto[] | null {
  const filtrados = df.filter(p => p['Margem Lucro'] > 0 && p['Quantidade'] >= 1);
  if (filtrados.length === 0) return null;
  filtrados.forEach(p => p.Diferenca = Math.abs(p['Preço Venda'] - precoDesejado));
  return filtrados.sort((a, b) => a.Diferenca - b.Diferenca).slice(0, n);
}

export function buscarProdutoProximo(df: Produto[], precoDesejado: number, blacklist: string[] = []): Produto | null {
  let filtrados = df.filter(p => p['Margem Lucro'] > 0 && p['Quantidade'] >= 1);
  for (const termo of blacklist) {
    filtrados = filtrados.filter(p => !p['Descrição'].toLowerCase().includes(termo.toLowerCase()));
  }
  if (filtrados.length === 0) return null;
  filtrados.forEach(p => p.Diferenca = Math.abs(p['Preço Venda'] - precoDesejado));
  return filtrados.sort((a, b) => a.Diferenca - b.Diferenca)[0];
}

export function buscarCombinacaoGulosa(
  df: Produto[],
  precoDesejado: number,
  tolerancia = 0.4,
  usados = new Set<string>(),
  blacklist: string[] = [],
  maxProdutos = 5,
): Produto[] | null {
  let filtrados = df.filter(p => p['Margem Lucro'] > 0 && p['Quantidade'] >= 1);
  for (const termo of blacklist) {
    filtrados = filtrados.filter(p => !p['Descrição'].toLowerCase().includes(termo.toLowerCase()));
  }
  filtrados = filtrados.filter(p => !usados.has(p['Código']));
  filtrados = filtrados.sort(() => Math.random() - 0.5);

  const combinacao: Produto[] = [];
  let valorRestante = precoDesejado;

  for (let i = 0; i < maxProdutos; i++) {
    const candidatos = filtrados.filter(p => p['Preço Venda'] <= valorRestante + tolerancia);
    if (candidatos.length === 0) break;
    candidatos.forEach(p => p.Diferenca = Math.abs(p['Preço Venda'] - valorRestante));
    const produto = candidatos.sort((a, b) => a.Diferenca - b.Diferenca)[0];
    combinacao.push(produto);
    valorRestante -= produto['Preço Venda'];
    filtrados = filtrados.filter(p => p['Código'] !== produto['Código']);
    if (Math.abs(valorRestante) <= tolerancia) break;
  }

  const total = combinacao.reduce((sum, p) => sum + p['Preço Venda'], 0);
  if (Math.abs(precoDesejado - total) <= tolerancia && combinacao.length > 0) {
    return combinacao;
  }
  return null;
}

// Versão assíncrona gulosa
export async function buscarCombinacaoGulosaAsync(
  df: Produto[],
  precoDesejado: number,
  tolerancia = 0.4,
  usados = new Set<string>(),
  blacklist: string[] = [],
  maxProdutos = 5,
  isCancelled?: () => boolean
): Promise<Produto[] | null> {
  let filtrados = df.filter(p => p['Margem Lucro'] > 0 && p['Quantidade'] >= 1);
  for (const termo of blacklist) {
    filtrados = filtrados.filter(p => !p['Descrição'].toLowerCase().includes(termo.toLowerCase()));
  }
  filtrados = filtrados.filter(p => !usados.has(p['Código']));
  filtrados = filtrados.sort(() => Math.random() - 0.5);

  const combinacao: Produto[] = [];
  let valorRestante = precoDesejado;

  for (let i = 0; i < maxProdutos; i++) {
    if (isCancelled && isCancelled()) return null;
    const candidatos = filtrados.filter(p => p['Preço Venda'] <= valorRestante + tolerancia);
    if (candidatos.length === 0) break;
    candidatos.forEach(p => p.Diferenca = Math.abs(p['Preço Venda'] - valorRestante));
    const produto = candidatos.sort((a, b) => a.Diferenca - b.Diferenca)[0];
    combinacao.push(produto);
    valorRestante -= produto['Preço Venda'];
    filtrados = filtrados.filter(p => p['Código'] !== produto['Código']);
    if (Math.abs(valorRestante) <= tolerancia) break;
    await new Promise(resolve => setTimeout(resolve, 0)); // yield para UI
  }

  const total = combinacao.reduce((sum, p) => sum + p['Preço Venda'], 0);
  if (Math.abs(precoDesejado - total) <= tolerancia && combinacao.length > 0) {
    return combinacao;
  }
  return null;
}

