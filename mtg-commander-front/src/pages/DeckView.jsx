import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { API_URL } from "../config.js";
import "./DecksPage.css";

function DeckView() {
  const { id } = useParams();
  const { token, isAuthenticated, loading } = useAuth();
  const [deck, setDeck] = useState(null);
  const [error, setError] = useState("");
  const [loadingDeck, setLoadingDeck] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    async function fetchDeck() {
      if (!token || !id) return;

      setLoadingDeck(true);
      try {
        const res = await fetch(`${API_URL}/decks/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar deck");
        setDeck(data);
      } catch (err) {
        setError(err.message || "Erro ao carregar deck");
      } finally {
        setLoadingDeck(false);
      }
    }

    fetchDeck();
  }, [token, id]);

  const cards = deck?.cards || [];
  const totalCards = useMemo(
    () => cards.reduce((sum, card) => sum + (card.quantity || 0), 0),
    [cards]
  );

  if (loading || loadingDeck) {
    return (
      <section className="page-center">
        <p>Carregando deck...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="deckshell deckshell--narrow">
        <div className="deckshell__wrap">
          <div className="deckshell__emptyState">{error}</div>
          <div className="deckshell__footer">
            <Link to="/decks" className="deckshell__ghostLink">
              Voltar para Meus Decks
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!deck) return null;

  const commanderImage = deck.commander
    ? `https://api.scryfall.com/cards/named?format=image&version=art_crop&fuzzy=${encodeURIComponent(
        deck.commander
      )}`
    : "";

  return (
    <section className="deckshell">
      <div className="deckshell__wrap">
        <div className="deckshell__hero">
          <div className="deckshell__heroTopline">Deck showcase</div>
          <div className="deckshell__heroBar">
            <div>
              <h1>{deck.name}</h1>
              <p>
                Comandante: <strong>{deck.commander || "Nao definido"}</strong>
              </p>
            </div>

            <div className="deckshell__heroActions">
              <Link to="/decks" className="deckshell__ghostLink">
                Voltar para Meus Decks
              </Link>
              <Link
                to={`/decks/${deck._id}/edit`}
                className="deckshell__ghostLink"
              >
                Editar deck
              </Link>
            </div>
          </div>
        </div>

        <div className="deckshell__builderGrid deckshell__builderGrid--view">
          <div className="deckshell__panel deckshell__panel--hero">
            <div className="deckshell__sectionHead deckshell__sectionHead--compact">
              <span>Resumo</span>
              <h2>Identidade do deck</h2>
              <p>Visao rapida do comandante e da lista carregada.</p>
            </div>

            <div className="deckshell__summaryCards">
              <article className="deckshell__summaryCard">
                <span>Tipos de carta</span>
                <strong>{cards.length}</strong>
              </article>
              <article className="deckshell__summaryCard">
                <span>Total informado</span>
                <strong>{totalCards}</strong>
              </article>
            </div>

            <div className="deckshell__commanderCard">
              {commanderImage ? (
                <img
                  src={commanderImage}
                  alt={deck.commander}
                  className="deckshell__commanderImage"
                />
              ) : (
                <div className="deckshell__emptyState">Sem comandante definido.</div>
              )}
            </div>
          </div>

          <div className="deckshell__panel">
            <div className="deckshell__sectionHead deckshell__sectionHead--compact">
              <span>Lista</span>
              <h2>Cartas cadastradas</h2>
              <p>Cartas e quantidades conforme foram salvas no deck.</p>
            </div>

            <div className="deckshell__cardsGrid">
              {cards.map((card, index) => {
                const cleanName = (card.name || "")
                  .replace(/\s+\(.*\)$/, "")
                  .trim();

                const imageSrc = `https://api.scryfall.com/cards/named?format=image&fuzzy=${encodeURIComponent(
                  cleanName
                )}`;

                return (
                  <article
                    key={`${card.name}-${index}`}
                    className="deckshell__cardTile"
                  >
                    <div className="deckshell__cardTileHeader">
                      <strong>{card.quantity || 1}x</strong>
                      <span>{card.name}</span>
                    </div>

                    <img
                      src={imageSrc}
                      alt={card.name}
                      className="deckshell__cardTileImage"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DeckView;
