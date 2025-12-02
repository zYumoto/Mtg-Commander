import React from "react";
import "./ImageModal.css";

function ImageModal({ url, onClose }) {
  if (!url) return null;

  return (
    <div className="imgmodal-overlay" onClick={onClose}>
      <div
        className="imgmodal-content"
        onClick={(e) => e.stopPropagation()} // impede fechar ao clicar na imagem
      >
        <img src={url} alt="Visualização da imagem" />
      </div>
    </div>
  );
}

export default ImageModal;
