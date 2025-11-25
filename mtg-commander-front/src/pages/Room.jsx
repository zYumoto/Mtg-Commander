import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext.jsx";

import PlayerHud from "../components/PlayerHud.jsx";
import Chat from "../components/Chat.jsx";
import CardSearch from "../components/CardSearch.jsx";

function Room() {
  const navigate = useNavigate();
  const { roomCode, playerName, players = [] } = useGame();

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


  // jogador local (self)
  const selfPlayer =
    players.find((p) => p.name === playerName) || seats.bottom || players[0];

  // player focado na HUD (inicialmente você mesmo)
  const [focusedId, setFocusedId] = useState(selfPlayer?.id);

  const focusedPlayer =
    players.find((p) => p.id === focusedId) || selfPlayer || null;

  function handleSeatClick(player) {
    if (!player) return;
    setFocusedId(player.id);
  }

  return (
    <section
      className="page-center"
      style={{ maxWidth: "1400px", alignItems: "stretch" }}
    >
      {/* Cabeçalho da sala */}
      <header
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

        <button onClick={() => navigate("/lobby")}>Sair da sala</button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) 1fr",
          gap: "1rem",
          width: "100%",
        }}
      >
        {/* LADO ESQUERDO: busca de cartas + chat */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="form-card" style={{ padding: "0.75rem" }}>
            <h3 style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>
              Busca de cartas
            </h3>
            <CardSearch />
          </div>

          <div className="form-card" style={{ padding: 0, minHeight: "260px" }}>
            <Chat />
          </div>
        </div>

        {/* LADO DIREITO: MESA 4 PLAYERS + HUD */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* ====== OVERVIEW DA MESA (primeiro desenho) ====== */}
          <div className="table-overview">
            {/* Top player */}
            <div className="table-player table-player-top">
              <SeatCard
                labelPosition="bottom"
                player={seats.top}
                isFocused={focusedPlayer?.id === seats.top?.id}
                isSelf={seats.top?.name === playerName}
                onClick={() => handleSeatClick(seats.top)}
              />
            </div>

            {/* Left + center (stack) + right */}
            <div className="table-middle-row">
              <div className="table-player table-player-left">
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
                <div className="table-stack-box">
                  STACK
                </div>
              </div>

              <div className="table-player table-player-right">
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

            {/* Bottom player */}
            <div className="table-player table-player-bottom">
              <SeatCard
                labelPosition="top"
                player={seats.bottom}
                isFocused={focusedPlayer?.id === seats.bottom?.id}
                isSelf={seats.bottom?.name === playerName}
                onClick={() => handleSeatClick(seats.bottom)}
              />
            </div>
          </div>

          {/* ====== HUD DO PLAYER FOCADO (segundo desenho simplificado) ====== */}
          {focusedPlayer && (
            <PlayerHud
              player={focusedPlayer}
              onPassTurn={() => {
                // TODO: depois ligar no socket.io (`pass-turn`)
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

/**
 * SeatCard
 * Representa a “plaquinha” do jogador em volta da mesa (vida + nick)
 */
function SeatCard({
  player,
  onClick,
  vertical = false,
  labelPosition = "top", // "top" | "bottom" | "left" | "right"
  isFocused = false,
  isSelf = false,
}) {
  const life = player?.life ?? 40;
  const name = player?.name || "Vago";

  return (
    <div
      className={`seat-card ${vertical ? "seat-vertical" : "seat-horizontal"} ${
        isFocused ? "seat-focused" : ""
      }`}
      onClick={player ? onClick : undefined}
    >
      {/* bloco principal (retângulo grande) */}
      <div className="seat-rect">
        {!player ? (
          <span className="seat-empty">Aguardando jogador</span>
        ) : (
          <span className="seat-label">
            {name}
            {isSelf && " (você)"}
          </span>
        )}
      </div>

      {/* “cápsula” de vida, na posição escolhida */}
      {player && (
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
