import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "https://mtg-commander-4k8m.onrender.com";

// Converte o texto da lista em [{ name, quantity }]
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
  const [nameTouched, setNameTouched] = useState(false);

  // se não estiver logado, manda pro login
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  // carrega deck se for edição
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
        setName(data.name || "");
        setCommander(data.commander || "");
        setDeckText(buildDeckText(data.cards || []));
      } catch (err) {
        setError(err.message);
      }
    }
    fetchDeck();
  }, [id, token]);

  // parse dinâmico da lista
  const parsedCards = useMemo(() => parseDeckText(deckText), [deckText]);

  const totalCards = useMemo(
    () =>
      parsedCards.reduce(
        (sum, c) => sum + (Number(c.quantity) || 0),
        0
      ),
    [parsedCards]
  );

  // sugerir nome do deck a partir do comandante
  useEffect(() => {
    const cmd = commander.trim();
    if (!cmd) return;

    if (!nameTouched || !name.trim()) {
      setName(`${cmd} – Commander`);
    }
  }, [commander]); // leitura de name/nameTouched é suficiente assim

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const cleanName = name.trim();
      const cleanCommander = commander.trim();

      if (!cleanName) {
        throw new Error("Informe o nome do deck.");
      }

      if (!cleanCommander) {
        throw new Error("Informe o comandante do deck.");
      }

      if (totalCards === 0) {
        throw new Error("A lista de cartas está vazia.");
      }

      // AQUI: commander separado → 99 cartas na lista
      if (totalCards !== 99) {
  alert(`Seu deck tem ${totalCards} cartas — Commander exige 99.`);
  return;
}


      const cards = parsedCards;

      const payload = {
        name: cleanName,
        commander: cleanCommander,
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
    <section
      className="page-center"
      style={{ maxWidth: "1100px", textAlign: "left" }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
        {isNew ? "Criar novo deck" : "Editar deck"}
      </h2>
      <p style={{ textAlign: "center", marginBottom: "1rem", opacity: 0.8 }}>
        Deck de Commander = 99 cartas na lista + 1 comandante separado.
      </p>

      <form onSubmit={handleSave} className="form-card">
        {/* NOME DO DECK */}
        <label style={{ display: "block", marginBottom: "0.75rem" }}>
          Nome do deck:
          <input
            type="text"
            placeholder="Ex: Atraxa Superfriends"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            style={{ marginTop: "0.25rem" }}
          />
        </label>

        {/* COMANDANTE */}
        <label style={{ display: "block", marginBottom: "0.75rem" }}>
          Comandante:
          <input
            type="text"
            placeholder="Nome do comandante"
            value={commander}
            onChange={(e) => setCommander(e.target.value)}
            style={{ marginTop: "0.25rem" }}
          />
        </label>

        {/* GRID: LISTA + PREVIEW SIMPLES */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.1fr)",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          {/* LISTA DE CARTAS */}
          <div>
            <label>
              Lista de cartas (99):
              <textarea
                rows={14}
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
                placeholder={`Exemplo:\n1 Sol Ring\n1 Command Tower\n10 Plains\n10 Island\n...`}
                value={deckText}
                onChange={(e) => setDeckText(e.target.value)}
              />
            </label>

            {/* CONTADOR DE CARTAS */}
            <div
              style={{
                marginTop: "0.4rem",
                fontSize: "0.85rem",
                opacity: 0.9,
              }}
            >
              Cartas na lista:{" "}
              <strong
                style={{
                  color:
                    totalCards === 99
                      ? "#4ade80" // verde
                      : totalCards === 100
                      ? "#f87171" // vermelho
                      : "#facc15", // amarelo
                }}
              >
                {totalCards}
              </strong>{" "}
              / 99
            </div>

            <p
              style={{
                marginTop: "0.15rem",
                fontSize: "0.8rem",
                opacity: 0.75,
              }}
            >
              Formatos aceitos: <code>4 Lightning Bolt</code> ou{" "}
              <code>4x Lightning Bolt</code>. Linhas começando com{" "}
              <code>//</code> são ignoradas.
            </p>
          </div>

          {/* PREVIEW RÁPIDO (NOME + QUANTIDADE) */}
          <div>
            <div
              style={{
                marginBottom: "0.35rem",
                fontSize: "0.9rem",
                opacity: 0.85,
              }}
            >
              Preview rápido:
            </div>

            {parsedCards.length === 0 ? (
              <div
                style={{
                  borderRadius: "0.75rem",
                  border: "1px dashed #3b3b5f",
                  padding: "1rem",
                  fontSize: "0.85rem",
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                Digite sua lista para ver um resumo aqui.
              </div>
            ) : (
              <div
                style={{
                  borderRadius: "0.75rem",
                  border: "1px solid #26263f",
                  padding: "0.75rem",
                  maxHeight: "360px",
                  overflowY: "auto",
                  background: "#050515",
                  fontSize: "0.85rem",
                }}
              >
                {parsedCards.map((c, index) => (
                  <div
                    key={`${c.name}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
                      padding: "2px 0",
                    }}
                  >
                    <span>{c.name}</span>
                    <strong>{c.quantity || 1}x</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ERRO + BOTÃO SALVAR */}
        {error && (
          <p
            style={{
              color: "#ff6b6b",
              fontSize: "0.85rem",
              marginTop: "0.75rem",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ marginTop: "1rem", textAlign: "right" }}>
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar deck"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default EditDeck;
