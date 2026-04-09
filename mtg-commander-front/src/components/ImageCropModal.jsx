import React, { useEffect, useMemo, useState } from "react";
import "./ImageCropModal.css";

const PRESETS = {
  avatar: { width: 512, height: 512, label: "Avatar" },
  banner: { width: 1600, height: 520, label: "Banner" },
  showcase: { width: 1200, height: 1400, label: "Foto personalizada" },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function ImageCropModal({ open, source, variant = "avatar", onClose, onApply }) {
  const preset = PRESETS[variant] || PRESETS.avatar;
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }, [open, source, variant]);

  const aspectRatio = useMemo(
    () => `${preset.width} / ${preset.height}`,
    [preset.height, preset.width]
  );

  if (!open || !source) return null;

  async function handleApply() {
    setSaving(true);
    try {
      const image = await loadImage(source);
      const canvas = document.createElement("canvas");
      canvas.width = preset.width;
      canvas.height = preset.height;
      const ctx = canvas.getContext("2d");

      const baseScale = Math.max(
        preset.width / image.width,
        preset.height / image.height
      );
      const finalScale = baseScale * zoom;
      const drawWidth = image.width * finalScale;
      const drawHeight = image.height * finalScale;
      const x = (preset.width - drawWidth) / 2 + offsetX;
      const y = (preset.height - drawHeight) / 2 + offsetY;

      ctx.clearRect(0, 0, preset.width, preset.height);
      ctx.drawImage(image, x, y, drawWidth, drawHeight);

      onApply?.(canvas.toDataURL("image/jpeg", 0.92));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cropModal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="cropModal__backdrop"
        onClick={onClose}
        aria-label="Fechar editor"
      />

      <div className="cropModal__window">
        <div className="cropModal__header">
          <div>
            <h2>{preset.label}</h2>
            <p>Ajuste zoom e posicao para encaixar a imagem.</p>
          </div>
          <button type="button" className="cropModal__close" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="cropModal__preview" style={{ aspectRatio }}>
          <img
            src={source}
            alt={preset.label}
            style={{
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
            }}
          />
        </div>

        <div className="cropModal__controls">
          <label>
            Zoom
            <input
              type="range"
              min="1"
              max="2.5"
              step="0.01"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          <label>
            Horizontal
            <input
              type="range"
              min="-320"
              max="320"
              step="1"
              value={offsetX}
              onChange={(e) => setOffsetX(Number(e.target.value))}
            />
          </label>

          <label>
            Vertical
            <input
              type="range"
              min="-320"
              max="320"
              step="1"
              value={offsetY}
              onChange={(e) => setOffsetY(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="cropModal__actions">
          <button type="button" className="cropModal__secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" onClick={handleApply} disabled={saving}>
            {saving ? "Aplicando..." : "Aplicar imagem"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImageCropModal;
