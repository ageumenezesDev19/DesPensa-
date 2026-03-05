import React from 'react';
import SearchBar from '../components/SearchBar';
import FileUpload from '../components/FileUpload';
import ProductTable from '../components/ProductTable';
import { useInventoryContext } from '../context/InventoryContext';
import { ImportMode } from '../components/FileUpload';
import { useTranslation } from 'react-i18next';

export const InventoryView: React.FC = () => {
    const { t } = useTranslation();
    const {
        products,
        setLoading,
        handleLoadProducts
    } = useInventoryContext();

    return (
        <>
            <SearchBar />
            <div className="controls">
                <FileUpload
                    setLoading={setLoading}
                    onFileUpload={(content, mode) => handleLoadProducts(content, mode as ImportMode)}
                    label={t('inventory.importHtml', 'Importar produtos.html')}
                    accept=".html"
                />
            </div>
            <ProductTable products={products} />
        </>
    );
};
