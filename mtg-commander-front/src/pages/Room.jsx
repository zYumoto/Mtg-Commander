import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext.jsx";
import { socket } from "../socket";

import PlayerHud from "../components/PlayerHud.jsx";
import Chat from "../components/Chat.jsx";
import CardSearch from "../components/CardSearch.jsx";

function Room() {
  const navigate = useNavigate();
  const {
    roomCode,
    playerName,
    players = [],
    updatePlayerLife,
  } = useGame();

  // ⭐ estado sincronizado vindo do servidor
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // quem é o dono da sala?
  const roomOwner = players.length > 0 ? players[0].name : null;

  // receber evento do backend
  useEffect(() => {
    socket.on("game-started", ({ startTime }) => {
      setStartTime(startTime);
    });

    return () => socket.off("game-started");
  }, []);

  // contador sincronizado
  useEffect(() => {
    let interval;
    if (startTime) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime]);

  const timerLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }, [elapsed]);

  // quando dono clica
  function handleStartGame() {
    socket.emit("start-game", {
      roomCode,
      playerName,
    });
  }

  // redirecionar se sem sala
  if (!roomCode) {
    return (
      <section className="page-center" style={{ maxWidth: "600px" }}>
        <h2>Sala não encontrada</h2>
        <button onClick={() => navigate("/lobby")}>Voltar para o Lobby</button>
      </section>
    );
  }

  // SEATS (mapeamento dos jogadores)
  const seats = useMemo(() => {
    const result = { top: null, left: null, right: null, bottom: null };

    if (players.length === 0) return result;

    const self = players.find((p) => p.name === playerName);
    const selfPlayer = self || players[0];

    result.bottom = selfPlayer;

    const others = players.filter((p) => p.id !== selfPlayer.id);
    const order = ["top", "left", "right"];
    others.forEach((p, index) => {
      const seat = order[index];
      if (seat) result[seat] = p;
    });

    return result;
  }, [players, playerName]);

  // focado
  const selfPlayer =
    players.find((p) => p.name === playerName) || seats.bottom || players[0];

  const [focusedId, setFocusedId] = useState(selfPlayer?.id);
  const focusedPlayer =
    players.find((p) => p.id === focusedId) || selfPlayer || null;

  return (
    <section className="page-center" style={{ maxWidth: "1400px" }}>
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
          <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
            Jogando como <strong>{playerName}</strong>
          </p>
        </div>

        {/* BOTÕES DO TOPO */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "0.35rem",
          }}
        >
          <button onClick={() => navigate("/lobby")}>Sair da sala</button>

          {/* apenas dono vê o botão */}
          {playerName === roomOwner && !startTime && (
            <button type="button" onClick={handleStartGame}>
              Iniciar partida
            </button>
          )}

          {/* timer visível para todos */}
          {startTime && (
            <span style={{ fontSize: "0.85rem" }}>
              Tempo: <strong>{timerLabel}</strong>
            </span>
          )}
        </div>
      </header>

      {/* ====== LAYOUT DA MESA ====== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) 1fr",
          gap: "1rem",
          width: "100%",
        }}
      >
        {/* ESQUERDA */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="form-card" style={{ padding: "0.75rem" }}>
            <h3 style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>
              Busca de cartas
            </h3>
            <CardSearch />
          </div>

          <div className="form-card" style={{ padding: 0 }}>
            <Chat />
          </div>
        </div>

        {/* DIREITA: mesa + HUD */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="table-overview">
            <div className="table-player table-player-top">
              <SeatCard
                player={seats.top}
                onClick={() => seats.top && setFocusedId(seats.top.id)}
              />
            </div>

            <div className="table-middle-row">
              <SeatCard
                player={seats.left}
                onClick={() => seats.left && setFocusedId(seats.left.id)}
                vertical
              />

              <div className="table-stack">
                <div className="table-stack-box">STACK</div>
              </div>

              <SeatCard
                player={seats.right}
                onClick={() => seats.right && setFocusedId(seats.right.id)}
                vertical
              />
            </div>

            <div className="table-player table-player-bottom">
              <SeatCard
                player={seats.bottom}
                onClick={() => seats.bottom && setFocusedId(seats.bottom.id)}
              />
            </div>
          </div>

          {/* HUD */}
          {focusedPlayer && (
            <PlayerHud
              player={focusedPlayer}
              onLifeChange={(delta) =>
                updatePlayerLife(focusedPlayer.name, delta)
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function SeatCard({
  player,
  onClick,
  vertical = false,
}) {
  const life = player?.life ?? 40;
  const name = player?.name || "Vago";

  return (
    <div
      className={`seat-card ${vertical ? "seat-vertical" : "seat-horizontal"}`}
      onClick={player ? onClick : undefined}
    >
      <div className="seat-rect">
        {!player ? (
          <span>Aguardando jogador</span>
        ) : (
          <span>{name}</span>
        )}
      </div>

      {player && (
        <div className="seat-life-wrapper">
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
