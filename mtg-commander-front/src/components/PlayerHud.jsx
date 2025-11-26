import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "http://localhost:4000";

function PlayerHud({ player, onPassTurn, onLifeChange }) {
  const { playerName, setDeckFromResolved, drawCards, librarySize } = useGame();
  const { token } = useAuth();

  const isSelf = player?.name === playerName;

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [error, setError] = useState("");

  const hand = player?.hand || [];

  // Carrega lista de decks do usuário (só pra você mesmo)
  useEffect(() => {
    async function fetchDecks() {
      if (!isSelf || !token) return;
      setLoadingDecks(true);
      setError("");

      try {
        const res = await fetch(`${API_URL}/decks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar decks");

        setDecks(data || []);
        if (data && data.length > 0) {
          setSelectedDeckId((prev) => prev || data[0]._id);
        }
      } catch (err) {
        console.error("Erro ao buscar decks:", err);
        setError(err.message);
      } finally {
        setLoadingDecks(false);
      }
    }

    fetchDecks();
  }, [isSelf, token]);

  async function handleLoadDeck() {
    if (!isSelf || !token || !selectedDeckId) return;

    setLoadingLoad(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/decks/${selectedDeckId}/resolved`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar deck");

      // tenta usar data.cards, se não tiver usa o próprio data
      const resolvedCards = data.cards ?? data ?? [];
      setDeckFromResolved(resolvedCards);
    } catch (err) {
      console.error("Erro ao carregar deck resolvido:", err);
      setError(err.message);
    } finally {
      setLoadingLoad(false);
    }
  }

  function handleDrawOne() {
    drawCards(1);
  }

  function handleDrawSeven() {
    drawCards(7);
  }

  const life = player?.life ?? 40;

  return (
    <div className="player-hud">
      {/* === TOP BAR === */}
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
          <strong>{player?.name || "Sem nome"} </strong>
        </div>

        <button className="hud-pass" onClick={onPassTurn}>
          PASSAR TURNO
        </button>
      </div>

      {/* === MAIN GRID === */}
      <div className="hud-grid">
        {/* COLUNA ESQUERDA: Deck / Commander */}
        <div className="hud-left">
          <div className="hud-box small">
            <strong>Seu Deck</strong>

            {isSelf ? (
              <>
                {error && (
                  <p
                    style={{
                      color: "#ff6b6b",
                      fontSize: "0.8rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    {error}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    marginTop: "0.35rem",
                  }}
                >
                  {loadingDecks ? (
                    <span style={{ fontSize: "0.8rem" }}>
                      Carregando seus decks...
                    </span>
                  ) : decks.length === 0 ? (
                    <span style={{ fontSize: "0.8rem" }}>
                      Você ainda não tem decks cadastrados.
                    </span>
                  ) : (
                    <>
                      <select
                        value={selectedDeckId}
                        onChange={(e) => setSelectedDeckId(e.target.value)}
                        style={{ fontSize: "0.8rem" }}
                      >
                        {decks.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name || "(sem nome)"}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleLoadDeck}
                        disabled={loadingLoad}
                        style={{ fontSize: "0.8rem" }}
                      >
                        {loadingLoad ? "Carregando..." : "Carregar + Embaralhar"}
                      </button>

                      <div
                        style={{
                          display: "flex",
                          gap: "0.35rem",
                          flexWrap: "wrap",
                          marginTop: "0.2rem",
                        }}
                      >
                        <button
                          type="button"
                          onClick={handleDrawOne}
                          disabled={librarySize <= 0}
                          style={{ fontSize: "0.8rem" }}
                        >
                          Comprar 1
                        </button>

                        <button
                          type="button"
                          onClick={handleDrawSeven}
                          disabled={librarySize < 7}
                          style={{ fontSize: "0.8rem" }}
                        >
                          Comprar 7 (mão)
                        </button>
                      </div>

                      <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                        Cartas restantes no deck:{" "}
                        <strong>{librarySize}</strong>
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>
                Deck de <strong>{player?.name}</strong>.
              </p>
            )}
          </div>

          <div className="hud-box small">
            <strong>COMMANDER</strong>
            <p style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.35rem" }}>
              (Em breve vamos puxar o commander direto do deck salvo)
            </p>
          </div>
        </div>

        {/* COLUNA DIREITA: BOARD + MÃO VISUAL */}
        <div className="hud-right">
          <div className="hud-box large">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.35rem",
              }}
            >
              <strong>BOARD</strong>
              <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                Mão: <strong>{hand.length}</strong> carta(s)
              </span>
            </div>

            {/* VISUAL DA MÃO */}
            <div className="hud-hand-wrapper">
              {hand.length === 0 ? (
                <p className="hud-hand-empty">
                  Nenhuma carta na mão ainda. Use "Comprar" para puxar cartas.
                </p>
              ) : (
                <div className="hud-hand-cards">
                  {hand.map((card) => (
                    <div key={card.instanceId} className="hud-card">
                      <img
                        src={
                          card.image_uris?.small ||
                          card.image_uris?.normal ||
                          ""
                        }
                        alt={card.name}
                        title={card.name}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* espaço futuro pro board real */}
            <div
              style={{
                marginTop: "0.5rem",
                borderTop: "1px dashed rgba(148, 163, 184, 0.4)",
                paddingTop: "0.4rem",
                fontSize: "0.75rem",
                opacity: 0.7,
              }}
            >
              Em breve: mover cartas da mão para o campo, cemitério, exílio, etc.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerHud;
