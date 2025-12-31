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
}

// Helper to calculate total in cents to avoid floating point issues
const calculateTotalInCents = (
  combination: Product[],
  quantity: { [key: string]: number },
  productsInCents: Map<string, number>
): number => {
  return combination.reduce((acc, product) => {
    const qty = quantity[product.COD] || 0;
    const priceInCents = productsInCents.get(product.COD) || 0;
    return acc + Math.round(priceInCents * qty);
  }, 0);
};


const findBestCombination = (
  products: Product[],
  targetPrice: number,
  inventory: { [key: string]: number },
  useFractional: boolean = true
): Combination | null => {
  // --- Setup: Convert all prices to cents ---
  const targetCents = Math.round(targetPrice * 100);
  const productsInCents = new Map<string, number>();
  products.forEach(p => productsInCents.set(p.COD, Math.round(p.PRECO * 100)));

  let bestCombination: Combination | null = null;
  let minDiff = Infinity;

  const unitProducts = products.filter(p => p.TIPO === 'UND');
  const fractionalProducts = products.filter(p => (p.TIPO === 'KG' || p.TIPO === 'SC') && p.PRECO > 0).sort((a, b) => b.PRECO - a.PRECO);

  // --- Recursive search function using cents ---
  const findUnitCombinations = (
    remainingCents: number,
    currentIndex: number,
    currentCombination: Product[],
    currentQuantity: { [key: string]: number }
  ) => {
    if (remainingCents < 0) {
      return;
    }

    const totalCents = calculateTotalInCents(currentCombination, currentQuantity, productsInCents);
    const diff = Math.abs(totalCents - targetCents);

    const totalItems = Object.keys(currentQuantity).length;
    const bestTotalItems = bestCombination ? Object.keys(bestCombination.quantity).length : Infinity;
    const isBetter = diff < minDiff || (diff === minDiff && totalItems < bestTotalItems);

    if (isBetter) {
      minDiff = diff;
      // Ensure product list is unique to prevent display bugs
      const uniqueProducts = [...new Map(currentCombination.map(p => [p.COD, p])).values()];
      bestCombination = {
        products: uniqueProducts,
        total: totalCents / 100,
        quantity: { ...currentQuantity },
      };
    }

    if (minDiff === 0) { // Exact match found
      return;
    }

    for (let i = currentIndex; i < unitProducts.length; i++) {
      const product = unitProducts[i];
      const availableStock = inventory[product.COD] ?? product.estoque;
      const productPriceCents = productsInCents.get(product.COD) || 0;

      if (availableStock > (currentQuantity[product.COD] || 0) && remainingCents >= productPriceCents) {
        currentCombination.push(product);
        currentQuantity[product.COD] = (currentQuantity[product.COD] || 0) + 1;

        findUnitCombinations(
          remainingCents - productPriceCents,
          i, // Allow using the same product again
          currentCombination,
          currentQuantity
        );

        // Backtrack
        currentQuantity[product.COD] -= 1;
        if (currentQuantity[product.COD] === 0) {
          delete currentQuantity[product.COD];
        }
        currentCombination.pop();
        
        if (minDiff === 0) return; // Early exit if an exact match was found in the recursive call
      }
    }
  };

  // --- Main Logic ---

  // 1. Find the best combination using only unit products
  findUnitCombinations(targetCents, 0, [], {});
  
  if (minDiff === 0) {
      return bestCombination;
  }

  if (useFractional) {
    let initialCents = 0;
    let initialQuantity: { [key: string]: number } = {};
    let initialProducts: Product[] = [];

    if (bestCombination) {
      const combo = bestCombination as Combination;
      initialCents = Math.round(combo.total * 100);
      initialQuantity = { ...combo.quantity };
      initialProducts = [...combo.products];
    }
    
    let remainingCents = targetCents - initialCents;

    if (remainingCents > 0) {
      // Helper to floor quantities to 0.001 precision and respect stock
      const floorToThousandth = (v: number) => Math.floor(v * 1000) / 1000;

      // Try greedy filling with given fractional product order
      const tryFill = (fractionalList: Product[], baseProducts: Product[], baseQuantity: { [key: string]: number }) => {
        let rem = remainingCents;
        const q: { [key: string]: number } = { ...baseQuantity };
        const prods: Product[] = [...baseProducts];

        for (const fractionalProduct of fractionalList) {
          if (rem <= 0) break;
          const availableStock = inventory[fractionalProduct.COD] ?? fractionalProduct.estoque;
          const productPriceCents = productsInCents.get(fractionalProduct.COD) || 0;
          if (availableStock <= 0 || productPriceCents <= 0) continue;

          const neededQty = rem / productPriceCents;
          let qtyToTake = Math.min(neededQty, availableStock);
          qtyToTake = floorToThousandth(qtyToTake);

          if (qtyToTake >= 0.001) {
            const existing = q[fractionalProduct.COD] || 0;
            if (existing === 0) prods.push(fractionalProduct);
            q[fractionalProduct.COD] = existing + qtyToTake;
            rem -= Math.round(qtyToTake * productPriceCents);
          }
        }

        const finalCents = calculateTotalInCents(prods, q, productsInCents);
        return { prods, q, finalCents, diff: Math.abs(finalCents - targetCents) };
      };

      // Two orders: descending (expensive first) and ascending (cheap first)
      const descList = fractionalProducts.slice();
      const ascList = fractionalProducts.slice().reverse();

      // Try filling starting from the best unit-only combination (if any)
      const baseProductsA = [...initialProducts];
      const baseQuantityA = { ...initialQuantity };
      const resultDescFromUnits = tryFill(descList, baseProductsA, baseQuantityA);
      const resultAscFromUnits = tryFill(ascList, baseProductsA, baseQuantityA);

      // Also try pure-fractional solutions (no unit base)
      const resultDescPure = tryFill(descList, [], {});
      const resultAscPure = tryFill(ascList, [], {});

      // Pick the best among the four attempts
      const candidates = [resultDescFromUnits, resultAscFromUnits, resultDescPure, resultAscPure];
      candidates.sort((a, b) => a.diff - b.diff);
      const best = candidates[0];

      if (best && best.diff < minDiff) {
        minDiff = best.diff;
        bestCombination = {
          products: best.prods,
          total: best.finalCents / 100,
          quantity: best.q,
        };
      }
    }
    
    if (minDiff === 0) {
        return bestCombination;
    }
  }

  return bestCombination;
};


