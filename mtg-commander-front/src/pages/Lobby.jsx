import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext.jsx";

function Lobby() {
  const navigate = useNavigate();
  const { playerName, joinRoom } = useGame();
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [createRandom, setCreateRandom] = useState("");

  function handleCreateRoom(e) {
    e.preventDefault();
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    joinRoom({ name: playerName, room: code });
    setCreateRandom(code);
    navigate(`/room/${code}`);
  }

  function handleJoinRoom(e) {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;
    joinRoom({ name: playerName, room: code });
    navigate(`/room/${code}`);
  }

  return (
    <section className="page-center">
      <h1>Lobby</h1>
      <p>Bem-vindo, {playerName || "jogador"}! Crie ou entre em uma sala.</p>

      <div className="form-card">
        <h3>Criar sala aleatória</h3>
        <button onClick={handleCreateRoom}>Criar sala</button>
        {createRandom && (
          <p className="info">
            Sala criada com código: <strong>{createRandom}</strong>
            <br />
            Compartilhe esse código com seus amigos.
          </p>
        )}
      </div>

      <div className="form-card">
        <h3>Entrar em sala por código</h3>
        <form onSubmit={handleJoinRoom}>
          <label>
            Código da sala
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder="Ex: ABCD1"
            />
          </label>
          <button type="submit">Entrar</button>
        </form>
      </div>
    </section>
  );
}

export default Lobby;
