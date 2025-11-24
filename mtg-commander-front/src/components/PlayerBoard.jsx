import { useGame } from '../context/GameContext.jsx';

function PlayerBoard({ player }) {
  const { updatePlayerLife } = useGame();

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
      <div className="zones">
        <div className="zone">Mão</div>
        <div className="zone">Campo</div>
        <div className="zone">Cemitério</div>
        <div className="zone">Exílio</div>
      </div>
    </div>
  );
}

export default PlayerBoard;
