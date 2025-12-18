import React, { useMemo, useState } from "react";
import "./LobbyFull.css";
import SettingsModal from "../components/SettingsModal.jsx";

export default function Lobby() {
  const [search, setSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const rooms = [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [rooms, search]);

  function onCreateRoom() {
    console.log("create room");
  }

  function onOpenDecks() {
    console.log("open decks");
  }

  return (
    <div className="lobbyfull">
      <div className="lobbyfull__wrap">
        <div className="lobbyfull__grid">
          {/* MAIN */}
          <main className="lobbyfull__main">
            <div className="lobbyfull__mainInner">
              <div className="lobbyfull__titlePill">Lobby</div>

              <div className="lobbyfull__actions">
                <input
                  className="lobbyfull__search"
                  placeholder="Pesquisar sala"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <button className="lobbyfull__createBtn" onClick={onCreateRoom}>
                  CRIAR SALA
                </button>
              </div>

              <section className="lobbyfull__roomsArea">
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
                      <button key={room.id} className="lobbyfull__roomCard">
                        <div className="lobbyfull__roomTitle">{room.name}</div>
                        <div className="lobbyfull__roomOwner">
                          dono: {room.owner}
                        </div>
                        <div className="lobbyfull__roomCount">
                          {room.players}/{room.max}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </main>

          {/* SIDEBAR */}
          <aside className="lobbyfull__side">
            <div className="lobbyfull__sideInner">
              <div className="lobbyfull__profileRow">
                <div className="lobbyfull__avatar">OT</div>
                <div className="lobbyfull__nickPill">NICKNAME</div>
              </div>

              <button className="lobbyfull__sideBtn" onClick={onOpenDecks}>
                MEUS DECKS
              </button>

              <div className="lobbyfull__friendsBox">
                <div className="lobbyfull__friendsHeader">Amigos</div>
                <div className="lobbyfull__friendsEmpty">
                  Nenhum amigo online
                </div>
              </div>

              <button
                className="lobbyfull__settingsBtn"
                onClick={() => setSettingsOpen(true)}
              >
                CONFIGURAÇÕES
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Modal fora da sidebar (overlay por cima de tudo) */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
