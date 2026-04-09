import React from "react";
import "./RightSidebar.css";

export default function RightSidebar({
  active = "lobby",
  nickname = "Jogador",
  avatarText = "J",
  avatarUrl = "",
  friends = [],
  onOpenDecks,
  onOpenFriends,
  onOpenProfile,
  onLogout,
}) {
  const visibleFriends = friends.slice(0, 8);

  return (
    <aside className="rsb">
      <div className="rsb__inner">
        <button
          type="button"
          className="rsb__profileRow"
          onClick={onOpenProfile}
          title="Abrir perfil"
        >
          <div className="rsb__avatar">
            {avatarUrl ? <img src={avatarUrl} alt={nickname} /> : avatarText}
          </div>
          <div className="rsb__nickPill">{nickname}</div>
        </button>

        <button
          type="button"
          className={`rsb__btn ${active === "decks" ? "isActive" : ""}`}
          onClick={onOpenDecks}
        >
          MEUS DECKS
        </button>

        <button
          type="button"
          className={`rsb__btn ${active === "friends" ? "isActive" : ""}`}
          onClick={onOpenFriends}
        >
          AMIGOS
        </button>

        <div className="rsb__friendsBox">
          <div className="rsb__friendsHeader">Amigos</div>

          {visibleFriends.length === 0 ? (
            <div className="rsb__friendsEmpty">Nenhum amigo adicionado</div>
          ) : (
            <div className="rsb__friendsList">
              {visibleFriends.map((friend) => (
                <button
                  type="button"
                  key={friend._id || friend.id || friend.email}
                  className="rsb__friendRow"
                  onClick={onOpenFriends}
                >
                  <span className="rsb__dot" />
                  <span>
                    {friend.nickname || friend.fullName || friend.email || "Jogador"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="rsb__logout"
          onClick={onLogout}
        >
          CONFIGURAÇÕES
        </button>
      </div>
    </aside>
  );
}
