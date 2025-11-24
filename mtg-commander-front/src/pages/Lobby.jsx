import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

function Lobby() {
  const navigate = useNavigate();
  const { playerName, joinRoom } = useGame();
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [createRandom, setCreateRandom] = useState('');

  if (!playerName) {
    navigate('/');
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    const code = roomCodeInput.toUpperCase();
    joinRoom({ name: playerName, room: code });
    navigate(`/room/${code}`);
  }

  function handleCreateRoom() {
    const code = (Math.random().toString(36).substring(2, 6)).toUpperCase();
    setCreateRandom(code);
    joinRoom({ name: playerName, room: code });
    navigate(`/room/${code}`);
  }

  return (
    <section className="page-center">
      <h2>Lobby</h2>
      <p>Olá, {playerName}! Crie uma sala nova ou entre em uma já existente.</p>

      <div className="form-card">
        <h3>Entrar em sala existente</h3>
        <form onSubmit={handleJoin}>
          <label>
            Código da sala:
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              placeholder="Ex: AB12"
              maxLength={6}
            />
          </label>
          <button type="submit">Entrar na sala</button>
        </form>
      </div>

      <div className="form-card">
        <h3>Ou criar uma nova sala</h3>
        <button type="button" onClick={handleCreateRoom}>
          Criar sala aleatória
        </button>
        {createRandom && (
          <p className="info">
            Sala criada com código: <strong>{createRandom}</strong>  
            <br />Compartilhe esse código com seus amigos.
          </p>
        )}
      </div>
    </section>
  );
}

export default Lobby;
