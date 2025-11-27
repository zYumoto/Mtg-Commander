import React, { useEffect, useState } from "react";
import { useGame } from "../context/GameContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "http://localhost:4000";

function DeckPanel() {
  const { setDeckFromResolved, drawCards, librarySize, playerName } = useGame();
  const { token } = useAuth();

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingLoad, setLoadingLoad] = useState(false);
  const [error, setError] = useState("");

  // buscar decks do usuário logado
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
      const res = await fetch(`${API_URL}/decks/${selectedDeckId}/resolved`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar deck");

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
              Comprar 7 (mão)
            </button>
          </div>

          <p className="deck-panel-footer">
            Cartas restantes no deck: <strong>{librarySize}</strong>
          </p>
        </>
      )}
    </div>
  );
}

export default DeckPanel;
