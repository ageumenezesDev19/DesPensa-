import React, { createContext, useContext, useState, ReactNode } from "react";
import { Product } from "../utils/inventory";
import { Withdrawn } from "../components/WithdrawnTable";
import { useNotification } from "../hooks/useNotification";
import { useInventory } from "../hooks/useInventory";
import { useViewManager } from "../hooks/useViewManager";
import { useFileHandlers } from "../hooks/useFileHandlers";
import { useSearch, SearchMode } from "../hooks/useSearch";
import { formatDateForDB } from "../utils/date";
import { ImportMode } from "../components/FileUpload";
import { useTranslation } from "react-i18next";

export interface ProductWithQuantity extends Product {
  usedQuantity: number;
}

interface InventoryContextType {
  // State
  products: Product[];
  withdrawn: Withdrawn[];
  blacklist: string[];
  loading: boolean;
  notification: string | null;
  view: string;
  
  // Search State
  searchResult: { status: string; products?: Product[]; combination?: ProductWithQuantity[] } | null;
  searching: boolean;
  showCancel: boolean;
  price: string;
  searchMode: SearchMode;
  focusSearchInput: boolean;
  
  // Setters
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setWithdrawn: React.Dispatch<React.SetStateAction<Withdrawn[]>>;
  setBlacklist: React.Dispatch<React.SetStateAction<string[]>>;
  setLoading: (loading: boolean) => void;
  setView: (view: any) => void;
  setSearchResult: (result: any) => void;
  setPrice: (price: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  setFocusSearchInput: (focus: boolean) => void;

  // Actions
  handleLoadProducts: (htmlContent: string, mode: ImportMode) => void;
  handleLoadWithdrawn: (csvContent: string) => void;
  handleLoadBlacklist: (textContent: string) => void;
  handleDownload: (filename: string, content: string) => void;
  handleWithdrawSingleProduct: (product: Product) => void;
  handleWithdrawCombination: (combination: ProductWithQuantity[]) => void;
  handleDeleteProduct: (product: Product) => void;
  handleRestoreProduct: (product: Product) => void;
  handleDeleteWithdrawn: (id: string) => void;
  handleClearData: (type: "products" | "withdrawn" | "all") => void;
  handleSearch: (isRecalculation?: boolean) => void;
  handleRecalculate: () => void;
  handleCancelSearch: () => void;
  showNotification: (message: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const useInventoryContext = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventoryContext must be used within an InventoryProvider");
  }
  return context;
};

export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [searchMode, setSearchMode] = useState<SearchMode>("combination");
  const [focusSearchInput, setFocusSearchInput] = useState<boolean>(true);

  const { notification, showNotification } = useNotification();
  const { products, setProducts, withdrawn, setWithdrawn, blacklist, setBlacklist } = useInventory();
  const { view, setView } = useViewManager("inventory");

  const {
    handleLoadProducts, handleLoadWithdrawn, handleLoadBlacklist, handleDownload
  } = useFileHandlers({
    setLoading,
    setProducts,
    products,
    setWithdrawn,
    setBlacklist,
    showNotification,
    t,
  });

  const {
    searchResult,
    setSearchResult,
    searching,
    showCancel,
    handleCancelSearch,
    handleRecalculate,
    handleSearch
  } = useSearch({
    products,
    blacklist,
    price,
    searchMode,
    showNotification,
  });

  const handleWithdraw = (productToWithdraw: Product, quantity: number = 1) => {
    setProducts(prevProducts => {
      const newProducts = prevProducts
        .map(p =>
          p.code === productToWithdraw.code
            ? { ...p, quantity: p.quantity - quantity }
            : p
        )
        .filter(p => p.quantity > 0);
      return newProducts;
    });

    const formattedDate = formatDateForDB(new Date());

    const withdrawnProduct: Withdrawn = {
      id: `${productToWithdraw.code}-${Date.now()}`,
      product: productToWithdraw,
      withdrawnQuantity: quantity,
      date: formattedDate,
    };

    setWithdrawn(prevWithdrawn => [...prevWithdrawn, withdrawnProduct]);
  };

