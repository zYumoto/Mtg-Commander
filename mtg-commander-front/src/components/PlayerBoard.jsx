import { useState } from "react";
import { useGame } from "../context/GameContext.jsx";

function PlayerBoard({ player }) {
  const { updatePlayerLife } = useGame();
  const [hand, setHand] = useState([]);

  function addCard(card) {
    setHand((prev) => [...prev, card]);
  }

  return (
    <div className="player-board">
      <div className="player-header">
        <h3>{player.name}</h3>
        <div className="life-controls">
          <button onClick={() => updatePlayerLife(player.name, -1)}>-</button>
          <span className="life-value">{player.life}</span>
          <button onClick={() => updatePlayerLife(player.name, +1)}>+</button>
        </div>
      </div>

      {/* MÃO */}
      <div className="zone">
        <strong>Mão:</strong>
        <div className="hand-cards" style={{ display: "flex", gap: "8px", marginTop: "8px", overflowX: "auto" }}>
          {hand.map((c, i) => (
            <img
              key={i}
              src={c.image_uris?.small}
              alt={c.name}
              title={c.name}
              style={{ width: "80px", borderRadius: "6px" }}
            />
          ))}
        </div>
      </div>

      <div className="zones" style={{ marginTop: "1rem" }}>
        <div className="zone">Campo</div>
        <div className="zone">Cemitério</div>
        <div className="zone">Exílio</div>
      </div>

      {/* botão temporário para testes */}
      {player.name === "Victor" && (
        <p style={{ fontSize: "0.7rem", color: "#888" }}>
          As cartas aparecem só pra você (ainda não sincronizamos entre jogadores).
        </p>
      )}
    </div>
  );
}

export default PlayerBoard;
