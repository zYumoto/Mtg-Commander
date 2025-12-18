import React, { useEffect, useMemo, useState } from "react";
import "./DecksModal.css";

export default function DecksModal({ open, onClose }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [selectedDeck, setSelectedDeck] = useState(null);

  // MOCK por enquanto (depois você liga no backend)
  const [decks, setDecks] = useState([]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKeyDown);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter((d) => (d.name || "").toLowerCase().includes(q));
  }, [decks, search]);

  function openCreate() {
    setSelectedDeck(null);
    setView("create");
  }

  function openEdit(deck) {
    setSelectedDeck(deck);
    setView("edit");
  }

  function backToList() {
    setView("list");
    setSelectedDeck(null);
  }

  function createDeck(payload) {
    // placeholder: depois troca por API
    const newDeck = {
      id: crypto.randomUUID?.() || String(Date.now()),
      name: payload.name,
      commanderName: payload.commanderName,
      commanderImage: payload.commanderImage,
    };
    setDecks((prev) => [newDeck, ...prev]);
    setView("list");
  }

  function saveDeck(payload) {
    setDecks((prev) =>
      prev.map((d) =>
        d.id === selectedDeck?.id
          ? { ...d, ...payload }
          : d
      )
    );
    setView("list");
  }

  if (!open) return null;

  return (
    <div className="decks-overlay" role="dialog" aria-modal="true">
      <button className="decks-backdrop" onClick={onClose} aria-label="Fechar" />

      <div className="decks-window">
        <div className="decks-inner">
          {/* LEFT NAV */}
          <aside className="decks-left">
            <div className="decks-title">Decks</div>

            <div className="decks-menu">
              <button
                className={`decks-tab ${view === "list" ? "active" : ""}`}
                onClick={() => setView("list")}
              >
                Meus Decks
              </button>

              <button
                className={`decks-tab ${view === "create" ? "active" : ""}`}
                onClick={openCreate}
              >
                Criar Deck
              </button>
            </div>

            <button className="decks-close" onClick={onClose}>
              Fechar
            </button>
          </aside>

          {/* RIGHT CONTENT */}
          <main className="decks-right">
            {view === "list" && (
              <DeckList
                search={search}
                setSearch={setSearch}
                decks={filtered}
                onCreate={openCreate}
                onEdit={openEdit}
              />
            )}

            {view === "create" && (
              <DeckForm
                title="Criar Deck"
                onBack={backToList}
                onSave={createDeck}
              />
            )}

            {view === "edit" && (
              <DeckForm
                title="Editar Deck"
                initial={selectedDeck}
                onBack={backToList}
                onSave={saveDeck}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function DeckList({ search, setSearch, decks, onCreate, onEdit }) {
  return (
    <div className="decks-content">
      <div className="decks-content-top">
        <input
          className="decks-search"
          placeholder="Pesquisar deck..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="decks-primary" onClick={onCreate}>
          CRIAR
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="decks-empty">
          <div className="decks-emptyCard">
            <div className="decks-emptyTitle">Nenhum deck criado</div>
            <div className="decks-emptyText">
              Clique em <b>CRIAR</b> para montar seu primeiro deck.
            </div>
          </div>
        </div>
      ) : (
        <div className="decks-list">
          {decks.map((d) => (
            <button
              key={d.id}
              className="decks-card"
              onClick={() => onEdit(d)}
              title="Editar deck"
            >
              <div className="decks-commander">
                {d.commanderImage ? (
                  <img src={d.commanderImage} alt={d.commanderName || d.name} />
                ) : (
                  <div className="decks-commanderEmpty" />
                )}
              </div>

              <div className="decks-cardText">
                <div className="decks-cardTitle">{d.name}</div>
                <div className="decks-cardSub">
                  {d.commanderName ? `Commander: ${d.commanderName}` : "Sem comandante"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DeckForm({ title, initial, onBack, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [commanderName, setCommanderName] = useState(initial?.commanderName || "");
  const [commanderImage, setCommanderImage] = useState(initial?.commanderImage || "");

  return (
    <div className="decks-content">
      <div className="decks-formTop">
        <div className="decks-formTitle">{title}</div>
        <button className="decks-secondary" onClick={onBack}>
          Voltar
        </button>
      </div>

      <div className="decks-form">
        <label className="decks-label">
          Nome do deck
          <input
            className="decks-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Dragons Naya"
          />
        </label>

        <label className="decks-label">
          Nome do comandante (opcional)
          <input
            className="decks-input"
            value={commanderName}
            onChange={(e) => setCommanderName(e.target.value)}
            placeholder="Ex.: Atraxa, Praetors' Voice"
          />
        </label>

        <label className="decks-label">
          URL da imagem do comandante (opcional)
          <input
            className="decks-input"
            value={commanderImage}
            onChange={(e) => setCommanderImage(e.target.value)}
            placeholder="Cole um link de imagem (Scryfall etc.)"
          />
        </label>

        <div className="decks-actions">
          <button
            className="decks-primary"
            onClick={() => onSave({ name, commanderName, commanderImage })}
            disabled={!name.trim()}
            title={!name.trim() ? "Informe o nome do deck" : ""}
          >
            SALVAR
          </button>
        </div>
      </div>
    </div>
  );
}
