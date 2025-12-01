import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Header() {
  const { roomCode } = useGame();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const displayName =
    user?.nickname || user?.fullName || user?.email || "Jogador";

  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/lobby" className="logo-text">
          Commander Online
        </Link>

        {isAuthenticated && (
          <nav className="nav-links">
            <Link to="/lobby">Lobby</Link>
            <Link to="/decks">Meus Decks</Link>
          </nav>
        )}
      </div>

      <div className="header-right">
        {roomCode && (
          <span className="room-pill">
            Sala: <strong>{roomCode}</strong>
          </span>
        )}

        {!loading && isAuthenticated && user && (
          <>
            <Link to="/profile" className="user-chip">
              <div className="avatar-circle">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={displayName} />
                ) : (
                  <span>{firstLetter}</span>
                )}
              </div>
              <span className="user-name">{displayName}</span>
            </Link>
            <button type="button" className="btn-ghost" onClick={handleLogout}>
              Sair
            </button>
          </>
        )}

        {!loading && !isAuthenticated && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Registrar</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
