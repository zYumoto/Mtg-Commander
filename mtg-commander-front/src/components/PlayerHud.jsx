// src/components/PlayerHud.jsx
import React, { useState } from "react";
import { useGame } from "../context/GameContext.jsx";

function PlayerHud({ player, onPassTurn, onLifeChange }) {
  const {
    playerName,
    commanderCard: commanderFromContext,
    castCommander,
    moveCard,
    toggleTap,
    updateCardCounter,
  } = useGame();

  const isSelf = player?.name === playerName;

const life = player?.life ?? 40;

const fullHand = Array.isArray(player?.hand) ? player.hand : [];

const hand = isSelf ? fullHand : [];


  const commanderCard = player?.commanderCard || commanderFromContext || null;
  const commanderCastCount = player?.commanderCastCount || 0;
  const commanderTax = commanderCastCount * 2; 

  const graveyard = player?.graveyard || [];
  const battlefield = player?.battlefield || [];
  const lands = player?.lands || [];
  const exile = player?.exile || [];

  const [hoveredCard, setHoveredCard] = useState(null);
  const [showGraveyardModal, setShowGraveyardModal] = useState(false);

  // ===== DRAG & DROP =====
  function onDragStartCard(e, card, fromZone) {
    if (!card?.instanceId) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        instanceId: card.instanceId,
        fromZone,
      })
    );
  }

  function onDropCard(e, toZone) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;

    try {
      const { instanceId, fromZone } = JSON.parse(raw);
      if (!instanceId || !fromZone) return;
      if (fromZone === toZone) return;

      moveCard?.({
        cardInstanceId: instanceId,
        fromZone,
        toZone,
      });
    } catch (err) {
      console.error("Erro no drop:", err);
    }
  }

  function allowDrop(e) {
    e.preventDefault();
  }

  // ===== TAP / UNTAP =====
  function handleToggleTap(zoneKey, card) {
    if (!card?.instanceId) return;
    // tap/untap só no campo de permanentes por enquanto
    if (zoneKey !== "battlefield" && zoneKey !== "lands") return;
    toggleTap?.(card.instanceId, zoneKey);
  }

  // ===== RENDER DAS ZONAS (3 POR LINHA) =====
    // ===== RENDER DAS ZONAS =====
  function renderZoneCards(cards, zoneKey) {
    if (!cards || cards.length === 0) {
      return (
        <p className="board-helper">
          Nenhuma carta aqui ainda.
        </p>
      );
    }

    const isLands = zoneKey === "lands";

    const containerStyle = isLands
      ? {
          display: "flex",
          flexDirection: "row",
          gap: "6px",
          flexWrap: "nowrap",
          overflowX: "auto",
          paddingBottom: "4px",
        }
      : {
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "4px",
        };

    return (
      <div className="board-zone-cards" style={containerStyle}>
        {cards.map((card) => {
          const isTapped =
            !!card.tapped &&
            (zoneKey === "battlefield" || zoneKey === "lands");
          const counters = Number(card.counters || 0);

          const canTap = zoneKey === "battlefield" || zoneKey === "lands";
          const canHaveCounters = zoneKey === "battlefield";

          return (
            <div
              key={card.instanceId}
              className={`board-zone-card ${isTapped ? "card-tapped" : ""}`}
              draggable
              onDragStart={(e) => onDragStartCard(e, card, zoneKey)}
              onClick={() => handleToggleTap(zoneKey, card)}
              onMouseEnter={() => setHoveredCard(card)}
              onMouseLeave={() => setHoveredCard(null)}
              title={card.name}
              style={{
                position: "relative",
                transform: isTapped ? "rotate(90deg)" : "none",
                transformOrigin: "center center",
                transition: "transform 0.15s ease-out",
                cursor: canTap ? "pointer" : "grab",
              }}
            >
              {/* Badge de contador (apenas battlefield) */}
              {canHaveCounters && (
                <div
                  style={{
                    position: "absolute",
                    top: "-6px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    background: "rgba(0, 0, 0, 0.8)",
                    borderRadius: "999px",
                    padding: "2px 6px",
                    fontSize: "0.7rem",
                    zIndex: 2,
                  }}
                  onClick={(e) => e.stopPropagation()} // não dar tap quando clicar no badge
                >
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#fff",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "0.7rem",
                    }}
                    onClick={() =>
                      updateCardCounter?.(card.instanceId, zoneKey, -1)
                    }
                  >
                    −
                  </button>
                  <span style={{ color: "#fff", minWidth: "1.2rem", textAlign: "center" }}>
                    {counters}
                  </span>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#fff",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "0.7rem",
                    }}
                    onClick={() =>
                      updateCardCounter?.(card.instanceId, zoneKey, +1)
                    }
                  >
                    +
                  </button>
                </div>
              )}

              <img
                src={
                  card.image_uris?.small ||
                  card.image_uris?.normal ||
                  ""
                }
                alt={card.name}
                style={{
                  width: isLands ? "80px" : "100%",
                  borderRadius: "6px",
                }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // ===== GRAVEYARD: última carta no campo + modal completo =====
  const lastGraveCard =
    graveyard.length > 0 ? graveyard[graveyard.length - 1] : null;

  return (
    <div className="player-hud">
      {/* ===== TOPO: VIDA | JOGADOR | PASSAR TURNO ===== */}
      <div className="hud-topbar">
        <div className="hud-life-pill">
          <button
            type="button"
            className="hud-life-btn"
            onClick={() => onLifeChange && onLifeChange(-1)}
          >
            −
          </button>

          <div className="hud-life-value">
            <span>VIDA</span>
            <strong>{life}</strong>
          </div>

          <button
            type="button"
            className="hud-life-btn"
            onClick={() => onLifeChange && onLifeChange(+1)}
          >
            +
          </button>
        </div>

        <div className="hud-player-name">
          <span>JOGADOR</span>
          <strong>
            {player?.name || "Sem nome"}
            {isSelf && " (você)"}
          </strong>
        </div>

        <button className="hud-pass" onClick={onPassTurn}>
          PASSAR TURNO
        </button>
      </div>

      {/* ===== BOARD + MÃO ===== */}
      <div className="hud-board-layout">
        {/* ========== ZONA PRINCIPAL DO BOARD ========== */}
        <div className="board-main">
          {/* LINHA SUPERIOR: COMMANDER + CEMITÉRIO */}
          <div className="board-top-row">
            <div className="board-left-column">
              <div className="board-rect board-commander">
                <div className="board-rect-title">COMMANDER</div>

                {commanderCard ? (
                  <>
                    <img
                      src={
                        commanderCard.image_uris?.normal ||
                        commanderCard.image_uris?.large ||
                        commanderCard.image_uris?.small ||
                        ""
                      }
                      alt={commanderCard.name}
                      style={{
                        width: "160px",
                        borderRadius: "10px",
                        marginTop: "0.5rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
                      }}
                    />

                    <div
                      style={{
                        marginTop: "0.4rem",
                        fontSize: "0.8rem",
                        opacity: 0.85,
                      }}
                    >
                      Já foi conjurado:{" "}
                      <strong>{commanderCastCount}</strong>{" "}
                      vez{commanderCastCount === 1 ? "" : "es"}.
                      <br />
                      Taxa atual:{" "}
                      <strong>+{commanderTax}</strong> mana genérica.
                    </div>

                    {isSelf && (
                      <button
                        type="button"
                        style={{ marginTop: "0.4rem" }}
                        onClick={() => castCommander && castCommander()}
                      >
                        Baixar comandante para o campo
                      </button>
                    )}
                  </>
                ) : (
                  <p className="board-helper">
                    Seu comandante aparecerá aqui quando carregar o deck.
                  </p>
                )}
              </div>
            </div>

            <div className="board-center-spacer" />

            <div
              className="board-rect board-cemetery"
              onDragOver={allowDrop}
              onDrop={(e) => onDropCard(e, "graveyard")}
              onClick={() => {
                if (graveyard.length > 0) setShowGraveyardModal(true);
              }}
              style={{ cursor: graveyard.length > 0 ? "pointer" : "default" }}
            >
              <div className="board-rect-title">CEMITÉRIO</div>
              <p className="board-helper">
                {graveyard.length === 0
                  ? "Nenhuma carta no cemitério."
                  : `${graveyard.length} carta${
                      graveyard.length === 1 ? "" : "s"
                    } no cemitério. Clique para ver todas.`}
              </p>

              {lastGraveCard && (
                <div
                  className="board-zone-card"
                  onMouseEnter={() => setHoveredCard(lastGraveCard)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <img
                    src={
                      lastGraveCard.image_uris?.small ||
                      lastGraveCard.image_uris?.normal ||
                      ""
                    }
                    alt={lastGraveCard.name}
                    style={{ width: "80px", borderRadius: "6px" }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* LINHA DO MEIO */}
          <div className="board-row">
            <div
              className="board-rect board-zone"
              onDragOver={allowDrop}
              onDrop={(e) => onDropCard(e, "battlefield")}
            >
              <div className="board-rect-title">PERMANENTES 1 - CRIATURAS</div>
              <p className="board-helper">
                {battlefield.length} permanente
                {battlefield.length === 1 ? "" : "s"} no campo.
              </p>
              {renderZoneCards(battlefield, "battlefield")}
            </div>

            <div
              className="board-rect board-zone"
              onDragOver={allowDrop}
              onDrop={(e) => onDropCard(e, "exile")}
            >
              <div className="board-rect-title">
                PERMANENTES 2 - ENCANTAMENTOS / EXÍLIO
              </div>
              <p className="board-helper">
                {exile.length} carta
                {exile.length === 1 ? "" : "s"} exilada
                {exile.length === 1 ? "" : "s"}.
              </p>
              {renderZoneCards(exile, "exile")}
            </div>
          </div>

          {/* LINHA DE BAIXO: LANDS (zona própria) */}
          <div className="board-row lands-row">
            <div
              className="board-rect board-zone board-lands"
              onDragOver={allowDrop}
              onDrop={(e) => onDropCard(e, "lands")}
            >
              <div className="board-rect-title">LANDS</div>
              <p className="board-helper">
                Arraste terrenos da mão para cá.
              </p>
              {renderZoneCards(lands, "lands")}
            </div>
          </div>
        </div>

        {/* ========== FAIXA DA MÃO ========== */}
<div
  className="board-hand"
  onDragOver={allowDrop}
  onDrop={(e) => onDropCard(e, "hand")}
>
  {/* Se NÃO for você, não mostra as cartas, só a quantidade */}
  {!isSelf ? (
    <p className="hud-hand-empty">
      {fullHand.length === 0
        ? "Nenhuma carta na mão."
        : `Cartas na mão: ${fullHand.length}`}
    </p>
  ) : hand.length === 0 ? (
    <p className="hud-hand-empty">
      Nenhuma carta na mão. Use o painel de deck para comprar cartas.
    </p>
  ) : (
    <div className="board-hand-cards">
      {hand.map((card, index) => (
        <div
          key={card.instanceId}
          className="board-hand-card"
          style={{
            transform: `translateY(${Math.abs(
              index - (hand.length - 1) / 2
            ) * 2}px) rotate(${
              (index - (hand.length - 1) / 2) * 4
            }deg)`,
          }}
          title={card.name}
          draggable
          onDragStart={(e) => onDragStartCard(e, card, "hand")}
          onMouseEnter={() => setHoveredCard(card)}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <img
            src={
              card.image_uris?.small ||
              card.image_uris?.normal ||
              ""
            }
            alt={card.name}
          />
        </div>
      ))}
    </div>
  )}
</div>

      </div>

      {/* ===== MODAL COMPLETO DO CEMITÉRIO ===== */}
      {showGraveyardModal && (
        <div className="graveyard-modal-backdrop">
          <div className="graveyard-modal">
            <div className="graveyard-modal-header">
              <h3>Cemitério de {player?.name}</h3>
              <button
                type="button"
                onClick={() => setShowGraveyardModal(false)}
              >
                Fechar
              </button>
            </div>
            <p className="board-helper">
              Todas as cartas no cemitério. Você ainda pode arrastar cartas
              daqui para outras zonas.
            </p>
            <div className="graveyard-modal-grid">
              {renderZoneCards(graveyard, "graveyard")}
            </div>
          </div>
        </div>
      )}

      {/* ===== PREVIEW GRANDE DA CARTA ===== */}
      {hoveredCard && (
        <div className="card-zoom-overlay">
          <img
            src={
              hoveredCard.image_uris?.normal ||
              hoveredCard.image_uris?.large ||
              hoveredCard.image_uris?.small ||
              ""
            }
            alt={hoveredCard.name}
          />
          <div className="card-zoom-title">{hoveredCard.name}</div>
        </div>
      )}
    </div>
  );
}

export default PlayerHud;
