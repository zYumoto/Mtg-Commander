import React, { useState } from "react";
import { useGame } from "../context/GameContext.jsx";

function PlayerHud({ player, onPassTurn, onLifeChange }) {
  const { playerName } = useGame();
  const isSelf = player?.name === playerName;

  const life = player?.life ?? 40;
  const hand = player?.hand || [];

  // por enquanto só contadores visuais
  const graveyard = player?.graveyard || [];
  const battlefield = player?.battlefield || [];
  const exile = player?.exile || [];

  // carta atualmente em foco (para o zoom)
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div className="player-hud">
      {/* ===== TOPO: VIDA | NICK | PASSAR TURNO ===== */}
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
        {/* QUADRO PRINCIPAL */}
        <div className="board-main">
          {/* Linha de cima: Commander à esquerda / Cemitério à direita */}
          <div className="board-top-row">
            <div className="board-left-column">
              <div className="board-rect board-commander">
                <div className="board-rect-title">Commander</div>
                <p className="board-helper">
                  Em breve puxaremos o commander direto do deck salvo.
                </p>
              </div>
            </div>

            <div className="board-center-spacer" />

            <div className="board-rect board-cemetery">
              <div className="board-rect-title">Cemitério</div>
              <p className="board-helper">
                {graveyard.length} carta
                {graveyard.length === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          {/* Linha do meio: PERMANENTES 1 e 2 */}
          <div className="board-row">
            <div className="board-rect board-zone">
              <div className="board-rect-title">Permanentes 1 - Criaturas</div>
              <p className="board-helper">
                Em breve: criaturas, artefatos de criatura, etc. (
                {battlefield.length} permanentes no campo).
              </p>
            </div>

            <div className="board-rect board-zone">
              <div className="board-rect-title">Permanentes 2 - Encantamentos</div>
              <p className="board-helper">
                Em breve: encantamentos, planeswalkers, etc. ({exile.length} cartas
                exiladas).
              </p>
            </div>
          </div>

          {/* Linha de baixo: LANDS */}
          <div className="board-row lands-row">
            <div className="board-rect board-zone board-lands">
              <div className="board-rect-title">Lands</div>
              <p className="board-helper">
                Em breve: terrenos virados / desvirados.
              </p>
            </div>
          </div>
        </div>

        {/* FAIXA DA MÃO */}
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
