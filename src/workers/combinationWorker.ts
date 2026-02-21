// src/workers/combinationWorker.ts

interface Product {
  COD: string;
  NOME: string;
  PRECO: number;
  TIPO: 'UND' | 'KG' | 'SC';
  estoque: number;
}

interface Combination {
  products: Product[];
  total: number;
  quantity: { [key: string]: number };
  diff: number;
}

// Helper to calculate total in cents to avoid floating point issues
const calculateTotalInCents = (
  combination: Product[],
  quantity: { [key: string]: number },
  productsInCents: Map<string, number>
): number => {
  let total = 0;
  for (const product of combination) {
    const qty = quantity[product.COD] || 0;
    const priceCents = productsInCents.get(product.COD) || 0;
    total += Math.round(priceCents * qty);
  }
  return total;
};

// Extremely fast Greedy randomized algorithm
const findCombinationHeuristic = (
  products: Product[],
  targetPrice: number,
  inventory: { [key: string]: number },
  timeoutMs: number = 2000
): Combination | null => {
  const targetCents = Math.round(targetPrice * 100);
  const productsInCents = new Map<string, number>();
  products.forEach(p => productsInCents.set(p.COD, Math.round(p.PRECO * 100)));

  let bestCombination: Combination | null = null;
  let minDiff = Infinity;

  const startTime = Date.now();

  // Try pure greedy first, sorting by descending price
  const greedySearch = (shuffledProducts: Product[]) => {
    let remainingCents = targetCents;
    const currentQuantity: { [key: string]: number } = {};
    const currentCombo: Product[] = [];

    for (const p of shuffledProducts) {
       if (remainingCents <= 0) break;
       const priceCents = productsInCents.get(p.COD) || 0;
       if (priceCents <= 0) continue;

       const availStock = inventory[p.COD] || 0;
       
       let takeQty = 0;
       if (p.TIPO === 'KG' || p.TIPO === 'SC') {
          // Fractional
          const neededQty = remainingCents / priceCents;
          takeQty = Math.min(neededQty, availStock);
          takeQty = Math.floor(takeQty * 1000) / 1000;
       } else {
          // Unit
          const maxUnits = Math.floor(remainingCents / priceCents);
          takeQty = Math.min(maxUnits, availStock);
       }

       if (takeQty >= 0.001) {
          currentCombo.push(p);
          currentQuantity[p.COD] = takeQty;
          remainingCents -= Math.round(takeQty * priceCents);
       }
    }

    const totalCents = calculateTotalInCents(currentCombo, currentQuantity, productsInCents);
    const diff = Math.abs(totalCents - targetCents);

    if (diff < minDiff) {
       minDiff = diff;
       bestCombination = {
          products: currentCombo,
          total: totalCents / 100,
          quantity: currentQuantity,
          diff
       };
    }
  };

  // Iteration 1: pure descending price
  const descProducts = [...products].sort((a, b) => b.PRECO - a.PRECO);
  greedySearch(descProducts);
  
  // Iteration 2: pure ascending price
  const ascProducts = [...products].sort((a, b) => a.PRECO - b.PRECO);
  greedySearch(ascProducts);

  // Iterations: Randomized greedy for up to timeoutMs
  let iterations = 0;
  while (Date.now() - startTime < timeoutMs && minDiff > 0) {
     iterations++;
     const shuffled = [...products].sort(() => Math.random() - 0.5);
     greedySearch(shuffled);
  }
  
  console.log(`[combinationWorker] completed ${iterations} randomized iterations. Best diff: ${minDiff / 100}`);

  // Accept if it's within tolerance or if it's the absolute best we found.
  // The user wants precision but also wants results even for huge numbers.
  // Tolerance: max 5 Reais or 5%, whichever is smaller.
  const toleranceCents = Math.min(500, Math.round(targetCents * 0.05));

  if (bestCombination && (minDiff <= toleranceCents || targetCents < 1000)) {
     return bestCombination;
  }
  
  // If we really can't find anything close, return best anyway so we don't just say "Nothing found"
  return bestCombination;
};

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'startSearch') {
    const { df, precoDesejado, blacklist } = payload;

    const productsRaw: Product[] = df.map((p: any) => {
      const precoNum = typeof p['Preço Venda'] === 'string' ? parseFloat(p['Preço Venda'].replace(/\./g, '').replace(',', '.')) : Number(p['Preço Venda']);
      const estoqueNum = typeof p['Quantidade'] === 'string' ? parseFloat(p['Quantidade'].replace(/\./g, '').replace(',', '.')) : Number(p['Quantidade']);

      const rawUnit = (p['Und.Sai.'] || p['Und'] || '').toString().toLowerCase();
      let tipo: Product['TIPO'] = 'UND';
      if (rawUnit.includes('kg') || rawUnit.includes('kilo') || rawUnit.includes('k')) tipo = 'KG';
      else if (rawUnit.includes('sc') || rawUnit.includes('saco') || rawUnit.includes('fdo') || rawUnit.includes('fd') || rawUnit.includes('sh')) tipo = 'SC';
      else tipo = 'UND';

      return {
        COD: String(p['Código'] || p['Cód.Barras'] || p['codigo'] || ''),
        NOME: String(p['Descrição'] || p['descricao'] || ''),
        PRECO: isNaN(precoNum) ? 0 : precoNum,
        TIPO: tipo,
        estoque: isNaN(estoqueNum) ? 0 : estoqueNum,
      };
    });

    // Filter out products that are free or have no stock
    const products = productsRaw.filter((p: Product) => p.PRECO > 0 && p.estoque > 0);

    const inventory = products.reduce((acc: { [key: string]: number }, p: Product) => {
      acc[p.COD] = p.estoque;
      return acc;
    }, {});

    try {
      const produtosNaoBurlados = products.filter((p: Product) => {
        const isBlacklisted = blacklist.some((term: string) => p.NOME.toLowerCase().includes(term.toLowerCase()) || p.COD.toLowerCase().includes(term.toLowerCase()));
        return !isBlacklisted;
      });

      // Pass the 2 seconds timeout to the heuristic
      const result = findCombinationHeuristic(produtosNaoBurlados, precoDesejado, inventory, 2000);
      
      if (result) {
        let isStockValid = true;
        for (const cod in result.quantity) {
          const requestedQty = result.quantity[cod];
          const availableStock = inventory[cod];
          if (requestedQty > availableStock + 0.001) {
            isStockValid = false;
            console.warn(`Stock validation failed for product COD ${cod}. Requested: ${requestedQty}, Available: ${availableStock}`);
            break;
          }
        }

        if (isStockValid) {
          const resultWithOriginalProducts = {
            ...result,
            products: result.products.map(p => {
              const originalProduct = df.find((op: any) => op['Código'] === p.COD);
              return {
                ...originalProduct,
                quantidadeUtilizada: result.quantity[p.COD]
              };
            })
          };
          self.postMessage({ type: 'result', result: resultWithOriginalProducts.products });
        } else {
          self.postMessage({ type: 'result', result: null });
        }
      } else {
        self.postMessage({ type: 'result', result: null });
      }
    } catch (error) {
      console.error('Error in combination worker:', error);
      self.postMessage({ type: 'error', error: (error as Error).message });
    }
  }
};
