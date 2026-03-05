import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { InventoryProvider } from "./context/InventoryContext";
import "./i18n"; // Make sure i18n is initialized

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <InventoryProvider>
      <App />
    </InventoryProvider>
  </React.StrictMode>,
);
