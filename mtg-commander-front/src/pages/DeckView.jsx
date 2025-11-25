import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "http://localhost:4000";

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
      const res = await fetch(`${API_URL}/decks/${id}/resolved`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(
          "Resposta do servidor não é JSON. Status " +
            res.status +
            ": " +
            text.slice(0, 80)
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar deck");
      setDeck(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDeck(false);
    }
  }

  fetchDeck();
}, [token, id]);


  if (loading || loadingDeck) {
    return (
      <section className="page-center">
        <p>Carregando deck...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-center">
        <p style={{ color: "#ff6b6b" }}>{error}</p>
        <Link to="/decks" style={{ marginTop: "1rem", display: "inline-block" }}>
          ← Voltar para Meus Decks
        </Link>
      </section>
    );
  }

  if (!deck) return null;

  return (
    <section className="page-center" style={{ maxWidth: "1100px" }}>
      <h2>{deck.name}</h2>
      <p>
        Comandante: <strong>{deck.commander || "Não definido"}</strong>
      </p>

      <div style={{ margin: "0.5rem 0 1rem" }}>
        <Link to="/decks">← Voltar para Meus Decks</Link>{" "}
        <span style={{ marginLeft: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
          {deck.cards?.length || 0} tipos de carta
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "1rem",
        }}
      >
        {deck.cards.map((c, index) => (
          <div
            key={`${c.name}-${index}`}
            style={{
              background: "#141424",
              borderRadius: "0.75rem",
              padding: "0.5rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
              <strong>{c.quantity}x</strong> {c.name}
            </div>

            {c.image_uris?.normal ? (
              <img
                src={c.image_uris.normal}
                alt={c.name}
                style={{
                  width: "100%",
                  borderRadius: "0.5rem",
                  marginBottom: "0.25rem",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "63 / 88",
                  borderRadius: "0.5rem",
                  background: "#222235",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  color: "#aaa",
                  marginBottom: "0.25rem",
                }}
              >
                Sem imagem
              </div>
            )}

            {c.set_name && (
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#9b9bb8",
                }}
              >
                {c.set_name} ({c.set?.toUpperCase()})
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default DeckView;
