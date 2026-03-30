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

  return (
    <div className="deckspage">
      <div className="deckspage__wrap">
        <div className="deckspage__grid">
          <main className="deckspage__main">
            <div className="deckspage__mainInner">
              <div className="deckspage__titlePill">Decks</div>

              <section className="deckspage__content">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <p style={{ margin: 0, opacity: 0.8 }}>
                    Seus decks ficam disponiveis para carregar dentro das salas.
                  </p>
                  <Link to="/decks/new" className="btn-deck">
                    Criar deck
                  </Link>
                </div>

                {error && <p className="feedback-text">{error}</p>}

                {loadingDecks ? (
                  <div className="deckspage__empty">
                    <div className="deckspage__emptyCard">
                      <div className="deckspage__emptyTitle">Carregando decks</div>
                    </div>
                  </div>
                ) : decks.length === 0 ? (
                  <div className="deckspage__empty">
                    <div className="deckspage__emptyCard">
                      <div className="deckspage__emptyTitle">Nenhum deck criado</div>
                      <div className="deckspage__emptyText">
                        Crie um deck para comecar a jogar Commander.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    {decks.map((deck) => (
                      <article
                        key={deck._id}
                        className="form-card"
                        style={{ textAlign: "left" }}
                      >
                        <div style={{ marginBottom: "0.75rem" }}>
                          <h3 style={{ marginBottom: "0.35rem" }}>{deck.name}</h3>
                          <p style={{ margin: 0, opacity: 0.8 }}>
                            Comandante:{" "}
                            <strong>{deck.commander || "Nao definido"}</strong>
                          </p>
                          <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", opacity: 0.75 }}>
                            {(deck.cards || []).length} tipos de carta
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <Link to={`/decks/${deck._id}/view`} className="btn-deck">
                            Ver
                          </Link>
                          <Link to={`/decks/${deck._id}/edit`} className="btn-deck">
                            Editar
                          </Link>
                          <button type="button" className="btn-deck" onClick={() => handleDelete(deck._id)}>
                            Excluir
                          </button>
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
              <div className="deckspage__profileRow">
                <div className="deckspage__avatar">
                  {(displayName || "?").charAt(0).toUpperCase()}
                </div>
                <div className="deckspage__nickPill">{displayName}</div>
              </div>

              <Link to="/lobby" className="deckspage__sideBtn">
                VOLTAR AO LOBBY
              </Link>

              <div className="deckspage__friendsBox">
                <div className="deckspage__friendsHeader">Dica</div>
                <div className="deckspage__friendsEmpty">
                  Depois de criar um deck, entre em uma sala e use o painel lateral
                  para carregar e embaralhar.
                </div>
              </div>

              <Link to="/profile" className="deckspage__settingsBtn">
                PERFIL
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Decks;
