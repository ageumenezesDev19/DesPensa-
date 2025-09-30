import * as cheerio from 'cheerio';
// import dayjs from 'dayjs';

// Função para carregar dados do HTML (produtos.html) a partir de string
export function carregarDadosHtmlFromString(html: string): { df: any[] } {
  const normalizeColName = (col: string): string => {
    const map: { [key: string]: string } = {
      'cód. barras': 'Cód.Barras',
      'cód.barras': 'Cód.Barras',
      'cod.barras': 'Cód.Barras',
      'und': 'Und.Sai.',
      'und.sai.': 'Und.Sai.',
      'descrição': 'Descrição',
      'descricao': 'Descrição',
      'codigo': 'Código',
      'código': 'Código',
      'fornecedor': 'Fornecedor',
      'quantidade': 'Quantidade',
      'preço custo': 'Preço Custo',
      'precocusto': 'Preço Custo',
      'margem lucro': 'Margem Lucro',
      'margemlucro': 'Margem Lucro',
      'preço venda': 'Preço Venda',
      'precovenda': 'Preço Venda',
      'csosn': 'CSOSN',
      'st': 'CSOSN',
      'elo': 'ELO',
    };
    return map[col.toLowerCase()] || col;
  };

  const $ = cheerio.load(html);

  const headerCells = $('table tr').first().find('td');
  const colunas = headerCells.map((_, el) => $(el).text().trim()).get();
  const numColunas = colunas.length;

  if (numColunas === 0) {
    return { df: [] };
  }

  const dataRows = $('table tr').slice(1);
  const df = dataRows.map((_, row) => {
    const rowCells = $(row).find('td');
    if (rowCells.length !== numColunas) return null;

    const rawObj: Record<string, string> = {};
    colunas.forEach((col, idx) => {
      const normalizedCol = normalizeColName(col);
      rawObj[normalizedCol] = $(rowCells[idx]).text().trim();
    });

    const produto: any = {
      'Código': rawObj['Código'] || '',
      'Cód.Barras': rawObj['Cód.Barras'] || '',
      'Descrição': rawObj['Descrição'] || '',
      'Und.Sai.': rawObj['Und.Sai.'] || '',
      'Fornecedor': rawObj['Fornecedor'] || '',
      'Quantidade': rawObj['Quantidade'] || '0',
      'Preço Custo': rawObj['Preço Custo'] || '0',
      'Margem Lucro': rawObj['Margem Lucro'] || '0',
      'Preço Venda': rawObj['Preço Venda'] || '0',
      'CSOSN': rawObj['CSOSN'] || '',
      'ELO': rawObj['ELO'] || '',
    };

    return produto;
  }).get().filter(item => item !== null && item['Código']);

  return { df };
}

export function tratarDados(df: any[]): any[] {
  const camposNumericos = ['Quantidade', 'Preço Custo', 'Margem Lucro', 'Preço Venda'];
  return df.map(row => {
    const novoRow = { ...row };
    for (const campo of camposNumericos) {
      if (novoRow[campo] && typeof novoRow[campo] === 'string') {
        let str = novoRow[campo].trim();
        // Remove pontos de milhar e substitui vírgula de decimal por ponto
        str = str.replace(/\.|\s/g, '').replace(',', '.');
        
        // Tenta converter para número
        const num = parseFloat(str);
        novoRow[campo] = isNaN(num) ? 0 : num;
      }
    }
    return novoRow;
  });
}

// Função para processar CSV de retirados a partir de string
export function carregarRetiradosFromString(csv: string): any[] {
  const linhas = csv.trim().split('\n');
  const colunas = linhas[0].split(',');
  return linhas.slice(1).map(linha => {
    const valores = linha.split(',');
    const obj: Record<string, string> = {};
    colunas.forEach((col, idx) => {
      obj[col] = valores[idx];
    });
    return obj;
  });
}

// Função para processar blacklist a partir de string
export function carregarBlacklistFromString(txt: string): string[] {
  return txt.trim().split('\n').map(l => l.trim()).filter(Boolean);
}

// Função para exportar produtos para HTML string (simplificado)
export function exportarProdutosParaHtml(produtos: any[], colunas: string[]): string {
  let html = '<table><tr>' + colunas.map(c => `<td>${c}</td>`).join('') + '</tr>';
  for (const p of produtos) {
    html += '<tr>' + colunas.map(c => `<td>${p[c]}</td>`).join('') + '</tr>';
  }
  html += '</table>';
  return html;
}

// Função para exportar retirados para CSV string
export function exportarRetiradosParaCsv(retirados: any[], colunas: string[]): string {
  let csv = colunas.join(',') + '\n';
  for (const r of retirados) {
    csv += colunas.map(c => r[c]).join(',') + '\n';
  }
  return csv;
}

// Função para exportar blacklist para TXT string
export function exportarBlacklistParaTxt(blacklist: string[]): string {
  return blacklist.join('\n');
}
