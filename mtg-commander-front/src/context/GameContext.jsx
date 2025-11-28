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

  // comandante local (para HUD e DeckPanel)
  const [commanderCard, setCommanderCardState] = useState(null);

  // ===== Commander: salva local + avisa servidor =====
  function setCommanderCard(card) {
    setCommanderCardState(card);

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
    if (!roomCode || !playerName) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    socket.emit("chat-message", {
      roomCode,
      from: playerName,
      text: trimmed,
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

    // Mover carta entre zonas (hand, permanents1, permanents2, lands, graveyard)
  function moveCard({ cardInstanceId, fromZone, toZone }) {
    if (!roomCode || !playerName || !cardInstanceId || !fromZone || !toZone) return;
    if (fromZone === toZone) return;

    socket.emit('move-card', {
      roomCode,
      playerName,
      cardInstanceId,
      fromZone,
      toZone,
    });
  }

    // Tap / Untap de uma carta em uma zona (ex: battlefield)
  function toggleTap(cardInstanceId, zone) {
    if (!roomCode || !playerName || !cardInstanceId || !zone) return;

    socket.emit("toggle-tap", {
      roomCode,
      playerName,
      cardInstanceId,
      zone,
    });
  }



  // =======================
  //  LÓGICA DO DECK LOCAL
  // =======================

  // recebe as cartas resolvidas (com quantity) e monta o deck
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

    // embaralha (Fisher–Yates)
    for (let i = expanded.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
    }

    setLibrary(expanded);
  }

  // Comprar N cartas do topo do deck → vão pra mão (via socket)
  function drawCards(count) {
    if (!count || count <= 0) return;

    const currentLibrary = library || [];
    if (currentLibrary.length === 0) return;

    const n = Math.min(count, currentLibrary.length);

    const drawnCards = currentLibrary.slice(0, n);
    const remaining = currentLibrary.slice(n);

    setLibrary(remaining);

    drawnCards.forEach((card) => {
      addCardToHand(card);
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

  // Tutor: escolhe 1 carta do deck, manda para a mão e embaralha o resto
  function tutorFromLibrary(instanceId) {
    if (!instanceId) return;

    const currentLibrary = library || [];
    const idx = currentLibrary.findIndex((c) => c.instanceId === instanceId);
    if (idx === -1) return;

    const selectedCard = currentLibrary[idx];

    const newLib = [
      ...currentLibrary.slice(0, idx),
      ...currentLibrary.slice(idx + 1),
    ];

    for (let i = newLib.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newLib[i], newLib[j]] = [newLib[j], newLib[i]];
    }

    setLibrary(newLib);

    addCardToHand(selectedCard);
  }

  function castCommander() {
    if (!roomCode || !playerName) return;

    socket.emit("cast-commander", {
      roomCode,
      playerName,
    });
  }

  // =======================
  //  NOVAS FUNÇÕES: MULLIGAN
  // =======================

  // helper pra achar "eu" nos players
  function getMe() {
    return players.find((p) => p.name === playerName);
  }

  // pedir pro servidor esvaziar minha mão
  function clearHandOnServer() {
    if (!roomCode || !playerName) return;

    socket.emit("clear-hand", {
      roomCode,
      playerName,
    });
  }

  // devolver a mão pro deck e só isso
  function returnHandToLibrary() {
    const me = getMe();
    if (!me || !me.hand || me.hand.length === 0) return;

    const handCards = me.hand;

    setLibrary((prev) => {
      const merged = [...prev, ...handCards];
      const arr = [...merged];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });

    clearHandOnServer();
  }

  // mulligan: devolve mão, embaralha tudo, limpa no server e compra 7 de novo
  function mulligan() {
    const me = getMe();
    if (!me || !me.hand || me.hand.length === 0) return;

    const handCards = me.hand;

    setLibrary((prev) => {
      const merged = [...prev, ...handCards];
      const arr = [...merged];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });

    clearHandOnServer();

    // compra 7 novas
    drawCards(7);
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
    returnHandToLibrary,
    mulligan,
    moveCard,
    toggleTap,

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
