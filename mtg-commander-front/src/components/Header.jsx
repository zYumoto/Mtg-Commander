import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext.jsx';

function Header() {
  const { playerName, roomCode } = useGame();

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="logo">
          MTG Commander Hub
        </Link>
      </div>
      <div className="header-right">
        {playerName && <span>Jogador: <strong>{playerName}</strong></span>}
        {roomCode && <span>Sala: <strong>{roomCode}</strong></span>}
      </div>
    </header>
  );
}

export default Header;
