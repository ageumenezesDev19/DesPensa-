import type { Product } from './inventory';
import type { ProductWithQuantity } from '../context/InventoryContext';

export interface CombinationLearningEntry {
  code: string;
  description: string;
  withdrawnCount: number;
  ignoredCount: number;
  score: number;
  lastWithdrawnAt?: string;
  lastIgnoredAt?: string;
}

export interface CombinationLearningData {
  version: 1;
  products: Record<string, CombinationLearningEntry>;
}

export type RankingFilter = 'positive' | 'negative' | 'all';

const VERSION = 1;

const createEmptyLearning = (): CombinationLearningData => ({
  version: VERSION,
  products: {},
});

const getStorageKey = (profileName: string): string => `profile_${profileName}_combination_learning`;

const buildFallbackProduct = (code: string, description = ''): Product => ({
  code,
  barcode: '',
  description,
  supplier: '',
  quantity: 0,
  costPrice: 0,
  profitMargin: 0,
  salePrice: 0,
});

const normalizeEntry = (entry: Partial<CombinationLearningEntry>, fallback: Product): CombinationLearningEntry => {
  const withdrawnCount = Number(entry.withdrawnCount) || 0;
  const ignoredCount = Number(entry.ignoredCount) || 0;

  return {
    code: String(entry.code || fallback.code || ''),
    description: String(entry.description || fallback.description || ''),
    withdrawnCount,
    ignoredCount,
    score: withdrawnCount * 3 - ignoredCount,
    lastWithdrawnAt: entry.lastWithdrawnAt,
    lastIgnoredAt: entry.lastIgnoredAt,
  };
};

export const loadCombinationLearning = (profileName: string): CombinationLearningData => {
  try {
    const raw = window.localStorage.getItem(getStorageKey(profileName));
    if (!raw) return createEmptyLearning();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.products || typeof parsed.products !== 'object') {
      return createEmptyLearning();
    }

    const data = createEmptyLearning();
    Object.values(parsed.products).forEach((rawEntry) => {
      const entry = rawEntry as Partial<CombinationLearningEntry>;
      if (!entry.code) return;
      data.products[String(entry.code)] = normalizeEntry(
        entry,
        buildFallbackProduct(String(entry.code), String(entry.description || ''))
      );
    });

    return data;
  } catch {
    return createEmptyLearning();
  }
};

export const saveCombinationLearning = (profileName: string, data: CombinationLearningData): void => {
  window.localStorage.setItem(getStorageKey(profileName), JSON.stringify(data));
};

const updateCombinationLearning = (
  profileName: string,
  products: Array<Product | ProductWithQuantity>,
  updateEntry: (entry: CombinationLearningEntry, now: string) => CombinationLearningEntry
): CombinationLearningData => {
  const data = loadCombinationLearning(profileName);
  const now = new Date().toISOString();

  products.forEach((product) => {
    if (!product.code) return;
    const current = data.products[product.code] ?? normalizeEntry({}, product);
    data.products[product.code] = updateEntry(
      {
        ...current,
        description: product.description || current.description,
      },
      now
    );
  });

  saveCombinationLearning(profileName, data);
  window.dispatchEvent(new CustomEvent('combinationLearningChanged'));
  return data;
};

export const recordIgnoredCombination = (
  profileName: string,
  products: Array<Product | ProductWithQuantity>
): CombinationLearningData => updateCombinationLearning(profileName, products, (entry, now) => {
  const ignoredCount = entry.ignoredCount + 1;
  return {
    ...entry,
    ignoredCount,
    score: entry.withdrawnCount * 3 - ignoredCount,
    lastIgnoredAt: now,
  };
});

export const recordWithdrawnCombination = (
  profileName: string,
  products: Array<Product | ProductWithQuantity>
): CombinationLearningData => updateCombinationLearning(profileName, products, (entry, now) => {
  const withdrawnCount = entry.withdrawnCount + 1;
  return {
    ...entry,
    withdrawnCount,
    score: withdrawnCount * 3 - entry.ignoredCount,
    lastWithdrawnAt: now,
  };
});

export const getProductPreferenceScore = (profileName: string, code: string): number => {
  return loadCombinationLearning(profileName).products[code]?.score ?? 0;
};

export const getRankedCombinationLearning = (
  profileName: string,
  filter: RankingFilter = 'all'
): CombinationLearningEntry[] => {
  const entries = Object.values(loadCombinationLearning(profileName).products);
  const filtered = entries.filter((entry) => {
    if (filter === 'positive') return entry.score > 0;
    if (filter === 'negative') return entry.score < 0;
    return true;
  });

  return filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.withdrawnCount !== a.withdrawnCount) return b.withdrawnCount - a.withdrawnCount;
    if (a.ignoredCount !== b.ignoredCount) return a.ignoredCount - b.ignoredCount;
    const descriptionComparison = a.description.localeCompare(b.description);
    if (descriptionComparison !== 0) return descriptionComparison;
    return a.code.localeCompare(b.code);
  });
};


export const getStockPreferencePenalty = (product: Pick<Product, 'quantity'>): number => {
  const quantity = Number(product.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return -100;
  if (quantity < 5) return -30;
  if (quantity < 10) return -20;
  if (quantity < 20) return -12;
  if (quantity < 50) return -4;
  return 0;
};

export const getEffectivePreferenceScore = (learnedScore: number, product: Pick<Product, 'quantity'>): number => {
  return learnedScore + getStockPreferencePenalty(product);
};

export const applyPreferenceToProducts = <T extends Product>(
  profileName: string,
  products: T[]
): Array<T & { preferenceScore: number; learnedPreferenceScore: number; stockPreferencePenalty: number }> => {
  const learning = loadCombinationLearning(profileName);
  return products.map((product) => {
    const learnedPreferenceScore = learning.products[product.code]?.score ?? 0;
    const stockPreferencePenalty = getStockPreferencePenalty(product);
    return {
      ...product,
      learnedPreferenceScore,
      stockPreferencePenalty,
      preferenceScore: learnedPreferenceScore + stockPreferencePenalty,
    };
  });
};
