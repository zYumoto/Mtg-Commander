import React, { useEffect, useState } from "react";
import "./SettingsModal.css";

export default function SettingsModal({ open, onClose }) {
  const [tab, setTab] = useState("account");

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);

    // trava scroll do fundo
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      {/* backdrop: clique fora fecha */}
      <button className="settings-backdrop" onClick={onClose} aria-label="Fechar" />

      <div className="settings-window">
        <div className="settings-inner">
          {/* LEFT NAV */}
          <aside className="settings-left">
            <div className="settings-title">Configurações</div>

            <div className="settings-menu">
              <button
                className={`settings-tab ${tab === "account" ? "active" : ""}`}
                onClick={() => setTab("account")}
              >
                Configurações da conta
              </button>

              <button
                className={`settings-tab ${tab === "audio" ? "active" : ""}`}
                onClick={() => setTab("audio")}
              >
                Audio
              </button>

              <button
                className={`settings-tab ${tab === "keys" ? "active" : ""}`}
                onClick={() => setTab("keys")}
              >
                Teclas
              </button>

              <button
                className={`settings-tab ${tab === "prefs" ? "active" : ""}`}
                onClick={() => setTab("prefs")}
              >
                Preferencias
              </button>
            </div>

            <button className="settings-close" onClick={onClose}>
              Fechar
            </button>
          </aside>

          {/* RIGHT CONTENT */}
          <main className="settings-right">
            {tab === "account" && <Placeholder title="Configurações da conta" />}
            {tab === "audio" && <Placeholder title="Audio" />}
            {tab === "keys" && <Placeholder title="Teclas" />}
            {tab === "prefs" && <Placeholder title="Preferencias" />}
          </main>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ title }) {
  return (
    <div className="settings-content">
      <div className="settings-content-title">{title}</div>
      <div className="settings-content-hint">
        Conteúdo dessa aba a gente implementa depois.
      </div>
    </div>
  );
}
