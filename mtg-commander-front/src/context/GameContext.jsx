// src/context/GameContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../socket";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  // deck local (somente cartas que ainda estão no deck)
  const [library, setLibrary] = useState([]);

  // comandante local (para o HUD)
  const [commanderCard, setCommanderCardState] = useState(null);

  // ===== commander: salva local + avisa servidor =====
  function setCommanderCard(card) {
    setCommanderCardState(card); // HUD local

    if (!roomCode || !playerName || !card) return;

    socket.emit("set-commander-card", {
      roomCode,
      playerName,
      card,
    });
  }

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      console.log("Conectado ao servidor Socket.IO");
    }

    function onDisconnect() {
      setConnected(false);
      console.log("Desconectado do servidor Socket.IO");
    }

    function onRoomState(state) {
      if (!state) return;
      setRoomCode(state.roomCode);
      setPlayers(state.players || []);
      setMessages(state.messages || []);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room-state", onRoomState);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room-state", onRoomState);
    };
  }, []);

  function connectSocketIfNeeded() {
    if (!socket.connected) {
      socket.connect();
    }
  }

  // Entrar na sala
  function joinRoom({ name, room }) {
    if (!name || !room) return;
    connectSocketIfNeeded();
    setPlayerName(name);
    setRoomCode(room.toUpperCase());

    socket.emit("join-room", {
      roomCode: room,
      playerName: name,
    });
  }

  // Atualizar vida via backend
  function updatePlayerLife(name, delta) {
    if (!roomCode || !name) return;

    socket.emit("update-life", {
      roomCode,
      playerName: name,
      delta,
    });
  }

  // Enviar mensagem de chat
  function sendMessage(text) {
    if (!roomCode || !playerName || !text.trim()) return;

    socket.emit("chat-message", {
      roomCode,
      from: playerName,
      text: text.trim(),
    });
  }

  // Adicionar carta na mão via backend
  function addCardToHand(card) {
    if (!roomCode || !playerName || !card) return;

    socket.emit("add-card-to-hand", {
      roomCode,
      playerName,
      card,
    });
  }

  // =============== DECK LOCAL (library) ===============

  // Recebe as cartas resolvidas (com quantity) e expande o deck
  function setDeckFromResolved(resolvedCards) {
    if (!resolvedCards || resolvedCards.length === 0) {
      setLibrary([]);
      return;
    }

    const expanded = [];

    resolvedCards.forEach((card) => {
      const qty = Number(card.quantity) || 1;
      for (let i = 0; i < qty; i++) {
        expanded.push({
          ...card,
          instanceId: `${card.name}-${Date.now()}-${Math.random()}-${i}`,
        });
      }
    });

    // embaralha o deck (Fisher–Yates)
    for (let i = expanded.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
    }

    setLibrary(expanded);
  }

  // Comprar N cartas → só emite para o servidor
  function drawCards(count) {
    if (!count || count <= 0) return;

    setLibrary((prev) => {
      if (!prev || prev.length === 0) return prev;

      const n = Math.min(count, prev.length);
      const drawn = prev.slice(0, n);

      drawn.forEach((card) => {
        addCardToHand(card); // servidor cuida da mão
      });

      return prev.slice(n);
    });
  }

  // Embaralhar somente o que restou no deck
  function shuffleLibrary() {
    setLibrary((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  }

  // Tutor: tira 1 carta do deck, manda pra mão e embaralha o resto
  function tutorFromLibrary(instanceId) {
    if (!instanceId) return;

    setLibrary((prev) => {
      const idx = prev.findIndex((c) => c.instanceId === instanceId);
      if (idx === -1) return prev;

      const card = prev[idx];
      const newLib = [...prev.slice(0, idx), ...prev.slice(idx + 1)];

      addCardToHand(card);

      for (let i = newLib.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newLib[i], newLib[j]] = [newLib[j], newLib[i]];
      }

      return newLib;
    });
  }

  function castCommander() {
    if (!roomCode || !playerName) return;

    socket.emit("cast-commander", {
      roomCode,
      playerName,
    });
  }

  const librarySize = library.length;

  const value = {
    playerName,
    setPlayerName,
    roomCode,
    setRoomCode,
    players,
    messages,
    connected,
    joinRoom,
    updatePlayerLife,
    sendMessage,
    addCardToHand,
    library,
    librarySize,
    setDeckFromResolved,
    drawCards,
    shuffleLibrary,
    tutorFromLibrary,
    setCommanderCard,
    castCommander,
    commanderCard,
  };

  return (
    <GameContext.Provider value={value}>{children}</GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used inside GameProvider");
  }
  return ctx;
}
