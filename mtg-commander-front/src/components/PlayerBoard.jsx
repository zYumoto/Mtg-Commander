import { useGame } from "../context/GameContext.jsx";

function PlayerBoard({ player }) {
  const { updatePlayerLife } = useGame();

  // A mão vem DIRETO do backend (socket.io)
  const hand = player.hand || [];

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

        <div
          className="hand-cards"
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "8px",
            overflowX: "auto",
            paddingBottom: "8px"
          }}
        >
          {hand.map((c) => (
            <img
              key={c.instanceId}
              src={c.image_uris?.small}
              alt={c.name}
              title={c.name}
              style={{
                width: "80px",
                borderRadius: "6px",
              }}
            />
          ))}
        </div>
      </div>

      <div className="zones" style={{ marginTop: "1rem" }}>
        <div className="zone">Campo</div>
        <div className="zone">Cemitério</div>
        <div className="zone">Exílio</div>
      </div>
    </div>
  );
}

export default PlayerBoard;
