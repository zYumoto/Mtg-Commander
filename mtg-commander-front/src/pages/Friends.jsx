import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { API_URL } from "../config.js";

function Friends() {
  const { user, token } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [blocked, setBlocked] = useState([]);

  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!token) return;
    loadFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function displayName(u) {
    if (!u) return "";
    return u.nickname || u.fullName || u.email || "Jogador";
  }

  async function loadFriends() {
    try {
      setError("");
      setInfo("");
      setLoadingFriends(true);

      const res = await fetch(`${API_URL}/auth/friends`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao carregar amigos");
      }

      setFriends(data.friends || []);
      setBlocked(data.blocked || []);
    } catch (err) {
      setError(err.message || "Erro ao carregar amigos");
    } finally {
      setLoadingFriends(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setResults([]);

    const q = query.trim();
    if (!q) return;

    if (!token) {
      setError("Você precisa estar logado para buscar usuários.");
      return;
    }

    try {
      setLoadingSearch(true);

      const res = await fetch(
        `${API_URL}/auth/users/search?q=${encodeURIComponent(q)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao buscar usuários");
      }

      setResults(data.users || []);
    } catch (err) {
      setError(err.message || "Erro ao buscar usuários");
    } finally {
      setLoadingSearch(false);
    }
  }

  async function handleAddFriend(targetId) {
    if (!token) {
      setError("Você precisa estar logado para adicionar amigos.");
      return;
    }

    try {
      setError("");
      setInfo("");

      const res = await fetch(`${API_URL}/auth/friends/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: targetId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao adicionar amigo");
      }

      await loadFriends();
      setInfo("Amigo adicionado com sucesso!");
    } catch (err) {
      setError(err.message || "Erro ao adicionar amigo");
    }
  }

  async function handleRemoveFriend(targetId) {
    try {
      setError("");
      setInfo("");

      const res = await fetch(`${API_URL}/auth/friends/remove`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: targetId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao remover amigo");
      }

      await loadFriends();
      setInfo("Amizade removida.");
    } catch (err) {
      setError(err.message || "Erro ao remover amigo");
    }
  }

  async function handleBlock(targetId) {
    try {
      setError("");
      setInfo("");

      const res = await fetch(`${API_URL}/auth/block`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: targetId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao bloquear usuário");
      }

      await loadFriends();
      setInfo("Usuário bloqueado.");
    } catch (err) {
      setError(err.message || "Erro ao bloquear usuário");
    }
  }

  async function handleUnblock(targetId) {
    try {
      setError("");
      setInfo("");

      const res = await fetch(`${API_URL}/auth/unblock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: targetId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao desbloquear usuário");
      }

      await loadFriends();
      setInfo("Usuário desbloqueado.");
    } catch (err) {
      setError(err.message || "Erro ao desbloquear usuário");
    }
  }

  function isFriend(id) {
    return friends.some((f) => String(f._id) === String(id));
  }

  function isBlocked(id) {
    return blocked.some((b) => String(b._id) === String(id));
  }

  function goToProfile(id) {
    if (!id) return;
    setError("");
    setInfo("Visualizacao publica de perfil/decks ainda nao foi implementada.");
  }

  return (
    <section className="friends-page">
      {/* Hero do próprio usuário */}
      <div className="friends-hero-card">
        <div className="friends-hero-avatar">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={displayName(user)} />
          ) : (
            <span>
              {(displayName(user) || "?").charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="friends-hero-info">
          <div className="friends-hero-name">
            <h1>{displayName(user)}</h1>
            {user?.nickname && (
              <span className="friends-tag">@{user.nickname}</span>
            )}
          </div>

          {user?.email && (
            <p className="friends-hero-email">{user.email}</p>
          )}

          {user?.bio && (
            <p className="friends-hero-bio">{user.bio}</p>
          )}

          <p className="friends-hero-sub">
            Gerencie seus amigos, bloqueios e veja os decks dos jogadores.
          </p>
        </div>
      </div>

      <div className="friends-layout">
        {/* Coluna esquerda: amigos + bloqueados */}
        <div className="friends-column">
          <div className="form-card friends-card">
            <div className="friends-card-header">
              <h2>Meus amigos</h2>
              {loadingFriends && <span>Carregando...</span>}
            </div>

            {!loadingFriends && friends.length === 0 && (
              <p className="hud-hand-empty">
                Você ainda não adicionou ninguém. Use a busca ao lado.
              </p>
            )}

            {!loadingFriends && friends.length > 0 && (
              <div className="friend-card-list">
                {friends.map((f) => (
                  <div key={f._id} className="friend-card">
                    <div className="friend-card-avatar">
                      {f.avatarUrl ? (
                        <img src={f.avatarUrl} alt={displayName(f)} />
                      ) : (
                        <span>
                          {displayName(f).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="friend-card-body">
                      <div className="friend-card-header-line">
                        <strong>{displayName(f)}</strong>
                        <span className="friend-status-pill">Amigo</span>
                      </div>

                      {f.nickname && (
                        <div className="friend-card-sub">
                          @{f.nickname}
                        </div>
                      )}

                      {f.email && (
                        <div className="friend-card-sub small">
                          {f.email}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: "0.25rem",
                          display: "flex",
                          gap: "0.35rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="btn-deck"
                          onClick={() => goToProfile(f._id)}
                        >
                          Ver decks
                        </button>
                        <button
                          type="button"
                          className="btn-deck"
                          onClick={() => handleRemoveFriend(f._id)}
                        >
                          Remover
                        </button>
                        <button
                          type="button"
                          className="btn-deck"
                          onClick={() => handleBlock(f._id)}
                        >
                          Bloquear
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista de bloqueados (opcional) */}
          {blocked.length > 0 && (
            <div className="form-card friends-card">
              <div className="friends-card-header">
                <h3>Bloqueados</h3>
              </div>
              <div className="friend-card-list">
                {blocked.map((b) => (
                  <div key={b._id} className="friend-card">
                    <div className="friend-card-avatar">
                      {b.avatarUrl ? (
                        <img src={b.avatarUrl} alt={displayName(b)} />
                      ) : (
                        <span>
                          {displayName(b).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="friend-card-body">
                      <div className="friend-card-header-line">
                        <strong>{displayName(b)}</strong>
                        <span className="friend-status-pill">
                          Bloqueado
                        </span>
                      </div>
                      {b.nickname && (
                        <div className="friend-card-sub">
                          @{b.nickname}
                        </div>
                      )}
                      {b.email && (
                        <div className="friend-card-sub small">
                          {b.email}
                        </div>
                      )}
                      <div
                        style={{
                          marginTop: "0.25rem",
                          display: "flex",
                          gap: "0.35rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="btn-deck"
                          onClick={() => handleUnblock(b._id)}
                        >
                          Desbloquear
                        </button>
                        <button
                          type="button"
                          className="btn-deck"
                          onClick={() => goToProfile(b._id)}
                        >
                          Ver perfil
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita: busca + resultados */}
        <div className="friends-column">
          <form
            onSubmit={handleSearch}
            className="form-card friends-card"
          >
            <h2>Buscar jogadores</h2>
            <p className="friends-card-sub">
              Procure por apelido, nome ou e-mail.
            </p>

            <label>
              <span>Pesquisar</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: zYumoto ou você@exemplo.com"
              />
            </label>

            <button type="submit" disabled={loadingSearch}>
              {loadingSearch ? "Buscando..." : "Buscar"}
            </button>

            {error && <p className="feedback-text">{error}</p>}
            {info && <p className="feedback-text">{info}</p>}
          </form>

          {results.length > 0 && (
            <div className="form-card friends-card">
              <div className="friends-card-header">
                <h3>Resultados</h3>
              </div>

              <div className="friend-card-list">
                {results.map((u) => {
                  const id = u._id || u.id;
                  const isMe =
                    user && String(user._id) === String(id);

                  return (
                    <div key={id} className="friend-card">
                      <div className="friend-card-avatar">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={displayName(u)} />
                        ) : (
                          <span>
                            {displayName(u)
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="friend-card-body">
                        <div className="friend-card-header-line">
                          <strong>{displayName(u)}</strong>

                          {isMe ? (
                            <span className="friend-status-pill">
                              Você
                            </span>
                          ) : isBlocked(id) ? (
                            <span className="friend-status-pill">
                              Bloqueado
                            </span>
                          ) : isFriend(id) ? (
                            <span className="friend-status-pill">
                              Amigo
                            </span>
                          ) : null}
                        </div>

                        {u.nickname && (
                          <div className="friend-card-sub">
                            @{u.nickname}
                          </div>
                        )}

                        {u.email && (
                          <div className="friend-card-sub small">
                            {u.email}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: "0.25rem",
                            display: "flex",
                            gap: "0.35rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            className="btn-deck"
                            onClick={() => goToProfile(id)}
                          >
                            Ver decks
                          </button>

                          {!isMe && !isFriend(id) && !isBlocked(id) && (
                            <button
                              type="button"
                              className="btn-deck"
                              onClick={() => handleAddFriend(id)}
                            >
                              Adicionar
                            </button>
                          )}

                          {!isMe && !isBlocked(id) && (
                            <button
                              type="button"
                              className="btn-deck"
                              onClick={() => handleBlock(id)}
                            >
                              Bloquear
                            </button>
                          )}

                          {!isMe && isBlocked(id) && (
                            <button
                              type="button"
                              className="btn-deck"
                              onClick={() => handleUnblock(id)}
                            >
                              Desbloquear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Friends;
