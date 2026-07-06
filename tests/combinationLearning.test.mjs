import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

async function loadLearningModule() {
  const outdir = await mkdtemp(join(tmpdir(), 'despensa-learning-'));
  const outfile = join(outdir, 'combinationLearning.mjs');
  await build({
    entryPoints: ['src/utils/combinationLearning.ts'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
  });
  return import(pathToFileURL(outfile).href);
}

function installWindowStorage() {
  const store = new Map();
  globalThis.CustomEvent = class CustomEvent {
    constructor(type) {
      this.type = type;
    }
  };
  globalThis.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
    dispatchEvent: () => true,
  };
  return store;
}

const product = (code, description) => ({
  code,
  barcode: '',
  description,
  supplier: '',
  quantity: 10,
  costPrice: 0,
  profitMargin: 0,
  salePrice: 10,
});

test('records withdrawn and ignored products with the expected score', async () => {
  installWindowStorage();
  const {
    recordWithdrawnCombination,
    recordIgnoredCombination,
    loadCombinationLearning,
  } = await loadLearningModule();

  recordWithdrawnCombination('Fiscal', [product('A', 'Arroz')]);
  recordIgnoredCombination('Fiscal', [product('A', 'Arroz')]);

  const entry = loadCombinationLearning('Fiscal').products.A;
  assert.equal(entry.withdrawnCount, 1);
  assert.equal(entry.ignoredCount, 1);
  assert.equal(entry.score, 2);
});

test('keeps learning data separated by profile', async () => {
  installWindowStorage();
  const {
    recordWithdrawnCombination,
    recordIgnoredCombination,
    loadCombinationLearning,
  } = await loadLearningModule();

  recordWithdrawnCombination('Fiscal', [product('A', 'Arroz')]);
  recordIgnoredCombination('Caixa', [product('A', 'Arroz')]);

  assert.equal(loadCombinationLearning('Fiscal').products.A.score, 3);
  assert.equal(loadCombinationLearning('Caixa').products.A.score, -1);
});

test('returns empty learning data when storage is missing or corrupted', async () => {
  const store = installWindowStorage();
  const { loadCombinationLearning } = await loadLearningModule();

  assert.deepEqual(loadCombinationLearning('Fiscal'), { version: 1, products: {} });
  store.set('profile_Fiscal_combination_learning', '{bad json');
  assert.deepEqual(loadCombinationLearning('Fiscal'), { version: 1, products: {} });
});

test('ranks products by score and applies positive and negative filters', async () => {
  installWindowStorage();
  const {
    recordWithdrawnCombination,
    recordIgnoredCombination,
    getRankedCombinationLearning,
  } = await loadLearningModule();

  recordWithdrawnCombination('Fiscal', [product('A', 'Arroz')]);
  recordWithdrawnCombination('Fiscal', [product('B', 'Biscoito')]);
  recordWithdrawnCombination('Fiscal', [product('B', 'Biscoito')]);
  recordIgnoredCombination('Fiscal', [product('C', 'Cafe')]);

  const all = getRankedCombinationLearning('Fiscal');
  assert.deepEqual(all.map((entry) => entry.code), ['B', 'A', 'C']);
  assert.deepEqual(getRankedCombinationLearning('Fiscal', 'positive').map((entry) => entry.code), ['B', 'A']);
  assert.deepEqual(getRankedCombinationLearning('Fiscal', 'negative').map((entry) => entry.code), ['C']);
});


test('applies a strong stock penalty only to the effective search preference', async () => {
  installWindowStorage();
  const {
    recordWithdrawnCombination,
    applyPreferenceToProducts,
    loadCombinationLearning,
  } = await loadLearningModule();

  recordWithdrawnCombination('Fiscal', [product('A', 'Baixo estoque')]);
  recordWithdrawnCombination('Fiscal', [product('A', 'Baixo estoque')]);
  recordWithdrawnCombination('Fiscal', [product('B', 'Estoque alto')]);

  const [lowStock, highStock] = applyPreferenceToProducts('Fiscal', [
    { ...product('A', 'Baixo estoque'), quantity: 15 },
    { ...product('B', 'Estoque alto'), quantity: 120 },
  ]);

  assert.equal(loadCombinationLearning('Fiscal').products.A.score, 6);
  assert.equal(lowStock.learnedPreferenceScore, 6);
  assert.equal(lowStock.stockPreferencePenalty, -12);
  assert.equal(lowStock.preferenceScore, -6);
  assert.equal(highStock.preferenceScore, 3);
});
