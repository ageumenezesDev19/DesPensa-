import * as cheerio from 'cheerio';
// import dayjs from 'dayjs';

// Função para carregar dados do HTML (produtos.html) a partir de string
export function carregarDadosHtmlFromString(html: string): { df: any[] } {
  console.log(`[carregarDadosHtmlFromString] Tamanho do HTML recebido: ${html.length} caracteres`);
  
  const normalizeColName = (col: string): string => {
    const map: { [key: string]: string } = {
      'cód. barras': 'Cód.Barras',
      'cód.barras': 'Cód.Barras',
      'cod.barras': 'Cód.Barras',
      'und': 'Und',  // Keep original name, don't convert
      'und.sai.': 'Und.Sai.',
      'und.sai': 'Und.Sai.',
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
      'st': 'ST',  // Keep original name, don't convert
      'elo': 'ELO',
    };
    return map[col.toLowerCase()] || col;
  };

  // Pre-process HTML to remove junk before the table
  let tableHtml = html;
  const tableStartIndex = html.toLowerCase().indexOf('<table');
  if (tableStartIndex > -1) {
    tableHtml = html.substring(tableStartIndex);
  }

  console.log(`[carregarDadosHtmlFromString] Tamanho do HTML da tabela: ${tableHtml.length} caracteres`);

  // Attempt to parse as HTML table first
  const $ = cheerio.load(tableHtml);
  const headerCells = $('table tr').first().find('td');
  let colunas = headerCells.map((_, el) => $(el).text().trim()).get();
  let df: any[] = [];

  console.log(`[carregarDadosHtmlFromString] Colunas encontradas: ${colunas.length}`, colunas);

  if (colunas.length > 0) {
    // HTML Table parsing logic
    const numColunas = colunas.length;
    const dataRows = $('table tr').slice(1);
    console.log(`[carregarDadosHtmlFromString] Total de linhas de dados encontradas: ${dataRows.length}`);
    
    df = dataRows.map((_, row) => {
      const rowCells = $(row).find('td');
      if (rowCells.length !== numColunas) return null;

      const rawObj: Record<string, string> = {};
      colunas.forEach((col, idx) => {
        const normalizedCol = normalizeColName(col);
        rawObj[normalizedCol] = $(rowCells[idx]).text().trim();
      });

      const unidadeVal = rawObj['Und'] || rawObj['Und.Sai.'] || '';
      return {
        'Código': rawObj['Código'] || '',
        'Cód.Barras': rawObj['Cód.Barras'] || '',
        'Descrição': rawObj['Descrição'] || '',
        'Und': unidadeVal,
        'Und.Sai.': unidadeVal,
        'Fornecedor': rawObj['Fornecedor'] || '',
        'Quantidade': rawObj['Quantidade'] || '0',
        'Preço Custo': rawObj['Preço Custo'] || '0',
        'Margem Lucro': rawObj['Margem Lucro'] || '0',
        'Preço Venda': rawObj['Preço Venda'] || '0',
        'ST': rawObj['ST'] || rawObj['CSOSN'] || '',  // Support both formats
        'ELO': rawObj['ELO'] || '',
      };
    }).get().filter(item => item !== null && item['Código']);
    
    console.log(`[carregarDadosHtmlFromString] Produtos carregados após filtrar: ${df.length}`);
  } else {
    // Fallback to plain text parsing
    console.log(`[carregarDadosHtmlFromString] HTML table parsing não funcionou, tentando fallback de texto puro`);
    const lines = html.split('\n').map(line => line.trim()).filter(line => line);
    console.log(`[carregarDadosHtmlFromString] Total de linhas após split: ${lines.length}`);
    
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('código') && lines[i].toLowerCase().includes('descrição')) {
            headerIndex = i;
            break;
        }
    }

    console.log(`[carregarDadosHtmlFromString] Header encontrado no índice: ${headerIndex}`);

    if (headerIndex !== -1) {
      const headerLine = lines[headerIndex];
      colunas = headerLine.split(/\s{2,}|\t/);
      const numColunas = colunas.length;
      const dataLines = lines.slice(headerIndex + 1);
      
      console.log(`[carregarDadosHtmlFromString] Colunas do header: ${numColunas}`, colunas);
      console.log(`[carregarDadosHtmlFromString] Linhas de dados para processar: ${dataLines.length}`);

      df = dataLines.map(line => {
        const values = line.split(/\s{2,}|\t/);
        
        // Strict check: allows for one missing column (e.g., ELO)
        if (values.length < numColunas - 1 || values.length > numColunas) {
            return null;
        }
        
        const rawObj: Record<string, string> = {};
        colunas.forEach((col, idx) => {
            const normalizedCol = normalizeColName(col);
            rawObj[normalizedCol] = values[idx] || '';
        });

        const unidadeVal = rawObj['Und'] || rawObj['Und.Sai.'] || '';
        return {
          'Código': rawObj['Código'] || '',
          'Cód.Barras': rawObj['Cód.Barras'] || '',
          'Descrição': rawObj['Descrição'] || '',
          'Und': unidadeVal,
          'Und.Sai.': unidadeVal,
          'Fornecedor': rawObj['Fornecedor'] || '',
          'Quantidade': rawObj['Quantidade'] || '0',
          'Preço Custo': rawObj['Preço Custo'] || '0',
          'Margem Lucro': rawObj['Margem Lucro'] || '0',
          'Preço Venda': rawObj['Preço Venda'] || '0',
          'ST': rawObj['ST'] || rawObj['CSOSN'] || '',  // Support both formats
          'ELO': rawObj['ELO'] || '',
        };
      }).filter(item => item !== null && item['Código'] && item['Descrição']);
      
      console.log(`[carregarDadosHtmlFromString] Produtos finais após fallback: ${df.length}`);
    } else {
      console.error(`[carregarDadosHtmlFromString] Nenhum header encontrado no arquivo`);
    }
  }

  return { df };
}

export function tratarDados(df: any[]): any[] {
  const camposNumericos = ['Quantidade', 'Preço Custo', 'Margem Lucro', 'Preço Venda'];
  return df.map(row => {
    const novoRow = { ...row };
    for (const campo of camposNumericos) {
      if (novoRow[campo] && typeof novoRow[campo] === 'string') {
        let str = novoRow[campo].trim().replace(/\s/g, ''); // remove spaces

        if (str.includes(',')) {
          // Comma present, so dots are thousands separators
          str = str.replace(/\./g, '').replace(',', '.');
        }
        // If no comma, any dot is a decimal separator, so we don't touch it.
        
        let num = parseFloat(str);
        
        if (isNaN(num)) {
          num = 0;
        }

        if (campo === 'Quantidade') {
          // Round to 3 decimal places to avoid issues with "0,000..."
          novoRow[campo] = Math.round(num * 1000) / 1000;
        } else {
          // Round prices to 2 decimal places
          novoRow[campo] = Math.round(num * 100) / 100;
        }
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
