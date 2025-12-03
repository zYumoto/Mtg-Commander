import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext.jsx";

import PlayerHud from "../components/PlayerHud.jsx";
import Chat from "../components/Chat.jsx";
import DeckPanel from "../components/DeckPanel.jsx";
import PlayerHudMini from "../components/PlayerHudMini.jsx";


function Room() {
  const navigate = useNavigate();
  const { roomCode, playerName, players = [], updatePlayerLife } = useGame();

  // se entrar sem sala (refresh direto na URL, por ex.), volta pro lobby
  if (!roomCode) {
    return (
      <section className="page-center" style={{ maxWidth: "600px" }}>
        <h2>Sala não encontrada</h2>
        <p>Parece que você não está conectado a nenhuma sala.</p>
        <button onClick={() => navigate("/lobby")}>Voltar para o Lobby</button>
      </section>
    );
  }

  // mapeia players para os 4 "lugares" da mesa
  const seats = useMemo(() => {
    const result = {
      top: null,
      left: null,
      right: null,
      bottom: null,
    };

    if (players.length === 0) return result;

    const self = players.find((p) => p.name === playerName);
    const selfPlayer = self || players[0];

    result.bottom = selfPlayer;

    const others = players.filter((p) => p.id !== selfPlayer.id);
    const order = ["top", "left", "right"];

    others.forEach((p, index) => {
      const seatName = order[index];
      if (seatName) result[seatName] = p;
    });

    return result;
  }, [players, playerName]);

  const selfPlayer =
    players.find((p) => p.name === playerName) || seats.bottom || players[0];

  const [focusedId, setFocusedId] = useState(selfPlayer?.id);
  const focusedPlayer =
    players.find((p) => p.id === focusedId) || selfPlayer || null;

  function handleSeatClick(player) {
    if (!player) return;
    setFocusedId(player.id);
  }

  return (
    <section className="room">
      {/* Cabeçalho da sala */}
      <header
        className="room-header"
        style={{
          width: "100%",
          marginBottom: "0.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div>
          <h2 style={{ marginBottom: "0.1rem" }}>Sala {roomCode}</h2>
          {playerName && (
            <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              Jogando como <strong>{playerName}</strong>
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => navigate("/lobby")}>Sair da sala</button>
        </div>
      </header>

      <div className="room-content">
        {/* LADO ESQUERDO: chat + painel de deck */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Chat */}
          <div className="form-card" style={{ padding: 0, minHeight: "260px" }}>
            <Chat />
          </div>

          {/* Card List / Deck (novo painel) */}
          <div className="form-card" style={{ padding: "0.75rem" }}>
            <DeckPanel />
          </div>
        </div>

        {/* LADO DIREITO: mesa 4 players + HUD */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* overview da mesa */}
          <div className="table-overview">
            <div className="table-player-top">
              <SeatCard
                labelPosition="bottom"
                player={seats.top}
                isFocused={focusedPlayer?.id === seats.top?.id}
                isSelf={seats.top?.name === playerName}
                onClick={() => handleSeatClick(seats.top)}
              />
            </div>

            <div className="table-middle-row">
              <div className="table-player-left">
                <SeatCard
                  labelPosition="right"
                  vertical
                  player={seats.left}
                  isFocused={focusedPlayer?.id === seats.left?.id}
                  isSelf={seats.left?.name === playerName}
                  onClick={() => handleSeatClick(seats.left)}
                />
              </div>

              <div className="table-stack">
                <div className="table-stack-box">STACK</div>
              </div>

              <div className="table-player-right">
                <SeatCard
                  labelPosition="left"
                  vertical
                  player={seats.right}
                  isFocused={focusedPlayer?.id === seats.right?.id}
                  isSelf={seats.right?.name === playerName}
                  onClick={() => handleSeatClick(seats.right)}
                />
              </div>
            </div>

            <div className="table-player-bottom">
              <SeatCard
                labelPosition="top"
                player={seats.bottom}
                isFocused={focusedPlayer?.id === seats.bottom?.id}
                isSelf={seats.bottom?.name === playerName}
                onClick={() => handleSeatClick(seats.bottom)}
              />
            </div>
          </div>

          {/* HUD do player focado */}
          {focusedPlayer && (
            <PlayerHud
              player={focusedPlayer}
              onPassTurn={() => {
                console.log("Passar turno (TODO) para", focusedPlayer.name);
              }}
              onLifeChange={(delta) => {
                updatePlayerLife(focusedPlayer.name, delta);
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

/** SeatCard: plaquinha em volta da mesa */
function SeatCard({
  player,
  onClick,
  vertical = false,
  labelPosition = "top",
  isFocused = false,
  isSelf = false,
}) {
  const hasPlayer = !!player;
  const life = player?.life ?? 40;
  const name = player?.name || "Aguardando jogador";

  return (
    <div
      className={`seat-card ${vertical ? "seat-vertical" : "seat-horizontal"} ${
        isFocused ? "seat-focused" : ""
      }`}
      onClick={hasPlayer ? onClick : undefined}
    >
      {/* QUADRADO: só mini-board ou “Aguardando jogador” */}
      <div className="seat-rect">
        {!hasPlayer ? (
          <span className="seat-empty">Aguardando jogador</span>
        ) : (
          <div
            className="seat-mini-wrapper"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              padding: 0,
              // ajusta o tamanho do mini dentro do quadrado
              transform: "none",
              width: "100%",
              height: "100%",
              transformOrigin: "center center",
            }}
          >
            <PlayerHudMini player={player} />
          </div>
        )}
      </div>

      {/* NOME FORA DO QUADRADO */}
      {hasPlayer && (
        <span className="seat-label">
          {name}
          {isSelf && " (você)"}
        </span>
      )}

      {/* VIDA FORA DO QUADRADO (já era assim) */}
      {hasPlayer && (
        <div className={`seat-life-wrapper life-${labelPosition}`}>
          <div className="seat-life-pill">
            <span>vida</span>
            <strong>{life}</strong>
          </div>
        </div>
      )}
    </div>
  );
}



export default Room;
