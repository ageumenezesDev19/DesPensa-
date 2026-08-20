export interface CopyableProduct {
  description?: string;
  usedQuantity?: number;
}

export function sanitizeProductNameForCopy(description: string): string {
  return description
    .split('+')[0]
    .replace(/\u00A0/g, ' ')
    .trim();
}

export function buildProductCopyText(product: CopyableProduct): string {
  const qty = product.usedQuantity;
  const isFractional = qty !== undefined && qty % 1 !== 0;
  const includeQuantity = qty !== undefined && (isFractional || qty > 1);
  const productName = sanitizeProductNameForCopy(product.description || '');

  if (!includeQuantity) {
    return productName;
  }

  const quantityStr = isFractional ? qty.toFixed(3).replace('.', ',') : qty.toString();
  return `${quantityStr}*${productName}`;
}
