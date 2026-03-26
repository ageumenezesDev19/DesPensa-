import * as cheerio from 'cheerio';
// import dayjs from 'dayjs';

// export function loadHtmlDataFromString(html: string): { df: any[] } {
export function loadHtmlDataFromString(html: string, options?: { ignoreNcm?: boolean }): { df: any[] } {
  console.log(`[loadHtmlDataFromString] Initial HTML size: ${html.length} chars`);
  
  const normalizeColName = (col: string): string => {
    // Replace non-breaking spaces and other special whitespace characters with normal space
    const sanitized = col.replace(/[\xA0\s]+/g, ' ').trim().toLowerCase();
    
    const map: { [key: string]: string } = {
      'cód. barras': 'Cód.Barras',
      'cód.barras': 'Cód.Barras',
      'cod.barras': 'Cód.Barras',
      'barcode': 'Cód.Barras',
      'und': 'Und',  // Keep original name, don't convert
      'und.sai.': 'Und.Sai.',
      'und.sai': 'Und.Sai.',
      'unit': 'Und', // Map English 'Unit' to 'Und'
      'descrição': 'Descrição',
      'descricao': 'Descrição',
      'description': 'Descrição',
      'codigo': 'Código',
      'código': 'Código',
      'code': 'Código',
      'fornecedor': 'Fornecedor',
      'supplier': 'Fornecedor',
      'quantidade': 'Quantidade',
      'quantity': 'Quantidade',
      'preço custo': 'Preço Custo',
      'precocusto': 'Preço Custo',
      'cost price': 'Preço Custo',
      'margem lucro': 'Margem Lucro',
      'margemlucro': 'Margem Lucro',
      'profit margin': 'Margem Lucro',
      'preço venda': 'Preço Venda',
      'precovenda': 'Preço Venda',
      'sale price': 'Preço Venda',
      'csosn': 'CSOSN',
      'st': 'ST',  // Keep original name, don't convert
      'elo': 'ELO',
      'cód.ncm': 'Cód.NCM',
      'cod.ncm': 'Cód.NCM',
      'ncm': 'Cód.NCM',
    };
    return map[sanitized] || col;
  };

  // Pre-process HTML to remove junk before the table
  let tableHtml = html;
  const tableStartIndex = html.toLowerCase().indexOf('<table');
  if (tableStartIndex > -1) {
    tableHtml = html.substring(tableStartIndex);
  }

  console.log(`[loadHtmlDataFromString] HTML table size: ${tableHtml.length} chars`);

  // Attempt to parse as HTML table first
  const $ = cheerio.load(tableHtml);
  const headerCells = $('table tr').first().find('td');
  let columns = headerCells.map((_, el) => $(el).text().trim()).get();
  let df: any[] = [];

  console.log(`[loadHtmlDataFromString] Found Columns: ${columns.length}`, columns);

  if (columns.length > 0) {
    // HTML Table parsing logic
    const numColumns = columns.length;
    const dataRows = $('table tr').slice(1);
    console.log(`[loadHtmlDataFromString] Total data rows found: ${dataRows.length}`);
    
    df = dataRows.map((_, row) => {
      const rowCells = $(row).find('td');
      if (rowCells.length !== numColumns) return null;

      const rawObj: Record<string, string> = {};
      columns.forEach((col, idx) => {
        const normalizedCol = normalizeColName(col);
        rawObj[normalizedCol] = $(rowCells[idx]).text().trim();
      });

      const unitVal = rawObj['Und'] || rawObj['Und.Sai.'] || '';
      return {
        code: rawObj['Código'] || '',
        barcode: rawObj['Cód.Barras'] || '',
        description: rawObj['Descrição'] || '',
        unit: unitVal,
        unitOut: unitVal,
        supplier: rawObj['Fornecedor'] || '',
        quantity: rawObj['Quantidade'] || '0',
        costPrice: rawObj['Preço Custo'] || '0',
        profitMargin: rawObj['Margem Lucro'] || '0',
        salePrice: rawObj['Preço Venda'] || '0',
        st: rawObj['ST'] || rawObj['CSOSN'] || '',  // Support both formats
        elo: rawObj['ELO'] || '',
        ncm: rawObj['Cód.NCM'] || '',
      };
    }).get().filter(item => item !== null && item.code);
    
    console.log(`[loadHtmlDataFromString] Final extracted items parsed: ${df.length}`);
    df = processData(df, options?.ignoreNcm);
    console.log(`[loadHtmlDataFromString] Final processed items: ${df.length}`);
  } else {
    // Fallback to plain text parsing
    console.log(`[loadHtmlDataFromString] HTML table parsing failed, falling back to text`);
    const lines = html.split('\n').map(line => line.trim()).filter(line => line);
    console.log(`[loadHtmlDataFromString] Total lines after split: ${lines.length}`);
    
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        const lineLower = lines[i].toLowerCase();
        if ((lineLower.includes('código') && lineLower.includes('descrição')) || 
            (lineLower.includes('code') && lineLower.includes('description'))) {
            headerIndex = i;
            break;
        }
    }

    console.log(`[loadHtmlDataFromString] Header found at index: ${headerIndex}`);

    if (headerIndex !== -1) {
      const headerLine = lines[headerIndex];
      columns = headerLine.split(/\s{2,}|\t/);
      const numColumns = columns.length;
      const dataLines = lines.slice(headerIndex + 1);
      
      console.log(`[loadHtmlDataFromString] Header columns count: ${numColumns}`, columns);
      console.log(`[loadHtmlDataFromString] Data lines to process: ${dataLines.length}`);

      df = dataLines.map(line => {
        const values = line.split(/\s{2,}|\t/);
        
        // Strict check: allows for one missing column (e.g., ELO)
        if (values.length < numColumns - 1 || values.length > numColumns) {
            return null;
        }
        
        const rawObj: Record<string, string> = {};
        columns.forEach((col, idx) => {
            const normalizedCol = normalizeColName(col);
            rawObj[normalizedCol] = values[idx] || '';
        });

        const unitVal = rawObj['Und'] || rawObj['Und.Sai.'] || '';
        return {
          code: rawObj['Código'] || '',
          barcode: rawObj['Cód.Barras'] || '',
          description: rawObj['Descrição'] || '',
          unit: unitVal,
          unitOut: unitVal,
          supplier: rawObj['Fornecedor'] || '',
          quantity: rawObj['Quantidade'] || '0',
          costPrice: rawObj['Preço Custo'] || '0',
          profitMargin: rawObj['Margem Lucro'] || '0',
          salePrice: rawObj['Preço Venda'] || '0',
          st: rawObj['ST'] || rawObj['CSOSN'] || '',  // Support both formats
          elo: rawObj['ELO'] || '',
        };
      }).filter(item => item !== null && item.code && item.description);
      
      console.log(`[loadHtmlDataFromString] Final items after fallback: ${df.length}`);
      df = processData(df, options?.ignoreNcm);
      console.log(`[loadHtmlDataFromString] Final processed items after fallback: ${df.length}`);
    } else {
      console.error(`[loadHtmlDataFromString] No headers found in file`);
    }
  }

  return { df };
}

