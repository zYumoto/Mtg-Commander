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
    <section className="page-center" style={{ maxWidth: "800px" }}>
      <h2>Meus Decks</h2>
      <p>Gerencie aqui seus decks de Commander.</p>

      {error && (
        <p style={{ color: "#ff6b6b", marginBottom: "0.75rem" }}>{error}</p>
      )}

      <div style={{ textAlign: "right", marginBottom: "1rem" }}>
        <Link to="/decks/new">
          <button>Criar novo deck</button>
        </Link>
      </div>

      {decks.length === 0 ? (
        <p>Você ainda não tem decks. Clique em "Criar novo deck".</p>
      ) : (
        <div className="form-card">
          <table style={{ width: "100%", fontSize: "0.9rem" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Nome</th>
                <th style={{ textAlign: "left" }}>Comandante</th>
                <th style={{ textAlign: "center" }}>Cartas</th>
                <th style={{ textAlign: "right" }}>Ações</th>
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
                  <td style={{ textAlign: "right" }}>
                    <Link to={`/decks/${deck._id}/view`}>
                      <button style={{ marginRight: "0.5rem" }}>Ver</button>
                    </Link>

                    <Link to={`/decks/${deck._id}/edit`}>
                      <button style={{ marginRight: "0.5rem" }}>Editar</button>
                    </Link>

                    <button
                      onClick={() => handleDuplicate(deck._id)}
                      style={{ marginRight: "0.5rem" }}
                    >
                      Duplicar
                    </button>

                    <button onClick={() => handleDelete(deck._id)}>
                      Excluir
                    </button>
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
