import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext.jsx";

import PlayerHud from "../components/PlayerHud.jsx";
import Chat from "../components/Chat.jsx";
import DeckPanel from "../components/DeckPanel.jsx";
import PlayerHudMini from "../components/PlayerHudMini.jsx";

function Room() {
  const navigate = useNavigate();
  const {
    roomCode,
    playerName,
    players = [],
    updatePlayerLife,
    moveCard,
    stack: globalStack,
  } = useGame();

  const seats = useMemo(() => {
    const result = { top: null, left: null, right: null, bottom: null };
    if (players.length === 0) return result;

    const self = players.find((p) => p.name === playerName);
    const selfPlayer = self || players[0];
    result.bottom = selfPlayer;

    const others = players.filter((p) => p.id !== selfPlayer.id);
    const order = ["top", "left", "right"];
    others.forEach((player, index) => {
      const seatName = order[index];
      if (seatName) result[seatName] = player;
    });

    return result;
  }, [players, playerName]);

  const selfPlayer =
    players.find((p) => p.name === playerName) || seats.bottom || players[0] || null;

  const [focusedId, setFocusedId] = useState(null);
  const [showStackModal, setShowStackModal] = useState(false);
  const [hoveredStackCard, setHoveredStackCard] = useState(null);

  const effectiveFocusedId = focusedId || selfPlayer?.id || null;
  const focusedPlayer =
    players.find((p) => p.id === effectiveFocusedId) || selfPlayer || null;

  const stack = globalStack || [];
  const lastStackCard = stack.length > 0 ? stack[stack.length - 1] : null;

  function handleSeatClick(player) {
    if (player?.id) {
      setFocusedId(player.id);
    }
  }

  function allowDropStack(e) {
    e.preventDefault();
  }

  function handleDropOnStack(e) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const { instanceId, fromZone } = JSON.parse(raw);
      if (!instanceId || !fromZone || fromZone === "stack") return;

      moveCard?.({
        cardInstanceId: instanceId,
        fromZone,
        toZone: "stack",
      });
    } catch (err) {
      console.error("Erro no drop da stack global:", err);
    }
  }

  function handleDragStartStackCard(e, card) {
    if (!card?.instanceId) return;

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        instanceId: card.instanceId,
        fromZone: "stack",
      })
    );
  }

  if (!roomCode) {
    return (
      <section className="page-center" style={{ maxWidth: "600px" }}>
        <h2>Sala nao encontrada</h2>
        <p>Parece que voce nao esta conectado a nenhuma sala.</p>
        <button onClick={() => navigate("/lobby")}>Voltar para o Lobby</button>
      </section>
    );
  }

  return (
    <section className="room">
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
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="form-card" style={{ padding: 0, minHeight: "260px" }}>
            <Chat />
          </div>

          <div className="form-card" style={{ padding: "0.75rem" }}>
            <DeckPanel />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
                <div
                  className="table-stack-box"
                  onDragOver={allowDropStack}
                  onDrop={handleDropOnStack}
                  onClick={() => {
                    if (stack.length > 0) setShowStackModal(true);
                  }}
                  style={{ cursor: stack.length > 0 ? "pointer" : "default" }}
                >
                  <div className="table-stack-label">STACK</div>

                  {lastStackCard && (
                    <div
                      className="table-stack-preview"
                      draggable
                      onDragStart={(e) => handleDragStartStackCard(e, lastStackCard)}
                      onMouseEnter={() => setHoveredStackCard(lastStackCard)}
                      onMouseLeave={() => setHoveredStackCard(null)}
                    >
                      <img
                        src={
                          lastStackCard.image_uris?.small ||
                          lastStackCard.image_uris?.normal ||
                          ""
                        }
                        alt={lastStackCard.name}
                        style={{ width: "80px", borderRadius: "6px" }}
                      />
                    </div>
                  )}
                </div>
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

          {focusedPlayer && (
            <PlayerHud
              player={focusedPlayer}
              onPassTurn={() => {
                console.log("Passar turno (TODO) para", focusedPlayer.name);
              }}
              onLifeChange={(delta) => updatePlayerLife(focusedPlayer.name, delta)}
            />
          )}

          {showStackModal && (
            <div className="graveyard-modal-backdrop">
              <div className="graveyard-modal">
                <div className="graveyard-modal-header">
                  <h3>Stack da mesa</h3>
                  <button type="button" onClick={() => setShowStackModal(false)}>
                    Fechar
                  </button>
                </div>
                <p className="board-helper">
                  Cartas atualmente na pilha, do fundo para o topo.
                </p>

                <div className="graveyard-modal-grid">
                  {stack.length === 0 ? (
                    <p className="board-helper">Nenhuma carta na pilha.</p>
                  ) : (
                    stack.map((card, index) => (
                      <div
                        key={card.instanceId || `${card.name}-${index}`}
                        className="board-zone-card"
                        title={card.name}
                        onMouseEnter={() => setHoveredStackCard(card)}
                        onMouseLeave={() => setHoveredStackCard(null)}
                      >
                        <img
                          src={card.image_uris?.small || card.image_uris?.normal || ""}
                          alt={card.name}
                          style={{
                            width: "90px",
                            borderRadius: "6px",
                            display: "block",
                          }}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {hoveredStackCard && (
        <div
          className="stack-preview-overlay"
          style={{
            position: "fixed",
            right: "16px",
            bottom: "16px",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          <img
            src={
              hoveredStackCard.image_uris?.normal ||
              hoveredStackCard.image_uris?.large ||
              hoveredStackCard.image_uris?.small ||
              ""
            }
            alt={hoveredStackCard.name}
            style={{
              width: "240px",
              borderRadius: "12px",
              boxShadow: "0 0 20px rgba(0,0,0,0.7)",
              display: "block",
            }}
          />
          <div
            style={{
              marginTop: "4px",
              padding: "4px 8px",
              borderRadius: "999px",
              background: "rgba(0,0,0,0.8)",
              color: "#fff",
              fontSize: "0.8rem",
              textAlign: "center",
            }}
          >
            {hoveredStackCard.name}
          </div>
        </div>
      )}
    </section>
  );
}

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
      className={`seat-card ${
        vertical ? "seat-vertical" : "seat-horizontal"
      } ${isFocused ? "seat-focused" : ""}`}
      onClick={player ? onClick : undefined}
    >
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
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                transform: vertical ? "rotate(90deg) scale(0.8)" : "none",
                transformOrigin: "center center",
              }}
            >
              <PlayerHudMini player={player} />
            </div>
          </div>
        )}
      </div>

      {hasPlayer && (
        <span className="seat-label">
          {name}
          {isSelf && " (voce)"}
        </span>
      )}

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
