import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { EstoqueProvider } from "./context/EstoqueContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EstoqueProvider>
      <App />
    </EstoqueProvider>
  </React.StrictMode>,
);
