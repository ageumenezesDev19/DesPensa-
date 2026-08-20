import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

async function loadCopyModule() {
  const outdir = await mkdtemp(join(tmpdir(), 'despensa-copy-'));
  const outfile = join(outdir, 'productCopy.mjs');
  await build({
    entryPoints: ['src/utils/productCopy.ts'],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
  });
  return import(pathToFileURL(outfile).href);
}

test('copy text removes everything after the first plus in the product name', async () => {
  const { buildProductCopyText } = await loadCopyModule();

  assert.equal(
    buildProductCopyText({ description: 'CHA 10 FASES CHEG MENOPAUSA AMO+LAR 20G', usedQuantity: 17 }),
    '17*CHA 10 FASES CHEG MENOPAUSA AMO'
  );
});

test('copy text keeps full product names without plus and normalizes non-breaking spaces', async () => {
  const { buildProductCopyText } = await loadCopyModule();

  assert.equal(
    buildProductCopyText({ description: 'CAFE\u00A0TORRADO 250G', usedQuantity: 2 }),
    '2*CAFE TORRADO 250G'
  );
});

test('copy text formats fractional quantities with comma', async () => {
  const { buildProductCopyText } = await loadCopyModule();

  assert.equal(
    buildProductCopyText({ description: 'QUEIJO+RESTAURANTE', usedQuantity: 0.125 }),
    '0,125*QUEIJO'
  );
});
