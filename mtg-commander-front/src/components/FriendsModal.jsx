import React, { useEffect, useState } from "react";
import { API_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import "./FriendsModal.css";

export default function FriendsModal({ open, onClose, onChanged }) {
  const { token, user } = useAuth();
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    loadFriends();

    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  function displayName(person) {
    return person?.nickname || person?.fullName || person?.email || "Jogador";
  }

  async function api(path, options = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao atualizar amigos");
    return data;
  }

  async function loadFriends() {
    if (!token) return;
    setLoading(true);
    setMessage("");
    try {
      const data = await api("/auth/friends", { method: "GET" });
      setFriends(data.friends || []);
      setBlocked(data.blocked || []);
      onChanged?.(data.friends || []);
    } catch (err) {
      setMessage(err.message || "Erro ao carregar amigos");
    } finally {
      setLoading(false);
    }
  }

  async function searchUsers(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setMessage("");
    setResults([]);
    try {
      const data = await api(`/auth/users/search?q=${encodeURIComponent(q)}`, {
        method: "GET",
      });
      setResults(data.users || []);
    } catch (err) {
      setMessage(err.message || "Erro ao buscar jogadores");
    } finally {
      setLoading(false);
    }
  }

  async function updateFriend(action, userId, successMessage) {
    setLoading(true);
    setMessage("");
    try {
      await api(`/auth/${action}`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      await loadFriends();
      setMessage(successMessage);
    } catch (err) {
      setMessage(err.message || "Erro ao atualizar amigos");
    } finally {
      setLoading(false);
    }
  }

  function isFriend(id) {
    return friends.some((friend) => String(friend._id) === String(id));
  }

  function isBlocked(id) {
    return blocked.some((person) => String(person._id) === String(id));
  }

  if (!open) return null;

  return (
    <div className="friendsModal" role="dialog" aria-modal="true">
      <button className="friendsModal__backdrop" onClick={onClose} aria-label="Fechar" />

      <div className="friendsModal__window">
        <div className="friendsModal__header">
          <div>
            <h2>Amigos</h2>
            <p>Busque jogadores e gerencie sua lista.</p>
          </div>
          <button type="button" className="friendsModal__close" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="friendsModal__grid">
          <section className="friendsModal__panel">
            <div className="friendsModal__panelTitle">
              Meus amigos {loading && <span>Carregando...</span>}
            </div>

            {friends.length === 0 ? (
              <p className="friendsModal__empty">Nenhum amigo adicionado.</p>
            ) : (
              <div className="friendsModal__list">
                {friends.map((friend) => (
                  <div className="friendsModal__person" key={friend._id}>
                    <div className="friendsModal__avatar">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt={displayName(friend)} />
                      ) : (
                        displayName(friend).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="friendsModal__personText">
                      <strong>{displayName(friend)}</strong>
                      {friend.email && <span>{friend.email}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateFriend("friends/remove", friend._id, "Amizade removida.")
                      }
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="friendsModal__panel">
            <form className="friendsModal__search" onSubmit={searchUsers}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por apelido, nome ou email"
              />
              <button type="submit" disabled={loading}>
                Buscar
              </button>
            </form>

            {message && <p className="friendsModal__message">{message}</p>}

            <div className="friendsModal__list">
              {results.map((person) => {
                const id = person._id || person.id;
                const isMe = String(user?._id) === String(id);

                return (
                  <div className="friendsModal__person" key={id}>
                    <div className="friendsModal__avatar">
                      {person.avatarUrl ? (
                        <img src={person.avatarUrl} alt={displayName(person)} />
                      ) : (
                        displayName(person).charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="friendsModal__personText">
                      <strong>{displayName(person)}</strong>
                      {person.email && <span>{person.email}</span>}
                    </div>

                    {!isMe && !isFriend(id) && !isBlocked(id) && (
                      <button
                        type="button"
                        onClick={() =>
                          updateFriend("friends/add", id, "Amigo adicionado.")
                        }
                      >
                        Adicionar
                      </button>
                    )}

                    {!isMe && isFriend(id) && <span className="friendsModal__tag">Amigo</span>}
                    {!isMe && isBlocked(id) && <span className="friendsModal__tag">Bloqueado</span>}
                    {isMe && <span className="friendsModal__tag">Voce</span>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
