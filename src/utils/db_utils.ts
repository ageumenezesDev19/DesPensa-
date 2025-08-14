import * as cheerio from 'cheerio';
// import dayjs from 'dayjs';

// Função para carregar dados do HTML (produtos.html) a partir de string
export function carregarDadosHtmlFromString(html: string): { df: any[] } {
  const $ = cheerio.load(html); // Use cheerio.load for parsing HTML
  const todasTd = $('td').toArray();
  const colunas = todasTd.slice(0, 11).map(td => $(td).text().trim());
  const dados = todasTd.slice(11).map(td => $(td).text().trim());
  const linhas = [];
  for (let i = 0; i < dados.length; i += 11) {
    linhas.push(dados.slice(i, i + 11));
  }
  const df = linhas.map(row => {
    const obj: Record<string, string> = {};
    colunas.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
  return { df };
}

export function tratarDados(df: any[]): any[] {
  const camposNumericos = ['Quantidade', 'Preço Custo', 'Margem Lucro', 'Preço Venda'];
  return df.map(row => {
    const novoRow = { ...row };
    for (const campo of camposNumericos) {
      if (novoRow[campo] && typeof novoRow[campo] === 'string') {
        let str = novoRow[campo].trim();
        const temVirgula = str.includes(',');
        
        if (temVirgula) {
          // Formato brasileiro: 1.234,56 -> remove pontos, troca vírgula por ponto
          str = str.replace(/\./g, '').replace(',', '.');
        } else if (str.includes('.') && str.lastIndexOf('.') < str.length - 3) {
          // Formato como "1.200" (mil e duzentos) -> remove pontos
          str = str.replace(/\./g, '');
        }
        // Formato como "93.20" ou "1200" -> não faz nada, parseFloat lida com isso

        novoRow[campo] = parseFloat(str);
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
