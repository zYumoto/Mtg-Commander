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
    user?.nickname ||
    user?.fullName ||
    (user?.email ? user.email.split("@")[0] : "Jogador");

  const avatarUrl = user?.avatarUrl;

  return (
    <header className="header">
      <div className="header-left">
        {/* Logo / nome do app */}
        <Link to="/" className="logo-text">
          Commander Online
        </Link>

        {/* Navegação principal – só aparece logado */}
        {isAuthenticated && (
          <nav className="nav-links">
            <Link to="/lobby">Lobby</Link>
            <Link to="/decks">Meus Decks</Link>
            <Link to="/friends">Amigos</Link>
          </nav>
        )}

        {/* Pill da sala atual */}
        {roomCode && (
          <span className="room-pill">
            Sala: <strong>{roomCode}</strong>
          </span>
        )}
      </div>

      <div className="header-right">
        {loading && <span>Carregando...</span>}

        {/* Logado: chip de perfil + botão sair */}
        {!loading && isAuthenticated && (
          <>
            <button
              type="button"
              className="user-chip"
              onClick={() => navigate("/profile")}
            >
              <div className="avatar-circle">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} />
                ) : (
                  (displayName || "?").charAt(0).toUpperCase()
                )}
              </div>
              <span className="user-name">{displayName}</span>
            </button>

            <button type="button" className="btn-ghost" onClick={handleLogout}>
              Sair
            </button>
          </>
        )}

        {/* Não logado: links de auth */}
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
