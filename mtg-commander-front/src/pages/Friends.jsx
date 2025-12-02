import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

function Friends() {
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setResults([]);

    if (!query.trim()) return;

    try {
      setLoading(true);

      // TODO: ajustar para o endpoint real quando o backend de amigos existir
      const res = await fetch(
        `http://localhost:4000/auth/users/search?q=${encodeURIComponent(
          query
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!res.ok) {
        throw new Error("Erro ao buscar usuários");
      }

      const data = await res.json();
      setResults(data.users || []);
    } catch (err) {
      setError(err.message || "Erro ao buscar usuários");
    } finally {
      setLoading(false);
    }
  }

  function handleAddFriend(id) {
    // TODO: implementar chamada real para adicionar amigos quando fizer o backend
    setInfo("Funcionalidade de adicionar amigos ainda será ligada ao backend.");
    console.log("Adicionar amigo:", id);
  }

  return (
    <section className="page-center" style={{ maxWidth: "700px" }}>
      <h1>Amigos</h1>
      <p>
        Busque outros jogadores pelo apelido ou e-mail para adicionar como
        amigos.
      </p>

      <form onSubmit={handleSearch} className="form-card">
        <h3>Buscar usuários</h3>
        <label>
          Nome, apelido ou e-mail
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: zYumoto ou exemplo@email.com"
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>

        {error && <p className="feedback-text">{error}</p>}
      </form>

      {results.length > 0 && (
        <div className="form-card">
          <h3>Resultados</h3>
          <ul className="friend-list">
            {results.map((u) => (
              <li key={u._id || u.id} className="friend-item">
                <div className="friend-main">
                  <strong>
                    {u.nickname || u.fullName || u.email || "Jogador"}
                  </strong>
                  {u.nickname && (
                    <span className="friend-sub">@{u.nickname}</span>
                  )}
                  {u.email && (
                    <span className="friend-sub small">{u.email}</span>
                  )}
                </div>

                {user && (u._id === user._id || u.id === user._id) ? (
                  <span className="friend-me-badge">Você</span>
                ) : (
                  <button
                    type="button"
                    className="btn-deck"
                    onClick={() => handleAddFriend(u._id || u.id)}
                  >
                    Adicionar
                  </button>
                )}
              </li>
            ))}
          </ul>

          {info && <p className="feedback-text">{info}</p>}
        </div>
      )}

      {!loading && !error && results.length === 0 && query.trim() && (
        <p className="feedback-text">Nenhum usuário encontrado.</p>
      )}
    </section>
  );
}

export default Friends;
