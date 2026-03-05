import { Product } from './inventory';

interface ProductWithDifference extends Product {
  Difference?: number;
}

export function searchNearbyProducts(df: Product[], desiredPrice: number, n = 3): Product[] | undefined {
  const filtered: ProductWithDifference[] = df.map(p => ({ ...p })).filter(p => p.quantity >= 0.001);
  if (filtered.length === 0) return undefined;
  filtered.forEach(p => p.Difference = Math.abs((p.salePrice ?? 0) - desiredPrice));
  return filtered.sort((a, b) => (a.Difference ?? 0) - (b.Difference ?? 0)).slice(0, n);
}

export function searchNearbyProduct(df: Product[], desiredPrice: number, blacklist: string[] = []): Product | undefined {
  let filtered: ProductWithDifference[] = df.map(p => ({ ...p })).filter(p => p.quantity >= 0.001);
  for (const term of blacklist) {
    filtered = filtered.filter(p => !p.description.toLowerCase().includes(term.toLowerCase()));
  }
  if (filtered.length === 0) return undefined;
  filtered.forEach(p => p.Difference = Math.abs((p.salePrice ?? 0) - desiredPrice));
  return filtered.sort((a, b) => (a.Difference ?? 0) - (b.Difference ?? 0))[0];
}
