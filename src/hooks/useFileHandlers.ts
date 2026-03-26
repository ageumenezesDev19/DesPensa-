import {
  loadHtmlDataFromString,
  loadWithdrawnFromString
} from '../utils/db_utils';

import { loadBlacklistFromString } from '../utils/blacklist_utils';
import { Product } from '../utils/inventory';
import { Withdrawn } from '../components/WithdrawnTable';
import { ImportMode } from '../components/FileUpload';

interface FileHandlerProps {
  setLoading: (loading: boolean) => void;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  products: Product[];
  setWithdrawn: (withdrawn: Withdrawn[]) => void;
  setBlacklist: (blacklist: string[]) => void;
  showNotification: (message: string) => void;
  t: (key: string, options?: any) => string;
}

export const useFileHandlers = ({
  setLoading,
  setProducts,
  products,
  setWithdrawn,
  setBlacklist,
  showNotification,
  t,
}: FileHandlerProps) => {

  const handleLoadProducts = (htmlContent: string, mode: ImportMode, ignoreNcm: boolean = false) => {
    setLoading(true);
    try {
      const { df: processedData } = loadHtmlDataFromString(htmlContent, { ignoreNcm });

      console.log(`[handleLoadProducts] Loaded ${processedData.length} products`);
      console.log(`[handleLoadProducts] First product:`, processedData[0]);

      if (mode === 'replace') {
        setProducts(processedData);
        console.log(`[handleLoadProducts] Products replaced. Total: ${processedData.length}`);
        showNotification(t('inventory.notifications.replaceSuccess', { count: processedData.length, defaultValue: `Stock replaced successfully! (${processedData.length} products)` }));
      } else { // mode === 'add'
        setProducts(prevProducts => {
          const productsMap = new Map(prevProducts.map(p => [p.code, p]));
          
          processedData.forEach(newProduct => {
            const existingProduct = productsMap.get(newProduct.code);
            if (existingProduct) {
              const updatedProduct = {
                ...existingProduct,
                quantity: existingProduct.quantity + newProduct.quantity,
              };
              productsMap.set(newProduct.code, updatedProduct);
            } else {
              productsMap.set(newProduct.code, newProduct);
            }
          });

          const result = Array.from(productsMap.values());
          console.log(`[handleLoadProducts] Products added. Total: ${result.length}`);
          return result;
        });
        showNotification(t('inventory.notifications.addSuccess', { count: processedData.length, defaultValue: `Products added to stock successfully! (${processedData.length} products)` }));
      }

    } catch (error) {
      console.error("Failed to load products:", error);
      showNotification(t('inventory.notifications.loadError', 'Error loading products.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadWithdrawn = (csvContent: string) => {
    setLoading(true);
    try {
      const withdrawnData = loadWithdrawnFromString(csvContent);
      const newWithdrawn = withdrawnData.map((r: any) => {
        const fullProduct = products.find(p => p.code === r.code);
        const productForWithdrawn: Product = fullProduct || {
          code: r.code || r['Código'],
          description: r.description || r['Descrição'],
          salePrice: Number(r.salePrice || r['Preço Venda']),
          barcode: '',
          unitOut: '',
          supplier: '',
          quantity: 0,
          costPrice: 0,
          profitMargin: 0,
          csosn: '',
          elo: '',
        };

        return {
          id: r.id || `${r.code || r['Código']}-${Date.now()}`,
          product: productForWithdrawn,
          withdrawnQuantity: Number(r.withdrawnQuantity || r['Quantidade Retirada']),
          date: r.date || r.Data,
        };
      });
      setWithdrawn(newWithdrawn);
      showNotification(t('inventory.notifications.withdrawnLoadSuccess', 'Withdrawn loaded successfully!'));
    } catch (error) {
      console.error("Failed to load withdrawn products:", error);
      showNotification(t('inventory.notifications.withdrawnLoadError', 'Error loading withdrawn.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadBlacklist = (textContent: string) => {
    setLoading(true);
    try {
      const blacklistItems = loadBlacklistFromString(textContent);
      setBlacklist(blacklistItems);
      showNotification(t('inventory.notifications.blacklistLoadSuccess', 'Blacklist loaded successfully!'));
    } catch (error) {
      console.error("Failed to load blacklist:", error);
      showNotification(t('inventory.notifications.blacklistLoadError', 'Error loading blacklist.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (filename: string, content: string) => {
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      
      if (isTauri) {
        try {
          const { save } = await import('@tauri-apps/plugin-dialog');
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          
          const filePath = await save({
            defaultPath: filename,
            filters: [{ name: 'All Files', extensions: ['*'] }]
          });
          
          if (filePath) {
            await writeTextFile(filePath, content);
            showNotification(t('inventory.notifications.fileSaved', { filename, defaultValue: `${filename} was saved successfully!` }));
          }
        } catch (tauriErr) {
          console.error("Tauri save error, falling back to web download:", tauriErr);
          webDownload(filename, content);
        }
      } else {
        webDownload(filename, content);
      }
    } catch (error) {
      console.error("Error saving file:", error);
      showNotification(t('inventory.notifications.fileSaveError', 'An error occurred while saving the file.'));
    }
  };

  const webDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(t('inventory.notifications.fileSaved', { filename, defaultValue: `${filename} was saved successfully!` }));
  };

  return { handleLoadProducts, handleLoadWithdrawn, handleLoadBlacklist, handleDownload };
};
