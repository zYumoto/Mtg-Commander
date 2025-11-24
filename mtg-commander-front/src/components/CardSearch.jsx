import { useState } from "react";
import { useGame } from "../context/GameContext.jsx";

function CardSearch() {
  const [query, setQuery] = useState("");
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
      const res = await fetch(
        `http://localhost:4000/api/cards/search?name=${encodeURIComponent(
          query
        )}`
      );
      const data = await res.json();
      setCard(data);
    } catch (err) {
      console.error("Erro:", err);
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
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Digite o nome da carta..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Buscar</button>
      </form>

      {loading && <p>Carregando...</p>}

      {card && (
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <h4>{card.name}</h4>

          {card.image_uris?.normal ? (
            <img
              src={card.image_uris.normal}
              alt={card.name}
              style={{
                width: "250px",
                borderRadius: "8px",
                marginBottom: "1rem",
              }}
            />
          ) : (
            <p>Sem imagem disponível</p>
          )}

          <button onClick={handleAddToHand} style={{ marginTop: "0.5rem" }}>
            Adicionar na Mão
          </button>
        </div>
      )}
    </div>
  );
}

export default CardSearch;
