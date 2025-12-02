import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const API_URL = "http://localhost:4000";

function Decks() {
  const { token, isAuthenticated, loading } = useAuth();
  const [decks, setDecks] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    async function fetchDecks() {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/decks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar decks");
        setDecks(data);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchDecks();
  }, [token]);

  async function handleDelete(id) {
    if (!window.confirm("Tem certeza que deseja excluir este deck?")) return;
    try {
      const res = await fetch(`${API_URL}/decks/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir deck");
      }
      setDecks((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDuplicate(id) {
    try {
      const res = await fetch(`${API_URL}/decks/${id}/duplicate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao duplicar deck");
      setDecks((prev) => [data, ...prev]);
    } catch (err) {
      alert(err.message);
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
  <section className="page-center" style={{ maxWidth: "900px" }}>
    <div className="deck-page-header">
      <h1>Meus decks</h1>

      <Link to="/decks/new">
        <button className="btn-deck-primary">Criar novo deck</button>
      </Link>
    </div>

    {error && <p className="error-text">{error}</p>}

    {decks.length === 0 ? (
      <p>Você ainda não tem decks. Clique em "Criar novo deck".</p>
    ) : (
      <div className="form-card deck-list-card">
        <table className="deck-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Comandante</th>
              <th style={{ textAlign: "center" }}>Cartas</th>
              <th className="align-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {decks.map((deck) => (
              <tr key={deck._id}>
                <td>{deck.name}</td>
                <td>{deck.commander || "-"}</td>
                <td style={{ textAlign: "center" }}>
                  {deck.cards?.reduce(
                    (sum, c) => sum + (c.quantity || 1),
                    0
                  ) || 0}
                </td>

                <td className="align-right">
                  <div className="deck-actions">
                    <Link to={`/decks/${deck._id}/view`}>
                      <button className="btn-deck">Ver</button>
                    </Link>

                    <Link to={`/decks/${deck._id}/edit`}>
                      <button className="btn-deck">Editar</button>
                    </Link>

                    <button
                      className="btn-deck"
                      onClick={() => handleDuplicate(deck._id)}
                    >
                      Duplicar
                    </button>

                    <button
                      className="btn-deck btn-deck-danger"
                      onClick={() => handleDelete(deck._id)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
}

export default Decks;
