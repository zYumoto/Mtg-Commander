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
              <div className="lobbyfull__topbar">
                <div className="lobbyfull__titleBlock">
                  <div className="lobbyfull__titlePill">Lobby</div>
                  <p className="lobbyfull__subtitle">
                    Mesas publicas abertas para Commander.
                  </p>
                </div>

                <div className="lobbyfull__arcaneBadge" aria-hidden="true">
                  ✦
                </div>
              </div>

              <div className="lobbyfull__metaRow">
                <span>{publicRooms.length} sala(s)</span>
                <span>{totalPlayers} jogador(es)</span>
                <span>grimorio online</span>
              </div>

              <div className="lobbyfull__actions">
                <input
                  className="lobbyfull__search"
                  placeholder="Pesquisar mesa, codigo ou dono"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <button
                  className="lobbyfull__createBtn"
                  onClick={onCreateRoom}
                >
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
                      <div className="lobbyfull__emptyTitle">
                        Nenhuma sala disponível
                      </div>
                      <div className="lobbyfull__emptyText">
                        Crie uma sala ou aguarde alguém abrir uma.
                      </div>
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
                        <div className="lobbyfull__roomTitle">
                          {room.name || `Sala ${room.code}`}
                        </div>
                        <div className="lobbyfull__roomOwner">
                          dono: {room.owner || "aguardando"}
                        </div>
                        <div className="lobbyfull__roomCount">
                          {room.playersCount ?? 0} jogador(es)
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
