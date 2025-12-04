// src/components/PlayerBoard.jsx
import React from "react";
import { useGame } from "../context/GameContext.jsx";

function PlayerBoard({ player }) {
  const { updatePlayerLife } = useGame();

  if (!player) return null;

  const hand = player.hand || [];
  const battlefield = player.battlefield || [];
  const graveyard = player.graveyard || [];
  const exile = player.exile || [];

  const handleLifeChange = (delta) => {
    updatePlayerLife(player.name, delta);
  };

  return (
    <div className="player-board">
      {/* Cabeçalho com nome + vida */}
      <div className="player-header">
        <h3>{player.name}</h3>

        <div className="life-controls">
          <button onClick={() => handleLifeChange(-1)}>-</button>

          <span className="life-value">
            {player.life}
          </span>

          <button onClick={() => handleLifeChange(+1)}>+</button>
        </div>
      </div>

      {/* IMPORTANTE: NÃO mostrar a mão aqui */}
      {/* A mão é privada e fica só no PlayerHud */}
      {/* <div className="zone"> ... (REMOVIDO) ... </div> */}

      <div className="zones" style={{ marginTop: "1rem" }}>
        <div className="zone">
          <strong>Permanentes em campo:</strong> {battlefield.length}
        </div>
        <div className="zone">
          <strong>Cemitério:</strong> {graveyard.length}
        </div>
        <div className="zone">
          <strong>Exílio:</strong> {exile.length}
        </div>
        <div className="zone">
          <strong>Cartas na mão:</strong> {hand.length}
        </div>
      </div>
    </div>
  );
}

export default PlayerBoard;
