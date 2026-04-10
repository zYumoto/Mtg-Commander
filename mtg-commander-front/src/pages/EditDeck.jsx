import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { API_URL } from "../config.js";
import "./DecksPage.css";

function parseDeckText(deckText) {
  const lines = deckText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//"));

  const cards = [];

  for (const line of lines) {
    const match = line.match(/^(\d+)x?\s+(.+)$/i);
    if (match) {
      cards.push({
        quantity: Number.parseInt(match[1], 10),
        name: match[2].trim(),
      });
    } else {
      cards.push({ name: line, quantity: 1 });
    }
  }

  return cards;
}

function buildDeckText(cards) {
  return (cards || [])
    .map((card) => `${card.quantity || 1} ${card.name}`)
    .join("\n");
}

function EditDeck() {
  const { id } = useParams();
  const isNew = !id;
  const { token, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [commander, setCommander] = useState("");
  const [deckText, setDeckText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

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

        setName(data.name || "");
        setCommander(data.commander || "");
        setDeckText(buildDeckText(data.cards || []));
      } catch (err) {
        setError(err.message || "Erro ao carregar deck");
      }
    }

    fetchDeck();
  }, [id, token]);

  const parsedCards = useMemo(() => parseDeckText(deckText), [deckText]);
  const totalCards = useMemo(
    () => parsedCards.reduce((sum, card) => sum + (Number(card.quantity) || 0), 0),
    [parsedCards]
  );

  useEffect(() => {
    const trimmedCommander = commander.trim();
    if (!trimmedCommander) return;

    if (!nameTouched || !name.trim()) {
      setName(`${trimmedCommander} - Commander`);
    }
  }, [commander, name, nameTouched]);

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
        throw new Error("A lista de cartas esta vazia.");
      }

      if (totalCards !== 99) {
        alert(`Seu deck tem ${totalCards} cartas. Commander exige 99.`);
        return;
      }

      const payload = {
        name: cleanName,
        commander: cleanCommander,
        cards: parsedCards,
      };

      const url = isNew ? `${API_URL}/decks` : `${API_URL}/decks/${id}`;
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
      setError(err.message || "Erro ao salvar deck");
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
    <section className="deckshell">
      <div className="deckshell__wrap">
        <div className="deckshell__hero">
          <div className="deckshell__heroTopline">Deck builder</div>
          <div className="deckshell__heroBar">
            <div>
              <h1>{isNew ? "Criar novo deck" : "Editar deck"}</h1>
              <p>
                Deck de Commander = 99 cartas na lista + 1 comandante separado.
              </p>
            </div>

            <div className="deckshell__heroActions">
              <Link to="/decks" className="deckshell__ghostLink">
                Voltar para Meus Decks
              </Link>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="deckshell__formCard form-card">
          <div className="deckshell__sectionHead">
            <span>Identidade</span>
            <h2>Informacoes principais</h2>
            <p>Defina o nome do deck e o comandante antes de montar a lista.</p>
          </div>

          <div className="deckshell__fieldGrid">
            <label className="deckshell__field">
              <span>Nome do deck</span>
              <input
                type="text"
                placeholder="Ex: Atraxa Superfriends"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameTouched(true);
                }}
              />
            </label>

            <label className="deckshell__field">
              <span>Comandante</span>
              <input
                type="text"
                placeholder="Nome do comandante"
                value={commander}
                onChange={(e) => setCommander(e.target.value)}
              />
            </label>
          </div>

          <div className="deckshell__builderGrid">
            <div className="deckshell__panel">
              <div className="deckshell__sectionHead deckshell__sectionHead--compact">
                <span>Lista</span>
                <h2>Cartas do deck</h2>
                <p>
                  Aceita `4 Lightning Bolt` ou `4x Lightning Bolt`. Linhas com
                  `//` sao ignoradas.
                </p>
              </div>

              <label className="deckshell__field">
                <span>Lista de cartas (99)</span>
                <textarea
                  rows={16}
                  className="deckshell__textarea deckshell__textarea--mono"
                  placeholder={`Exemplo:\n1 Sol Ring\n1 Command Tower\n10 Plains\n10 Island\n...`}
                  value={deckText}
                  onChange={(e) => setDeckText(e.target.value)}
                />
              </label>

              <div className="deckshell__counterRow">
                <span>Cartas na lista</span>
                <strong
                  className={
                    totalCards === 99
                      ? "isValid"
                      : totalCards > 99
                      ? "isError"
                      : "isWarn"
                  }
                >
                  {totalCards} / 99
                </strong>
              </div>
            </div>

            <div className="deckshell__panel">
              <div className="deckshell__sectionHead deckshell__sectionHead--compact">
                <span>Resumo</span>
                <h2>Preview rapido</h2>
                <p>Uma leitura direta da lista para revisar nome e quantidade.</p>
              </div>

              <div className="deckshell__summaryCards">
                <article className="deckshell__summaryCard">
                  <span>Deck</span>
                  <strong>{name.trim() || "Sem nome definido"}</strong>
                </article>
                <article className="deckshell__summaryCard">
                  <span>Comandante</span>
                  <strong>{commander.trim() || "Nao definido"}</strong>
                </article>
              </div>

              {parsedCards.length === 0 ? (
                <div className="deckshell__emptyState">
                  Digite sua lista para ver um resumo aqui.
                </div>
              ) : (
                <div className="deckshell__previewList">
                  {parsedCards.map((card, index) => (
                    <div
                      key={`${card.name}-${index}`}
                      className="deckshell__previewRow"
                    >
                      <span>{card.name}</span>
                      <strong>{card.quantity || 1}x</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <p className="feedback-text">{error}</p>}

          <div className="deckshell__footer">
            <Link to="/decks" className="deckshell__ghostLink">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar deck"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default EditDeck;
