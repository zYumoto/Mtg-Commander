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

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <button
        className="settings-backdrop"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div className="settings-window">
        <div className="settings-inner">
          <aside className="settings-left">
            <div className="settings-titleWrap">
              <span className="settings-kicker">Commander control</span>
              <div className="settings-title">Configuracoes</div>
              <p className="settings-subtitle">
                Ajuste conta, audio, teclas e preferencias gerais da mesa.
              </p>
            </div>

            <div className="settings-menu">
              <button
                className={`settings-tab ${tab === "account" ? "active" : ""}`}
                onClick={() => setTab("account")}
              >
                Conta
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
              Fechar painel
            </button>
          </aside>

          <main className="settings-right">
            {tab === "account" && (
              <Placeholder
                eyebrow="Conta"
                title="Configuracoes da conta"
                description="Centralize preferencias de acesso, identidade e opcoes relacionadas ao seu perfil dentro da plataforma."
              />
            )}
            {tab === "audio" && (
              <Placeholder
                eyebrow="Audio"
                title="Mixagem da mesa"
                description="Controle volume, notificacoes e futuros canais de som sem sair da tela principal."
              />
            )}
            {tab === "keys" && (
              <Placeholder
                eyebrow="Teclas"
                title="Atalhos e comandos"
                description="Reserve este espaco para remapeamento de teclas e automacoes de interacao durante a partida."
              />
            )}
            {tab === "prefs" && (
              <Placeholder
                eyebrow="Preferencias"
                title="Ajustes gerais"
                description="Concentre aqui opcoes de interface, comportamento visual, mesa e futuras preferencias persistentes."
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ eyebrow, title, description }) {
  return (
    <div className="settings-content">
      <div className="settings-contentHead">
        <span className="settings-contentEyebrow">{eyebrow}</span>
        <div className="settings-content-title">{title}</div>
        <div className="settings-content-hint">{description}</div>
      </div>

      <div className="settings-placeholderGrid">
        <article className="settings-placeholderCard">
          <strong>Painel em preparacao</strong>
          <p>Essa aba ja esta no layout novo e pronta para receber controles reais.</p>
        </article>
        <article className="settings-placeholderCard">
          <strong>Proximo passo</strong>
          <p>Quando voce quiser, eu posso transformar esta estrutura em configuracoes funcionais.</p>
        </article>
      </div>
    </div>
  );
}
