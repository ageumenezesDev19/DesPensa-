import React from 'react';
import SearchBar from '../components/SearchBar';
import FileUpload from '../components/FileUpload';
import ProductTable from '../components/ProductTable';
import { useEstoqueContext } from '../context/EstoqueContext';
import { ImportMode } from '../components/FileUpload';

export const ProdutosView: React.FC = () => {
    const {
        produtos,
        setLoading,
        handleLoadProducts
    } = useEstoqueContext();

    // In the original ProdutosView, there was logic for `showGlobalCancel` which was passed from App.
    // In Context, `showCancel` is the state from useSearch. 
    // `showGlobalCancel` in App was: `const showGlobalCancel = searching && showCancel;`
    // Let's replicate that logic or use what's in context.

    return (
        <>
            <SearchBar />
            <div className="controls">
                <FileUpload
                    setLoading={setLoading}
                    onFileUpload={(content, mode) => handleLoadProducts(content, mode as ImportMode)}
                    label="Importar produtos.html"
                    accept=".html"
                />
            </div>
            <ProductTable produtos={produtos} />
        </>
    );
};
