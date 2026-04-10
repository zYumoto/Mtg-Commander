import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { API_URL } from "../config.js";
import "./DecksPage.css";

function normalizeCardName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function getCardImageUrl(name) {
  if (!name) return "";
  return `https://api.scryfall.com/cards/named?format=image&version=art_crop&fuzzy=${encodeURIComponent(
    name
  )}`;
}

function extractImageUrl(card) {
  if (!card) return "";
  if (card.imageUrl) return card.imageUrl;
  if (card.image_uris?.art_crop) return card.image_uris.art_crop;
  if (card.image_uris?.normal) return card.image_uris.normal;
  if (Array.isArray(card.card_faces)) {
    return (
      card.card_faces[0]?.image_uris?.art_crop ||
      card.card_faces[0]?.image_uris?.normal ||
      ""
    );
  }
  return "";
}

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

function preserveCardDetails(cards, existingCards) {
  const detailsMap = new Map(
    (existingCards || []).map((card) => [normalizeCardName(card.name), card])
  );

  return (cards || []).map((card) => {
    const previous = detailsMap.get(normalizeCardName(card.name));
    return {
      name: card.name,
      quantity: Number(card.quantity) || 1,
      imageUrl:
        previous?.imageUrl || card.imageUrl || extractImageUrl(card) || getCardImageUrl(card.name),
    };
  });
}

function createSearchCard(card) {
  return {
    name: card.name,
    imageUrl: extractImageUrl(card) || getCardImageUrl(card.name),
    typeLine: card.type_line || card.card_faces?.[0]?.type_line || "",
    manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || "",
    setName: card.set_name || "",
  };
}