export function processData(df: any[], ignoreNcm: boolean = false): any[] {
  const numericFields = ['quantity', 'costPrice', 'profitMargin', 'salePrice'];
  return df.map(row => {
    const newRow = { ...row };
    for (const field of numericFields) {
      if (newRow[field] && typeof newRow[field] === 'string') {
        let str = newRow[field].trim().replace(/\s/g, ''); // remove spaces

        if (str.includes(',')) {
          // Comma present, so dots are thousands separators
          str = str.replace(/\./g, '').replace(',', '.');
        }
        // If no comma, any dot is a decimal separator, so we don't touch it.

        let num = parseFloat(str);

        if (isNaN(num)) {
          num = 0;
        }

        if (field === 'quantity') {
          // Round to 3 decimal places to avoid issues with "0,000..."
          newRow[field] = Math.round(num * 1000) / 1000;
        } else {
          // Round prices to 2 decimal places
          newRow[field] = Math.round(num * 100) / 100;
        }
      }
    }
    return newRow;
  }).filter(row => row.quantity > 0 && row.salePrice > 0 && (ignoreNcm || row.ncm));
}

// Function to parse withdrawn CSV from string
export function loadWithdrawnFromString(csv: string): any[] {
  const lines = csv.trim().split('\n');
  const cols = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: Record<string, string> = {};
    cols.forEach((col, idx) => {
      obj[col] = values[idx];
    });
    return obj;
  });
}

// Function to parse blacklist text from string
export function loadBlacklistFromString(txt: string): string[] {
  return txt.trim().split('\n').map(l => l.trim()).filter(Boolean);
}

// Function to export products to HTML string
export function exportProductsToHtml(products: any[], columns: string[]): string {
  let html = '<table><tr>' + columns.map(c => `<td>${c}</td>`).join('') + '</tr>';
  for (const p of products) {
    html += '<tr>' + columns.map(c => `<td>${p[c]}</td>`).join('') + '</tr>';
  }
  html += '</table>';
  return html;
}

// Function to export withdrawn products to CSV string
export function exportWithdrawnToCsv(withdrawn: any[], columns: string[]): string {
  let csv = columns.join(',') + '\n';
  for (const r of withdrawn) {
    csv += columns.map(c => r[c]).join(',') + '\n';
  }
  return csv;
}

// Function to export blacklist to TXT string
export function exportBlacklistToTxt(blacklist: string[]): string {
  return blacklist.join('\n');
}
