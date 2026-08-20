import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';

async function loadImportModule() {
  const outdir = await mkdtemp(join(tmpdir(), 'despensa-import-'));
  const outfile = join(outdir, 'db_utils.cjs');
  await build({
    entryPoints: ['src/utils/db_utils.ts'],
    outfile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
  });
  return createRequire(import.meta.url)(outfile);
}

const productTable = `
<html><body><table>
<tr>
  <td>Código</td><td>Cód.Barras</td><td>Descrição</td><td>Und.Sai.</td><td>Fornecedor</td>
  <td>Quantidade</td><td>Preço Custo</td><td>Margem Lucro</td><td>Preço Venda</td><td>CSOSN</td><td>ELO</td>
</tr>
<tr>
  <td>004075</td><td>7896653702513</td><td>Doce de Leite Zero Display</td><td>DS</td><td>Fornecedor A</td>
  <td>62,00</td><td>3,16</td><td>25,00</td><td>3,95</td><td>500</td><td></td>
</tr>
<tr>
  <td>000046</td><td>7893000017832</td><td>MORTADELA SADILAR</td><td>KG</td><td>Fornecedor B</td>
  <td>0,075</td><td>31,50</td><td>25,00</td><td>39,38</td><td>500</td><td></td>
</tr>
<tr>
  <td>999999</td><td></td><td>Produto sem CSOSN permitido</td><td>UN</td><td>Fornecedor C</td>
  <td>2,00</td><td>1,00</td><td>25,00</td><td>2,00</td><td>102</td><td></td>
</tr>
</table></body></html>
`;

test('loads products from regular produtos.html export', async () => {
  const { loadProductDataFromString } = await loadImportModule();

  const { df } = loadProductDataFromString(productTable, { ignoreNcm: true, filterByCsosn: false });

  assert.equal(df.length, 3);
  assert.equal(df[0].code, '004075');
  assert.equal(df[0].quantity, 62);
  assert.equal(df[0].salePrice, 3.95);
  assert.equal(df[1].unitOut, 'KG');
  assert.equal(df[1].quantity, 0.075);
  assert.equal(df[1].salePrice, 39.38);
});

test('loads products from xls export that is HTML with junk before table', async () => {
  const { loadProductDataFromString } = await loadImportModule();
  const xlsHtml = '\ufeff</b></u></i></font><font face="Tahoma">' + productTable;

  const { df } = loadProductDataFromString(xlsHtml, { ignoreNcm: true, filterByCsosn: true });

  assert.deepEqual(df.map((product) => product.code), ['004075', '000046']);
});

test('rejects unsupported binary spreadsheet content with a controlled error', async () => {
  const { loadProductDataFromString } = await loadImportModule();

  assert.throws(
    () => loadProductDataFromString('PK\x03\x04fake-xlsx-content', { ignoreNcm: true }),
    /Unsupported product file format/
  );
  assert.throws(
    () => loadProductDataFromString('\uFFFD\uFFFD\x11\uFFFDfake-binary-xls', { ignoreNcm: true }),
    /Unsupported product file format/
  );
});
