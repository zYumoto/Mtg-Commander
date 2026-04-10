import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { API_URL } from "../config.js";
import "./DecksPage.css";

function Decks() {
  const { token, user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    async function loadDecks() {
      if (!token) return;

      try {
        setLoadingDecks(true);
        setError("");

        const res = await fetch(`${API_URL}/decks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Erro ao carregar decks");
        }

        setDecks(data || []);
      } catch (err) {
        setError(err.message || "Erro ao carregar decks");
      } finally {
        setLoadingDecks(false);
      }
    }

    loadDecks();
  }, [token]);

  async function handleDelete(deckId) {
    if (!token) return;

    const confirmed = window.confirm("Deseja remover este deck?");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/decks/${deckId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao remover deck");
      }

      setDecks((prev) => prev.filter((deck) => deck._id !== deckId));
    } catch (err) {
      setError(err.message || "Erro ao remover deck");
    }
  }

  const displayName =
    user?.nickname ||
    user?.fullName ||
    (user?.email ? user.email.split("@")[0] : "Jogador");

  function getCommanderImage(deck) {
    if (!deck?.commander) return "";
    return `https://api.scryfall.com/cards/named?format=image&version=art_crop&fuzzy=${encodeURIComponent(
      deck.commander
    )}`;
  }

  return (
    <div className="deckspage">
      <div className="deckspage__wrap">
        <div className="deckspage__grid">
          <main className="deckspage__main">
            <div className="deckspage__mainInner">
              <div className="deckspage__titlePill">Decks</div>

              <section className="deckspage__content">
                <div className="deckspage__toolbar">
                  <div className="deckspage__toolbarIntro">
                    <span className="deckspage__eyebrow">Meus decks</span>
                    <p className="deckspage__toolbarText">
                      Seus decks ficam disponiveis para carregar nas salas.
                    </p>
                  </div>
                  <Link to="/decks/new" className="deckspage__ghostBtn">
                    Criar deck
                  </Link>
                </div>

                {error && <p className="feedback-text">{error}</p>}

                {loadingDecks ? (
                  <div className="deckspage__empty">
                    <div className="deckspage__emptyCard">
                      <div className="deckspage__emptyTitle">Carregando decks</div>
                      <div className="deckspage__emptyText">
                        Buscando sua colecao para montar a vitrine.
                      </div>
                    </div>
                  </div>
                ) : decks.length === 0 ? (
                  <div className="deckspage__empty">
                    <div className="deckspage__emptyCard">
                      <div className="deckspage__emptyTitle">Nenhum deck criado</div>
                      <div className="deckspage__emptyText">
                        Crie um deck para comecar a jogar Commander.
                      </div>
                      <Link to="/decks/new" className="deckspage__primaryBtn">
                        Criar primeiro deck
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="deckspage__gridCards">
                    {decks.map((deck) => (
                      <article key={deck._id} className="deckspage__deckCard">
                        <div className="deckspage__deckVisual">
                          {deck.commander ? (
                            <img
                              src={getCommanderImage(deck)}
                              alt={deck.commander}
                              className="deckspage__deckImage"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                const next = e.currentTarget.nextElementSibling;
                                if (next) next.style.display = "grid";
                              }}
                            />
                          ) : null}
                          <div
                            className="deckspage__commanderFallback"
                            style={{ display: deck.commander ? "none" : "grid" }}
                          >
                            {deck.commander
                              ? deck.commander.charAt(0).toUpperCase()
                              : "?"}
                          </div>
                        </div>

                        <div className="deckspage__deckBody">
                          <div className="deckspage__deckTop">
                            <span className="deckspage__deckTag">Commander</span>
                            <h3 className="deckspage__deckName">{deck.name}</h3>
                            <p className="deckspage__deckCommander">
                              <span>Comandante</span>
                              <strong>{deck.commander || "Nao definido"}</strong>
                            </p>
                          </div>

                          <div className="deckspage__deckMeta">
                            <div>
                              <strong>{(deck.cards || []).length}</strong>
                              <span>tipos de carta</span>
                            </div>
                            <div>
                              <strong>{deck.format || "commander"}</strong>
                              <span>formato</span>
                            </div>
                          </div>

                          <div className="deckspage__deckActions">
                            <Link
                              to={`/decks/${deck._id}/view`}
                              className="deckspage__deckBtn"
                            >
                              Ver
                            </Link>
                            <Link
                              to={`/decks/${deck._id}/edit`}
                              className="deckspage__deckBtn"
                            >
                              Editar
                            </Link>
                            <button
                              type="button"
                              className="deckspage__deckBtn deckspage__deckBtn--danger"
                              onClick={() => handleDelete(deck._id)}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>

          <aside className="deckspage__side">
            <div className="deckspage__sideInner">
              <div className="deckspage__profileCard">
                <div className="deckspage__profileRow">
                  <div className="deckspage__avatar">
                    {(displayName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="deckspage__profileText">
                    <span>Perfil ativo</span>
                    <div className="deckspage__nickPill">{displayName}</div>
                  </div>
                </div>
              </div>

              <Link to="/lobby" className="deckspage__sideBtn">
                Voltar ao lobby
              </Link>

              <Link to="/profile" className="deckspage__settingsBtn">
                Perfil
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Decks;
