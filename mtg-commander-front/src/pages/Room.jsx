import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from "../context/GameContext.jsx";
import PlayerBoard from "../components/Playerboard.jsx";
import Chat from "../components/chat.jsx";
import CardSearch from "../components/CardSearch.jsx";
import { useState } from "react";


function Room() {


const [selectedCard, setSelectedCard] = useState(null);


  const { code } = useParams();
  const navigate = useNavigate();
  const { players, playerName, roomCode } = useGame();

  if (!playerName || !roomCode) {
    // se recarregar a página e perder o contexto, volta pro inícioV
    navigate('/');
  }

  return (
    <section className="room">
      <header className="room-header">
        <h2>Sala {code}</h2>
        <p>Compartilhe esse código com seus amigos. (na V2 o backend vai cuidar dos outros jogadores)</p>
      </header>

      <div className="room-content">
        <div className="players-area">
          {players.map((p) => (
            <PlayerBoard key={p.id} player={p} />
          ))}
        </div>
        <div className="sidebar">
          <CardSearch onCardSelected={(card) => setSelectedCard(card)} />

          <Chat />
        </div>
      </div>
    </section>
  );
}

export default Room;
