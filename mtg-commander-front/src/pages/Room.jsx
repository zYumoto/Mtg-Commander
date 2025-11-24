import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext.jsx";
import PlayerBoard from "../components/PlayerBoard.jsx";
import Chat from "../components/Chat.jsx";
import CardSearch from "../components/CardSearch.jsx";

function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { players, playerName, roomCode } = useGame();

  if (!playerName || !roomCode) {
    navigate("/");
  }

  return (
    <section className="room">
      <header className="room-header">
        <h2>Sala {code}</h2>
        <p>
          Use a busca de cartas para adicionar cartas à sua mão. Todos os
          jogadores verão as cartas sincronizadas.
        </p>
      </header>

      <div className="room-content">
        <div className="players-area">
          {players.map((p) => (
            <PlayerBoard key={p.id} player={p} />
          ))}
        </div>

        <div className="sidebar">
          <CardSearch />
          <Chat />
        </div>
      </div>
    </section>
  );
}

export default Room;
