import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LobbyFull.css";
import RightSidebar from "../components/RightSidebar.jsx";
import FriendsModal from "../components/FriendsModal.jsx";
import { API_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useGame } from "../context/GameContext.jsx";
import { socket } from "../socket.js";

export default function Lobby() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { publicRooms, fetchRooms, createRoom, joinRoom } = useGame();
  const [search, setSearch] = useState("");
  const [friends, setFriends] = useState([]);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  const displayName =
    user?.nickname ||
    user?.fullName ||
    (user?.email ? user.email.split("@")[0] : "Jogador");
  const avatarText = (displayName || "J").slice(0, 2).toUpperCase();
  const totalPlayers = publicRooms.reduce(
    (sum, room) => sum + Number(room.playersCount || 0),
    0
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return publicRooms;
    return publicRooms.filter((room) =>
      `${room.name || ""} ${room.code || ""} ${room.owner || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [publicRooms, search]);

  useEffect(() => {
    fetchRooms();

    const interval = window.setInterval(fetchRooms, 5000);
    return () => window.clearInterval(interval);
  }, [fetchRooms]);

  useEffect(() => {
    if (!token) return;

    let ignore = false;

    async function loadFriends() {
      try {
        const res = await fetch(`${API_URL}/auth/friends`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao carregar amigos");
        if (!ignore) setFriends(data.friends || []);
      } catch (err) {
        console.error("Erro ao carregar amigos no lobby:", err);
      }
    }

    loadFriends();

    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    function onCreateRoomSuccess({ roomCode }) {
      if (!roomCode) return;
      joinRoom({ name: displayName, room: roomCode });
      navigate(`/room/${roomCode}`);
    }

    function onCreateRoomError(payload) {
      setFeedback(payload?.message || "Erro ao criar sala.");
    }

    socket.on("create-room-success", onCreateRoomSuccess);
    socket.on("create-room-error", onCreateRoomError);

    return () => {
      socket.off("create-room-success", onCreateRoomSuccess);
      socket.off("create-room-error", onCreateRoomError);
    };
  }, [displayName, joinRoom, navigate]);

  function onCreateRoom() {
    const roomName = window.prompt("Nome da sala", `Sala de ${displayName}`);
    if (roomName === null) return;

    setFeedback("");
    createRoom({
      roomName: roomName.trim() || `Sala de ${displayName}`,
      isPublic: true,
    });
  }

  function onJoinRoom(room) {
    const code = room?.code || room?.roomCode;
    if (!code) return;

    joinRoom({ name: displayName, room: code });
    navigate(`/room/${code}`);
  }

  function onLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="lobbyfull">
      <div className="lobbyfull__wrap">
        <div className="lobbyfull__grid">
          {/* MAIN */}
          <main className="lobbyfull__main">
            <div className="lobbyfull__mainInner">
              <div className="lobbyfull__hero">
                <div className="lobbyfull__eyebrow">Commander Hub</div>
                <h1>Lobby</h1>
                <p>
                  Encontre mesas publicas, acompanhe jogadores online e abra
                  uma nova partida em segundos.
                </p>
                <div className="lobbyfull__metaRow" aria-label="Resumo do lobby">
                  <span>
                    <strong>{publicRooms.length}</strong>
                    sala(s)
                  </span>
                  <span>
                    <strong>{totalPlayers}</strong>
                    jogador(es)
                  </span>
                  <span>
                    <strong>{friends.length}</strong>
                    amigo(s)
                  </span>
                </div>
              </div>

              <div className="lobbyfull__actions" aria-label="Buscar e criar sala">
                <div className="lobbyfull__searchWrap">
                  <span aria-hidden="true">BUSCAR</span>
                  <input
                    className="lobbyfull__search"
                    placeholder="Pesquisar mesa, codigo ou dono"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <button className="lobbyfull__createBtn" onClick={onCreateRoom}>
                  CRIAR SALA
                </button>
              </div>

              <section className="lobbyfull__roomsArea">
                {feedback && (
                  <div className="lobbyfull__feedback">{feedback}</div>
                )}

                {filtered.length === 0 ? (
                  <div className="lobbyfull__empty">
                    <div className="lobbyfull__emptyCard">
                      <div className="lobbyfull__emptyIcon" aria-hidden="true">
                        MTG
                      </div>
                      <div className="lobbyfull__emptyTitle">
                        Nenhuma sala disponivel
                      </div>
                      <div className="lobbyfull__emptyText">
                        Crie uma sala ou aguarde alguem abrir uma.
                      </div>
                      <button
                        type="button"
                        className="lobbyfull__emptyAction"
                        onClick={onCreateRoom}
                      >
                        Abrir mesa publica
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="lobbyfull__roomsGrid">
                    {filtered.map((room) => (
                      <button
                        type="button"
                        key={room.code || room.id}
                        className="lobbyfull__roomCard"
                        onClick={() => onJoinRoom(room)}
                      >
                        <div className="lobbyfull__roomCode">
                          {room.code || room.roomCode || "PUBLICA"}
                        </div>
                        <div className="lobbyfull__roomTitle">
                          {room.name || `Sala ${room.code}`}
                        </div>
                        <div className="lobbyfull__roomFooter">
                          <span>dono: {room.owner || "aguardando"}</span>
                          <strong>{room.playersCount ?? 0} jogador(es)</strong>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>

          {/* SIDEBAR */}
          <RightSidebar
            active="lobby"
            nickname={displayName}
            avatarText={avatarText}
            avatarUrl={user?.avatarUrl || ""}
            friends={friends}
            onOpenDecks={() => navigate("/decks")}
            onOpenFriends={() => setFriendsOpen(true)}
            onOpenProfile={() => navigate("/profile")}
            onLogout={onLogout}
          />
        </div>
      </div>

      <FriendsModal
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onChanged={setFriends}
      />
    </div>
  );
}
