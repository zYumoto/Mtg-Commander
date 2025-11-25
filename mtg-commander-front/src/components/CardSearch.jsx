import { useState } from "react";
import { useGame } from "../context/GameContext.jsx";

function CardSearch() {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("");
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addCardToHand, roomCode } = useGame();

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    if (!roomCode) {
      alert("Você precisa estar em uma sala para buscar cartas.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("name", query);
      if (collection) params.set("set", collection);

      const res = await fetch(
        `http://localhost:4000/api/cards/search?${params.toString()}`
      );
      const data = await res.json();
      setCard(data);
    } catch (err) {
      console.error("Erro ao buscar carta:", err);
    }
    setLoading(false);
  }

  function handleAddToHand() {
    if (!card) return;
    addCardToHand(card);
  }

  return (
    <div className="form-card" style={{ marginTop: "1rem" }}>
      <h3>Buscar Carta</h3>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Nome da carta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: "1 1 160px" }}
        />

        <select
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
          style={{ flex: "1 1 180px" }}
        >
          <option value="">Todas as coleções</option>

          {/* Fallout */}
          <option value="pip">Fallout (PIP)</option>

          {/* Final Fantasy */}
          <option value="fin">Final Fantasy – Main (FIN)</option>
          <option value="fic">Final Fantasy Commander (FIC)</option>
          <option value="fca">Final Fantasy: Through the Ages (FCA)</option>

          {/* Bloomburrow */}
          <option value="blb">Bloomburrow (BLB)</option>
          <option value="blc">Bloomburrow Commander (BLC)</option>

          {/* Duskmourn */}
          <option value="dsk">Duskmourn: House of Horror (DSK)</option>
          <option value="dsc">Duskmourn Commander (DSC)</option>

          {/* The Lost Caverns of Ixalan */}
          <option value="lci">The Lost Caverns of Ixalan (LCI)</option>
          <option value="lcc">Lost Caverns Commander (LCC)</option>

          {/* Quando sair o código oficial de Edges of Eternity,
              é só adicionar algo assim:
              <option value="XXX">Edges of Eternity (XXX)</option>
          */}
        </select>

        <button type="submit">Buscar</button>
      </form>

      {loading && <p style={{ marginTop: "0.5rem" }}>Carregando...</p>}

      {card && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <h4>{card.name}</h4>
          {card.set_name && (
            <p style={{ fontSize: "0.85rem", color: "#c5c5d5" }}>
              Coleção: <strong>{card.set_name}</strong> ({card.set?.toUpperCase()})
            </p>
          )}

          {card.image_uris?.normal ? (
            <img
              src={card.image_uris.normal}
              alt={card.name}
              style={{
                width: "250px",
                borderRadius: "8px",
                margin: "0.5rem auto 1rem",
                display: "block",
              }}
            />
          ) : (
            <p>Sem imagem disponível</p>
          )}

          <button onClick={handleAddToHand}>Adicionar na Mão</button>
        </div>
      )}
    </div>
  );
}

export default CardSearch;
