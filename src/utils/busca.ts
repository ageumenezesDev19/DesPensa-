import { Produto } from './estoque';

interface ProdutoComDiferenca extends Produto {
  Diferenca?: number;
}

export function buscarProdutosProximos(df: Produto[], precoDesejado: number, n = 3): Produto[] | null {
  const filtrados: ProdutoComDiferenca[] = df.map(p => ({ ...p })).filter(p => p['Margem Lucro'] > 0 && p['Quantidade'] >= 1);
  if (filtrados.length === 0) return null;
  filtrados.forEach(p => p.Diferenca = Math.abs(p['Preço Venda'] - precoDesejado));
  return filtrados.sort((a, b) => (a.Diferenca ?? 0) - (b.Diferenca ?? 0)).slice(0, n);
}

export function buscarProdutoProximo(df: Produto[], precoDesejado: number, blacklist: string[] = []): Produto | null {
  let filtrados: ProdutoComDiferenca[] = df.map(p => ({ ...p })).filter(p => p['Margem Lucro'] > 0 && p['Quantidade'] >= 1);
  for (const termo of blacklist) {
    filtrados = filtrados.filter(p => !p['Descrição'].toLowerCase().includes(termo.toLowerCase()));
  }
  if (filtrados.length === 0) return null;
  filtrados.forEach(p => p.Diferenca = Math.abs(p['Preço Venda'] - precoDesejado));
  return filtrados.sort((a, b) => (a.Diferenca ?? 0) - (b.Diferenca ?? 0))[0];
}