  const handleWithdrawSingleProduct = (product: Product) => {
    setLoading(true);
    handleWithdraw(product, 1);
    setLoading(false);
    showNotification(t('inventory.notifications.productWithdrawn', { name: product.description, defaultValue: `Product ${product.description} withdrawn from stock.` }));
    setFocusSearchInput(true);
    setPrice("");
    setSearchResult(null);
  };

  const handleWithdrawCombination = (combination: ProductWithQuantity[]) => {
    setLoading(true);

    const withdrawnProductsMap = new Map<string, number>();
    combination.forEach(p => {
      withdrawnProductsMap.set(p.code, (withdrawnProductsMap.get(p.code) || 0) + p.usedQuantity);
    });

    setProducts(prevProducts => {
      return prevProducts
        .map(p => {
          if (withdrawnProductsMap.has(p.code)) {
            return { ...p, quantity: p.quantity - withdrawnProductsMap.get(p.code)! };
          }
          return p;
        })
        .filter(p => p.quantity > 0);
    });

    const today = new Date();
    const formattedDate = formatDateForDB(today);
    const newWithdrawnList: Withdrawn[] = combination.map(p => ({
      id: `${p.code}-${Date.now()}`,
      product: p,
      withdrawnQuantity: p.usedQuantity,
      date: formattedDate,
    }));

    setWithdrawn(prevWithdrawn => [...prevWithdrawn, ...newWithdrawnList]);

    const totalItems = combination.reduce((acc, p) => acc + p.usedQuantity, 0);

    setLoading(false);
    showNotification(t('inventory.notifications.itemsWithdrawn', { count: totalItems, defaultValue: `${totalItems} items withdrawn from stock.` }));
    setFocusSearchInput(true);
    setPrice("");
    setSearchResult(null);
  };

  const handleDeleteProduct = (product: Product) => {
    setProducts(prevProducts => prevProducts.filter(p => p.code !== product.code));
  };

  const handleRestoreProduct = (product: Product) => {
    setProducts(prevProducts => {
      // Find if it already exists (though it shouldn't if deleted)
      const exists = prevProducts.some(p => p.code === product.code);
      if (exists) return prevProducts;
      return [...prevProducts, product];
    });
  };

  const handleDeleteWithdrawn = (id: string) => {
    const withdrawnToRestore = withdrawn.find(r => r.id === id);
    if (!withdrawnToRestore) return;

    setProducts(prevProducts => {
      const existingProduct = prevProducts.find(p => p.code === withdrawnToRestore.product.code);
      if (existingProduct) {
        return prevProducts.map(p => 
          p.code === withdrawnToRestore.product.code 
            ? { ...p, quantity: p.quantity + withdrawnToRestore.withdrawnQuantity } 
            : p
        );
      } else {
        return [...prevProducts, { ...withdrawnToRestore.product, quantity: withdrawnToRestore.withdrawnQuantity }];
      }
    });

    setWithdrawn(prevWithdrawn => prevWithdrawn.filter(r => r.id !== id));
    showNotification(t('inventory.notifications.itemReturned', 'Item returned to stock.'));
  };

  const handleClearData = (type: "products" | "withdrawn" | "all") => {
    if (type === "products" || type === "all") {
      setProducts([]);
    }
    if (type === "withdrawn" || type === "all") {
      setWithdrawn([]);
    }
    if (type === "all") {
      setBlacklist([]);
    }
    const message = {
      products: "Stock data cleared.",
      withdrawn: "Withdrawn data cleared.",
      all: "All data cleared."
    };
    showNotification(message[type]);
  };

  const value = {
    products,
    withdrawn,
    blacklist,
    loading,
    notification,
    view,
    searchResult,
    searching,
    showCancel,
    price,
    searchMode,
    focusSearchInput,
    setProducts,
    setWithdrawn,
    setBlacklist,
    setLoading,
    setView,
    setSearchResult,
    setPrice,
    setSearchMode,
    setFocusSearchInput,
    handleLoadProducts,
    handleLoadWithdrawn,
    handleLoadBlacklist,
    handleDownload,
    handleWithdrawSingleProduct,
    handleWithdrawCombination,
    handleDeleteProduct,
    handleRestoreProduct,
    handleDeleteWithdrawn,
    handleClearData,
    handleSearch,
    handleRecalculate,
    handleCancelSearch,
    showNotification
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