self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === 'startSearch') {
    const { df, precoDesejado, blacklist } = payload;

    const productsRaw: Product[] = df.map((p: any) => {
      // Normalize price and stock types
      const precoNum = typeof p['Preço Venda'] === 'string' ? parseFloat(p['Preço Venda'].replace(/\./g, '').replace(',', '.')) : Number(p['Preço Venda']);
      const estoqueNum = typeof p['Quantidade'] === 'string' ? parseFloat(p['Quantidade'].replace(/\./g, '').replace(',', '.')) : Number(p['Quantidade']);

      // Determine type from unit fields robustly
      const rawUnit = (p['Und.Sai.'] || p['Und'] || '').toString().toLowerCase();
      let tipo: Product['TIPO'] = 'UND';
      if (rawUnit.includes('kg') || rawUnit.includes('kilo') || rawUnit.includes('k')) tipo = 'KG';
      else if (rawUnit.includes('sc') || rawUnit.includes('saco')) tipo = 'SC';
      else tipo = 'UND';

      return {
        COD: String(p['Código'] || p['Cód.Barras'] || p['codigo'] || ''),
        NOME: String(p['Descrição'] || p['descricao'] || ''),
        PRECO: isNaN(precoNum) ? 0 : precoNum,
        TIPO: tipo,
        estoque: isNaN(estoqueNum) ? 0 : estoqueNum,
      };
    });

    // Filter out products that are free or have no stock, as they are useless for combinations.
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

      const result = findBestCombination(produtosNaoBurlados, precoDesejado, inventory, true);
      
      if (result) {
        // Final validation to ensure stock constraints are respected
        let isStockValid = true;
        for (const cod in result.quantity) {
          const requestedQty = result.quantity[cod];
          const availableStock = inventory[cod];
          if (requestedQty > availableStock) {
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
          // If stock validation fails, return no result.
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
