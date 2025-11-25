import { Link, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

function Header() {
  const { playerName, roomCode } = useGame();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="header">
      <div className="header-left">
        <Link to="/" className="logo">
          MTG Commander Hub
        </Link>
      </div>

      <div className="header-right" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        {roomCode && (
          <span>
            Sala: <strong>{roomCode}</strong>
          </span>
        )}

        {playerName && (
          <span>
            Jogador: <strong>{playerName}</strong>
          </span>
        )}

        {!loading && (
          <>
            {isAuthenticated ? (
              <>
                <span>
                  Logado como: <strong>{user?.nickname}</strong>
                </span>
                <button onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Registrar</Link>
              </>
            )}
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
