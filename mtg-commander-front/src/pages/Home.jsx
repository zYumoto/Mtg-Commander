import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

function Home() {
  const navigate = useNavigate();
  const { playerName, setPlayerName } = useGame();

  function handleSubmit(e) {
    e.preventDefault();
    if (!playerName.trim()) return;
    navigate('/lobby');
  }

  return (
    <section className="page-center">
      <h1>Bem-vindo ao Commander Online</h1>
      <p>Digite seu nome para entrar no lobby e criar/entrar em uma sala.</p>
      <form onSubmit={handleSubmit} className="form-card">
        <label>
          Seu nome:
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Ex: Victor"
          />
        </label>
        <button type="submit">Continuar</button>
      </form>
    </section>
  );
}

export default Home;
