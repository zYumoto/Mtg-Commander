import React from "react";

function PlayerHud({ player, onPassTurn, onLifeChange }) {
  return (
    <div className="player-hud">

      {/* === TOP BAR === */}
            <div className="hud-topbar">
        <div className="hud-life-pill">
          <button
            type="button"
            className="hud-life-btn"
            onClick={() => onLifeChange && onLifeChange(-1)}
          >
            −
          </button>

          <span className="hud-life-value">{player.life}</span>

          <button
            type="button"
            className="hud-life-btn"
            onClick={() => onLifeChange && onLifeChange(+1)}
          >
            +
          </button>
        </div>

        <div className="hud-nick">
          {player.name}
        </div>

        <button className="hud-pass" onClick={onPassTurn}>
          PASSAR TURNO
        </button>
      </div>


      {/* === MAIN GRID === */}
      <div className="hud-grid">

        {/* COLUNA ESQUERDA */}
        <div className="hud-left">
          <div className="hud-box small">CARD LIST</div>
          <div className="hud-box small">COMMANDER</div>
        </div>

        {/* ÁREA CENTRAL */}
        <div className="hud-center">

          <div className="hud-box medium">
            PERMANENTES 1 – CRIATURAS
          </div>

          <div className="hud-box medium">
            PERMANENTES 2 – ENCANTAMENTOS
          </div>

          <div className="hud-box medium">
            LANDS
          </div>

        </div>

        {/* COLUNA DIREITA */}
        <div className="hud-right">
          <div className="hud-box small">CEMITÉRIO</div>
        </div>
      </div>

      {/* === HAND (BOTTOM) === */}
      <div className="hud-hand">
        {(player.hand || []).map((card, i) => {
          // inclinação nas pontas
          const angle = (i === 0 ? -12 : i === player.hand.length - 1 ? 12 : 0);

          return (
            <div
              key={card.instanceId}
              className="hud-hand-card"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              {card.image_uris?.small ? (
                <img src={card.image_uris.small} alt={card.name} />
              ) : (
                <div className="hud-card-placeholder">{card.name}</div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default PlayerHud;
