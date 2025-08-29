import React from "react";
import "../styles/Loader.scss";

type LoaderProps = { overlay?: boolean };

const Loader: React.FC<LoaderProps> = ({ overlay = true }) => (
  overlay ? (
    <div className="loader-overlay">
      <div className="loader"></div>
    </div>
  ) : (
    <div className="loader"></div>
  )
);

export default Loader;