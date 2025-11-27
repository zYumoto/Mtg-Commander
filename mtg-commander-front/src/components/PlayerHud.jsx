import React, { useState } from "react";
import { useGame } from "../context/GameContext.jsx";

function PlayerHud({ player, onPassTurn, onLifeChange }) {
  const {
    playerName,
    commanderCard: commanderFromContext,
    castCommander,
  } = useGame();

  const isSelf = player?.name === playerName;

  const life = player?.life ?? 40;
  const hand = player?.hand || [];

  // commander pode vir do player (socket) ou do contexto local
  const commanderCard = player?.commanderCard || commanderFromContext || null;
  const commanderCastCount = player?.commanderCastCount || 0;
  const commanderTax = commanderCastCount * 2; // +2 genérico por cast

  const graveyard = player?.graveyard || [];
  const battlefield = player?.battlefield || [];
  const exile = player?.exile || [];

  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div className="player-hud">
      {/* ===== TOPO: VIDA | JOGADOR | PASSAR TURNO ===== */}
      <div className="hud-topbar">
        <div className="hud-life-pill">
          <button
            type="button"
            className="hud-life-btn"
            onClick={() => onLifeChange && onLifeChange(-1)}
          >
            −
          </button>

          <div className="hud-life-value">
            <span>VIDA</span>
            <strong>{life}</strong>
          </div>

          <button
            type="button"
            className="hud-life-btn"
            onClick={() => onLifeChange && onLifeChange(+1)}
          >
            +
          </button>
        </div>

        <div className="hud-player-name">
          <span>JOGADOR</span>
          <strong>
            {player?.name || "Sem nome"}
            {isSelf && " (você)"}
          </strong>
        </div>

        <button className="hud-pass" onClick={onPassTurn}>
          PASSAR TURNO
        </button>
      </div>

      {/* ===== BOARD + MÃO ===== */}
      <div className="hud-board-layout">
        {/* ========== ZONA PRINCIPAL DO BOARD ========== */}
        <div className="board-main">
          {/* LINHA SUPERIOR: COMMANDER + CEMITÉRIO */}
          <div className="board-top-row">
            <div className="board-left-column">
              <div className="board-rect board-commander">
                <div className="board-rect-title">COMMANDER</div>

                {commanderCard ? (
                  <>
                    <img
                      src={
                        commanderCard.image_uris?.normal ||
                        commanderCard.image_uris?.large ||
                        commanderCard.image_uris?.small ||
                        ""
                      }
                      alt={commanderCard.name}
                      style={{
                        width: "160px",
                        borderRadius: "10px",
                        marginTop: "0.5rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
                      }}
                    />

                    <div
                      style={{
                        marginTop: "0.4rem",
                        fontSize: "0.8rem",
                        opacity: 0.85,
                      }}
                    >
                      Já foi conjurado:{" "}
                      <strong>{commanderCastCount}</strong>{" "}
                      vez{commanderCastCount === 1 ? "" : "es"}.
                      <br />
                      Taxa atual:{" "}
                      <strong>+{commanderTax}</strong> mana genérica.
                    </div>

                    {isSelf && (
                      <button
                        type="button"
                        style={{ marginTop: "0.4rem" }}
                        onClick={() => castCommander && castCommander()}
                      >
                        Baixar comandante para o campo
                      </button>
                    )}
                  </>
                ) : (
                  <p className="board-helper">
                    Seu comandante aparecerá aqui quando carregar o deck.
                  </p>
                )}
              </div>
            </div>

            <div className="board-center-spacer" />

            <div className="board-rect board-cemetery">
              <div className="board-rect-title">CEMITÉRIO</div>
              <p className="board-helper">
                {graveyard.length} carta
                {graveyard.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          {/* LINHA DO MEIO */}
          <div className="board-row">
            <div className="board-rect board-zone">
              <div className="board-rect-title">PERMANENTES 1 - CRIATURAS</div>
              <p className="board-helper">
                Em breve: criaturas, artefatos de criatura, etc. (
                {battlefield.length} permanentes no campo).
              </p>
            </div>

            <div className="board-rect board-zone">
              <div className="board-rect-title">
                PERMANENTES 2 - ENCANTAMENTOS
              </div>
              <p className="board-helper">
                Em breve: encantamentos, planeswalkers, etc. ({exile.length}{" "}
                cartas exiladas).
              </p>
            </div>
          </div>

          {/* LINHA DE BAIXO: LANDS */}
          <div className="board-row lands-row">
            <div className="board-rect board-zone board-lands">
              <div className="board-rect-title">LANDS</div>
              <p className="board-helper">
                Em breve: terrenos virados / desvirados.
              </p>
            </div>
          </div>
        </div>

        {/* ========== FAIXA DA MÃO ========== */}
        <div className="board-hand">
          {hand.length === 0 ? (
            <p className="hud-hand-empty">
              Nenhuma carta na mão. Use o painel de deck para comprar cartas.
            </p>
          ) : (
            <div className="board-hand-cards">
              {hand.map((card, index) => (
                <div
                  key={card.instanceId}
                  className="board-hand-card"
                  style={{
                    transform: `translateY(${Math.abs(
                      index - (hand.length - 1) / 2
                    ) * 2}px) rotate(${
                      (index - (hand.length - 1) / 2) * 4
                    }deg)`,
                  }}
                  title={card.name}
                  onMouseEnter={() => setHoveredCard(card)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <img
                    src={
                      card.image_uris?.small ||
                      card.image_uris?.normal ||
                      ""
                    }
                    alt={card.name}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== PREVIEW GRANDE DA CARTA ===== */}
      {hoveredCard && (
        <div className="card-zoom-overlay">
          <img
            src={
              hoveredCard.image_uris?.normal ||
              hoveredCard.image_uris?.large ||
              hoveredCard.image_uris?.small ||
              ""
            }
            alt={hoveredCard.name}
          />
          <div className="card-zoom-title">{hoveredCard.name}</div>
        </div>
      )}
    </div>
  );
}

export default PlayerHud;
