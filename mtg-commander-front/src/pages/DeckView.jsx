import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "https://mtg-commander-4k8m.onrender.com";

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
        // 👇 agora usamos a rota simples /decks/:id
        const res = await fetch(`${API_URL}/decks/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

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
        <Link
          to="/decks"
          style={{ marginTop: "1rem", display: "inline-block" }}
        >
          ← Voltar para Meus Decks
        </Link>
      </section>
    );
  }

  if (!deck) return null;

  // só por conferência: deck.cards deve ser [{ name, quantity }]
  const cards = deck.cards || [];

  return (
    <section className="page-center" style={{ maxWidth: "1100px" }}>
      <h2>{deck.name}</h2>
      <p>
        Comandante: <strong>{deck.commander || "Não definido"}</strong>
      </p>

      <div style={{ margin: "0.5rem 0 1rem" }}>
        <Link to="/decks">← Voltar para Meus Decks</Link>{" "}
        <span style={{ marginLeft: "1rem", fontSize: "0.9rem", opacity: 0.8 }}>
          {cards.length} tipos de carta
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "1rem",
        }}
      >
        {cards.map((c, index) => {
          // limpa o nome pra casos tipo "Card Name (EOC)" etc
          const cleanName = (c.name || "")
            .replace(/\s+\(.*\)$/, "") // remove sufixo entre parênteses
            .trim();

          const imgSrc = `https://api.scryfall.com/cards/named?format=image&fuzzy=${encodeURIComponent(
            cleanName
          )}`;

          return (
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
                <strong>{c.quantity || 1}x</strong> {c.name}
              </div>

              <img
                src={imgSrc}
                alt={c.name}
                style={{
                  width: "100%",
                  borderRadius: "0.5rem",
                  marginBottom: "0.25rem",
                }}
                onError={(e) => {
                  // se mesmo assim não achar, some a imagem
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default DeckView;