function EditDeck() {
  const { id } = useParams();
  const isNew = !id;
  const { token, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [builderMode, setBuilderMode] = useState("list");
  const [name, setName] = useState("");
  const [commander, setCommander] = useState("");
  const [deckCards, setDeckCards] = useState([]);
  const [deckText, setDeckText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingCards, setSearchingCards] = useState(false);
  const [searchError, setSearchError] = useState("");

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

        const resolvedCards = preserveCardDetails(data.cards || [], []);
        setName(data.name || "");
        setCommander(data.commander || "");
        setDeckCards(resolvedCards);
        setDeckText(buildDeckText(resolvedCards));
      } catch (err) {
        setError(err.message || "Erro ao carregar deck");
      }
    }

    fetchDeck();
  }, [id, token]);

  const totalCards = useMemo(
    () => deckCards.reduce((sum, card) => sum + (Number(card.quantity) || 0), 0),
    [deckCards]
  );

  const previewCards = useMemo(
    () =>
      deckCards
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [deckCards]
  );

  const commanderPreviewUrl = useMemo(() => getCardImageUrl(commander.trim()), [commander]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (builderMode !== "visual") return;

    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearchingCards(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      handleSearchCards(trimmedQuery);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [builderMode, searchQuery]);

  useEffect(() => {
    const trimmedCommander = commander.trim();
    if (!trimmedCommander) return;

    if (!nameTouched || !name.trim()) {
      setName(`${trimmedCommander} - Commander`);
    }
  }, [commander, name, nameTouched]);

  function syncDeckFromText(nextText) {
    setDeckText(nextText);
    setDeckCards((prev) => preserveCardDetails(parseDeckText(nextText), prev));
  }

  function syncDeckFromCards(nextCards) {
    const normalizedCards = preserveCardDetails(nextCards, deckCards);
    setDeckCards(normalizedCards);
    setDeckText(buildDeckText(normalizedCards));
  }

  function addCardToDeck(card) {
    syncDeckFromCards(
      deckCards.some((entry) => normalizeCardName(entry.name) === normalizeCardName(card.name))
        ? deckCards.map((entry) =>
            normalizeCardName(entry.name) === normalizeCardName(card.name)
              ? { ...entry, quantity: entry.quantity + 1 }
              : entry
          )
        : [
            ...deckCards,
            {
              name: card.name,
              quantity: 1,
              imageUrl: card.imageUrl || getCardImageUrl(card.name),
            },
          ]
    );
  }

  function removeCardFromDeck(cardName) {
    syncDeckFromCards(
      deckCards.flatMap((entry) => {
        if (normalizeCardName(entry.name) !== normalizeCardName(cardName)) {
          return [entry];
        }
        if (entry.quantity <= 1) {
          return [];
        }
        return [{ ...entry, quantity: entry.quantity - 1 }];
      })
    );
  }

  function setCommanderCard(card) {
    setCommander(card.name);
  }

  function handleDragStart(card, source) {
    const payload = {
      name: card.name,
      imageUrl: card.imageUrl || getCardImageUrl(card.name),
      source,
    };

    return (e) => {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("application/json", JSON.stringify(payload));
    };
  }

  function readDraggedCard(e) {
    try {
      const raw = e.dataTransfer.getData("application/json");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function handleDropToDeck(e) {
    e.preventDefault();
    const card = readDraggedCard(e);
    if (!card?.name) return;
    addCardToDeck(card);
  }

  function handleDropToCommander(e) {
    e.preventDefault();
    const card = readDraggedCard(e);
    if (!card?.name) return;
    setCommanderCard(card);
  }

  async function handleSearchCards(queryOverride) {
    const finalQuery =
      typeof queryOverride === "string" ? queryOverride.trim() : searchQuery.trim();
    if (!finalQuery) return;

    setSearchingCards(true);
    setSearchError("");

    try {
      const query = `${finalQuery} game:paper`;
      const res = await fetch(
        `${API_URL}/api/cards/search?q=${encodeURIComponent(query)}&order=name&unique=cards`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || "Erro ao buscar cartas");
      }

      setSearchResults((data.data || []).slice(0, 12).map(createSearchCard));
    } catch (err) {
      setSearchResults([]);
      setSearchError(err.message || "Erro ao buscar cartas");
    } finally {
      setSearchingCards(false);
    }
  }

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
        cards: deckCards.map(({ name: cardName, quantity }) => ({
          name: cardName,
          quantity,
        })),
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
                Monte no modo lista ou no modo visual. Os dois ficam sincronizados e o
                deck salvo continua no formato Commander: 99 cartas + 1 comandante.
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

          <div className="deckshell__modeSwitch" role="tablist" aria-label="Modo do builder">
            <button
              type="button"
              className={`deckshell__modeBtn ${builderMode === "list" ? "isActive" : ""}`}
              onClick={() => setBuilderMode("list")}
            >
              Modo lista
            </button>
            <button
              type="button"
              className={`deckshell__modeBtn ${builderMode === "visual" ? "isActive" : ""}`}
              onClick={() => setBuilderMode("visual")}
            >
              Modo visual
            </button>
          </div>

          {builderMode === "list" ? (
            <div className="deckshell__builderGrid">
              <div className="deckshell__panel">
                <div className="deckshell__sectionHead deckshell__sectionHead--compact">
                  <span>Lista</span>
                  <h2>Cartas do deck</h2>
                  <p>
                    Aceita `4 Lightning Bolt` ou `4x Lightning Bolt`. Linhas com `//`
                    sao ignoradas.
                  </p>
                </div>

                <label className="deckshell__field">
                  <span>Lista de cartas (99)</span>
                  <textarea
                    rows={16}
                    className="deckshell__textarea deckshell__textarea--mono"
                    placeholder={`Exemplo:\n1 Sol Ring\n1 Command Tower\n10 Plains\n10 Island\n...`}
                    value={deckText}
                    onChange={(e) => syncDeckFromText(e.target.value)}
                  />
                </label>

                <div className="deckshell__counterRow">
                  <span>Cartas na lista</span>
                  <strong
                    className={
                      totalCards === 99 ? "isValid" : totalCards > 99 ? "isError" : "isWarn"
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

                {previewCards.length === 0 ? (
                  <div className="deckshell__emptyState">
                    Digite sua lista para ver um resumo aqui.
                  </div>
                ) : (
                  <div className="deckshell__previewList">
                    {previewCards.map((card, index) => (
                      <div key={`${card.name}-${index}`} className="deckshell__previewRow">
                        <span>{card.name}</span>
                        <strong>{card.quantity || 1}x</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="deckshell__visualGrid">
              <div className="deckshell__panel">
                <div className="deckshell__sectionHead deckshell__sectionHead--compact">
                  <span>Busca</span>
                  <h2>Procure e arraste cartas</h2>
                  <p>
                    Digite o inicio do nome da carta para receber sugestoes. Depois arraste para
                    o comandante ou solte na lista do deck.
                  </p>
                </div>

                <div className="deckshell__searchBar">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: Sol, Command, Atraxa..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchCards();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={searchingCards}
                    onClick={() => handleSearchCards()}
                  >
                    {searchingCards ? "Buscando..." : "Buscar"}
                  </button>
                </div>

                {searchError && <p className="feedback-text">{searchError}</p>}

                {searchResults.length === 0 ? (
                  <div className="deckshell__emptyState deckshell__emptyState--compact">
                    {searchQuery.trim().length < 2
                      ? "Digite pelo menos 2 letras para ver recomendacoes."
                      : "Nenhuma sugestao encontrada para essa busca."}
                  </div>
                ) : (
                  <div className="deckshell__searchResults">
                    {searchResults.map((card) => (
                      <article
                        key={card.name}
                        className="deckshell__searchCard"
                        draggable
                        onDragStart={handleDragStart(card, "search")}
                      >
                        <img src={card.imageUrl} alt={card.name} className="deckshell__searchImage" />
                        <div className="deckshell__searchBody">
                          <strong>{card.name}</strong>
                          <span>{card.typeLine || "Carta"}</span>
                          <small>
                            {[card.manaCost, card.setName].filter(Boolean).join("  •  ") || "MTG"}
                          </small>
                        </div>
                        <div className="deckshell__searchActions">
                          <button type="button" onClick={() => setCommanderCard(card)}>
                            Comandante
                          </button>
                          <button type="button" onClick={() => addCardToDeck(card)}>
                            Adicionar
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="deckshell__panel">
                <div className="deckshell__sectionHead deckshell__sectionHead--compact">
                  <span>Montagem visual</span>
                  <h2>Arraste para construir</h2>
                  <p>
                    Solte uma carta no quadro do comandante ou na lista abaixo. Cada drop no
                    deck adiciona uma copia.
                  </p>
                </div>

                <div className="deckshell__summaryCards">
                  <article className="deckshell__summaryCard">
                    <span>Deck</span>
                    <strong>{name.trim() || "Sem nome definido"}</strong>
                  </article>
                  <article className="deckshell__summaryCard">
                    <span>Cartas no deck</span>
                    <strong>{totalCards} / 99</strong>
                  </article>
                </div>

                <div
                  className="deckshell__commanderDrop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropToCommander}
                >
                  <div className="deckshell__commanderDropCopy">
                    <span>Comandante</span>
                    <strong>{commander.trim() || "Arraste uma carta para ca"}</strong>
                  </div>
                  {commander.trim() ? (
                    <div className="deckshell__commanderDropVisual">
                      <img src={commanderPreviewUrl} alt={commander} />
                      <button type="button" onClick={() => setCommander("")}>
                        Limpar comandante
                      </button>
                    </div>
                  ) : (
                    <div className="deckshell__commanderDropEmpty">
                      Solte aqui a carta que sera o comandante.
                    </div>
                  )}
                </div>

                <div
                  className="deckshell__deckDrop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropToDeck}
                >
                  <div className="deckshell__deckDropHeader">
                    <span>Deck principal</span>
                    <strong
                      className={
                        totalCards === 99 ? "isValid" : totalCards > 99 ? "isError" : "isWarn"
                      }
                    >
                      {totalCards} / 99
                    </strong>
                  </div>

                  {previewCards.length === 0 ? (
                    <div className="deckshell__emptyState deckshell__emptyState--compact">
                      Arraste cartas para esta area para montar o deck mao a mao.
                    </div>
                  ) : (
                    <div className="deckshell__visualList">
                      {previewCards.map((card) => (
                        <article key={card.name} className="deckshell__visualCard">
                          <img
                            src={card.imageUrl || getCardImageUrl(card.name)}
                            alt={card.name}
                            className="deckshell__visualCardImage"
                          />
                          <div className="deckshell__visualCardBody">
                            <strong>{card.name}</strong>
                            <span>{card.quantity} copia(s)</span>
                          </div>
                          <div className="deckshell__visualCardActions">
                            <button type="button" onClick={() => addCardToDeck(card)}>
                              +1
                            </button>
                            <button type="button" onClick={() => removeCardFromDeck(card.name)}>
                              Remover
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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


