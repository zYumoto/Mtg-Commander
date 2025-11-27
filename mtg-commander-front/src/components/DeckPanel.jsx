// src/components/DeckPanel.jsx
import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";


const API_URL = "http://localhost:4000";

function DeckPanel() {
  const {
    playerName,
    players,
    library,
    librarySize,
    setDeckFromResolved,
    drawCards,
    shuffleLibrary,
    tutorFromLibrary,
    setCommanderCard,
  } = useGame();
  const { token } = useAuth();

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [error, setError] = useState("");
  const [showLibraryView, setShowLibraryView] = useState(false);

  // pegar o player local na lista da sala
  const me = players.find((p) => p.name === playerName);
  const commanderCard = me?.commanderCard || null;

  // carregar lista de decks do usuário
  useEffect(() => {
    async function fetchDecks() {
      if (!token) return;

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
  }, [token]);

  async function handleLoadDeck() {
    if (!token || !selectedDeckId) return;

    setLoadingLoad(true);
    setError("");

    try {
      const res = await fetch(
        `${API_URL}/decks/${selectedDeckId}/resolved`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar deck");

      const resolvedCards = data.cards ?? [];
      setDeckFromResolved(resolvedCards); // 99 cartas → deck local

      if (data.commanderCard) {
        setCommanderCard(data.commanderCard); // manda comandante para a sala
      }
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

  function handleShuffleRemaining() {
    shuffleLibrary();
  }

  function handleToggleLibraryView() {
    setShowLibraryView((prev) => !prev);
  }

  function handleTutorClick(card) {
    if (!card?.instanceId) return;
    tutorFromLibrary(card.instanceId);
    setShowLibraryView(false);
  }

  return (
    <div className="deck-panel">
      <h3 className="deck-panel-title">Card List / Deck</h3>
      <p className="deck-panel-sub">
        Jogador: <strong>{playerName || "-"}</strong>
      </p>

      {error && <p className="deck-panel-error">{error}</p>}

      {loadingDecks ? (
        <p className="deck-panel-info">Carregando seus decks...</p>
      ) : decks.length === 0 ? (
        <p className="deck-panel-info">
          Você ainda não tem decks cadastrados.
        </p>
      ) : (
        <>
          <div className="deck-panel-row">
            <label>
              Deck:
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
              >
                {decks.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name || "(sem nome)"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="deck-panel-row deck-panel-row-buttons">
            <button type="button" onClick={handleLoadDeck} disabled={loadingLoad}>
              {loadingLoad ? "Carregando..." : "Carregar + Embaralhar"}
            </button>
          </div>

          <div className="deck-panel-row deck-panel-row-buttons">
            <button
              type="button"
              onClick={handleDrawOne}
              disabled={librarySize <= 0}
            >
              Comprar 1
            </button>
            <button
              type="button"
              onClick={handleDrawSeven}
              disabled={librarySize < 7}
            >
              Comprar 7 (mão inicial)
            </button>
          </div>

          <div className="deck-panel-row deck-panel-row-buttons">
            <button
              type="button"
              onClick={handleShuffleRemaining}
              disabled={librarySize <= 1}
            >
              Embaralhar restante
            </button>
            <button
              type="button"
              onClick={handleToggleLibraryView}
              disabled={librarySize === 0}
            >
              {showLibraryView ? "Fechar deck" : "Ver cartas do deck"}
            </button>
          </div>

          <p className="deck-panel-footer">
            Cartas restantes no deck: <strong>{librarySize}</strong>
          </p>

          {/* Comandante embaixo do Deck Panel */}
          <div className="deck-panel-row" style={{ marginTop: "0.75rem" }}>
            <div className="deck-commander-box">
              <div className="deck-commander-title">Commander</div>
              {commanderCard ? (
                <img
                  src={
                    commanderCard.image_uris?.normal ||
                    commanderCard.image_uris?.small ||
                    ""
                  }
                  alt={commanderCard.name}
                  className="deck-commander-image"
                />
              ) : (
                <p className="deck-panel-info" style={{ marginTop: "0.4rem" }}>
                  Carregue um deck para ver o seu comandante aqui.
                </p>
              )}
            </div>
          </div>

          {/* Visualização de cartas restantes no deck (efeito "tutor") */}
          {showLibraryView && librarySize > 0 && (
            <div className="deck-library-view">
              <div className="deck-library-header">
                <span>
                  Cartas restantes no deck:{" "}
                  <strong>{librarySize}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLibraryView(false)}
                >
                  Fechar
                </button>
              </div>

              <p className="deck-panel-info" style={{ marginBottom: "0.4rem" }}>
                Clique em uma carta para colocá-la na mão e embaralhar o
                restante (efeito tipo tutor).
              </p>

              <div className="deck-library-grid">
                {library.map((card) => (
                  <div
                    key={card.instanceId}
                    className="deck-library-card"
                    onClick={() => handleTutorClick(card)}
                    title={card.name}
                  >
                    <img
                      src={
                        card.image_uris?.small ||
                        card.image_uris?.normal ||
                        ""
                      }
                      alt={card.name}
                    />
                    <div className="deck-library-card-name">
                      {card.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DeckPanel;
