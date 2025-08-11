import React from "react";
import "../styles/Loader.scss";

const Loader: React.FC = () => (
  <div className="loader-overlay">
    <div className="loader"></div>
  </div>
);

export default Loader;