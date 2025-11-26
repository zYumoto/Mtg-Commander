// src/components/LifeCounter.jsx
import React from "react";
import { useGame } from "../contexts/GameContext";

export function LifeCounter() {
  const { players, playerName, updatePlayerLife } = useGame();

  // Pega o jogador que é "você" pelo nome
  const me = players.find((p) => p.name === playerName);

  if (!me) {
    return <p>Waiting to join the room...</p>;
  }

  return (
    <div style={{ border: "1px solid #ccc", padding: 16, borderRadius: 8 }}>
      <h3>{me.name}</h3>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => updatePlayerLife(me.name, -1)}>-</button>
        <span style={{ fontSize: 24, fontWeight: "bold" }}>{me.life}</span>
        <button onClick={() => updatePlayerLife(me.name, +1)}>+</button>
      </div>
    </div>
  );
}
