import React from "react";
import "./RightSidebar.css";

export default function RightSidebar({
  active = "lobby",
  nickname = "NICKNAME",
  avatarText = "OT",
  friends = [],
  onOpenDecks,
  onOpenSettings,
}) {
  const onlineFriends = friends.filter((f) => f?.online);

  return (
    <aside className="rsb">
      <div className="rsb__inner">
        <div className="rsb__profileRow">
          <div className="rsb__avatar">{avatarText}</div>
          <div className="rsb__nickPill">{nickname}</div>
        </div>

        <button
          className={`rsb__btn ${active === "decks" ? "isActive" : ""}`}
          onClick={onOpenDecks}
        >
          MEUS DECKS
        </button>

        <div className="rsb__friendsBox">
          <div className="rsb__friendsHeader">Amigos</div>

          {onlineFriends.length === 0 ? (
            <div className="rsb__friendsEmpty">Nenhum amigo online</div>
          ) : (
            <div className="rsb__friendsList">
              {onlineFriends.map((f) => (
                <div key={f.id} className="rsb__friendRow">
                  <span className="rsb__dot" />
                  <span>{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className="rsb__btn rsb__settings"
          onClick={onOpenSettings}
        >
          CONFIGURAÇÕES
        </button>
      </div>
    </aside>
  );
}
