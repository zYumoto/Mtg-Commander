import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "http://localhost:4000";

function parseDeckText(deckText) {
  const lines = deckText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//"));

  const cards = [];

  for (const line of lines) {
    const match = line.match(/^(\d+)x?\s+(.+)$/i);
    if (match) {
      const quantity = parseInt(match[1], 10);
      const name = match[2].trim();
      cards.push({ name, quantity });
    } else {
      // se não tiver número, considera 1
      cards.push({ name: line, quantity: 1 });
    }
  }

  return cards;
}

function buildDeckText(cards) {
  return (cards || [])
    .map((c) => `${c.quantity || 1} ${c.name}`)
    .join("\n");
}

function EditDeck() {
  const { id } = useParams(); // se tem id = edição; se não = novo
  const isNew = !id;
  const { token, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [commander, setCommander] = useState("");
  const [deckText, setDeckText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    async function fetchDeck() {
      if (!id || !token) return;
      try {
        const res = await fetch(`${API_URL}/decks/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar deck");
        setName(data.name);
        setCommander(data.commander || "");
        setDeckText(buildDeckText(data.cards || []));
      } catch (err) {
        setError(err.message);
      }
    }
    fetchDeck();
  }, [id, token]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const cards = parseDeckText(deckText);

      const payload = {
        name,
        commander,
        cards,
      };

      const url = isNew
        ? `${API_URL}/decks`
        : `${API_URL}/decks/${id}`;

      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar deck");

      navigate("/decks");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="page-center">
        <p>Carregando...</p>
      </section>
    );
  }

  return (
    <section className="page-center" style={{ maxWidth: "800px" }}>
      <h2>{isNew ? "Criar novo deck" : "Editar deck"}</h2>
      <p>Monte seu deck de Commander. Depois vamos integrar com as cartas reais.</p>

      <form onSubmit={handleSave} className="form-card">
        <label>
          Nome do deck:
          <input
            type="text"
            placeholder="Ex: Fallout – Dogmeat Midrange"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label>
          Comandante:
          <input
            type="text"
            placeholder="Nome do comandante"
            value={commander}
            onChange={(e) => setCommander(e.target.value)}
          />
        </label>

        <label>
          Lista de cartas:
          <textarea
            rows={12}
            style={{
              width: "100%",
              marginTop: "0.25rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid #30304a",
              background: "#10101a",
              color: "#f5f5f5",
              fontFamily: "monospace",
              fontSize: "0.9rem",
              resize: "vertical",
            }}
            placeholder={`Exemplo:
1 Sol Ring
1 Command Tower
10 Plains
10 Island`}
            value={deckText}
            onChange={(e) => setDeckText(e.target.value)}
          />
        </label>

        {error && (
          <p style={{ color: "#ff6b6b", fontSize: "0.85rem" }}>{error}</p>
        )}

        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar deck"}
        </button>
      </form>
    </section>
  );
}

export default EditDeck;
