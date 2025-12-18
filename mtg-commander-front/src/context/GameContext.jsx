import React, { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../socket";
import { useAuth } from "./AuthContext.jsx";

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const { user } = useAuth();

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  // STACK GLOBAL (vem da sala)
  const [stack, setStack] = useState([]);

  // deck local (somente cartas que ainda estão no deck)
  const [library, setLibrary] = useState([]);

  // comandante local (para HUD e DeckPanel)
  const [commanderCard, setCommanderCardState] = useState(null);

  // ===== LOBBY: salas públicas =====
  const [publicRooms, setPublicRooms] = useState([]);

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

  // 🔹 Pega nome do usuário logado
  useEffect(() => {
    if (user?.nickname) {
      setPlayerName(user.nickname);
    } else if (user?.email) {
      setPlayerName(user.email.split("@")[0]);
    }
  }, [user]);

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
      setStack(state.stack || []);

      console.log("🧱 room-state recebido, stack =", state.stack);
    }

    function onRoomsList(list) {
      setPublicRooms(Array.isArray(list) ? list : []);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room-state", onRoomState);

    // lobby
    socket.on("rooms-list", onRoomsList);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room-state", onRoomState);

      socket.off("rooms-list", onRoomsList);
    };
  }, []);

  function connectSocketIfNeeded() {
    if (!socket.connected) {
      socket.connect();
    }
  }

  // ======================
  // LOBBY: listar / criar sala
  // ======================
  function fetchRooms() {
    connectSocketIfNeeded();
    socket.emit("list-rooms");
  }

  function createRoom({ roomName, roomCode, isPublic }) {
    connectSocketIfNeeded();
    socket.emit("create-room", {
      roomName,
      roomCode,
      isPublic,
    });
  }

  // ======================
  // Entrar na sala
  // ======================
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

  // ======================
  // Gameplay
  // ======================
  function updatePlayerLife(name, delta) {
    if (!roomCode || !name) return;

    socket.emit("update-life", {
      roomCode,
      playerName: name,
      delta,
    });
  }

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

  function addCardToHand(card) {
    if (!roomCode || !playerName || !card) return;

    socket.emit("add-card-to-hand", {
      roomCode,
      playerName,
      card,
    });
  }

  function moveCard({ cardInstanceId, fromZone, toZone }) {
    if (!roomCode || !playerName || !cardInstanceId || !fromZone || !toZone) return;
    if (fromZone === toZone) return;

    socket.emit("move-card", {
      roomCode,
      playerName,
      cardInstanceId,
      fromZone,
      toZone,
    });
  }

  function toggleTap(cardInstanceId, zone) {
    if (!roomCode || !playerName || !cardInstanceId || !zone) return;

    socket.emit("toggle-tap", {
      roomCode,
      playerName,
      cardInstanceId,
      zone,
    });
  }

  function updateCardCounter(cardInstanceId, zone, delta) {
    if (!roomCode || !playerName || !cardInstanceId || !zone) return;

    socket.emit("update-card-counter", {
      roomCode,
      playerName,
      cardInstanceId,
      zone,
      delta,
    });
  }

  // =======================
  //  LÓGICA DO DECK LOCAL
  // =======================
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

    for (let i = expanded.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
    }

    setLibrary(expanded);
  }

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
  function getMe() {
    return players.find((p) => p.name === playerName);
  }

  function clearHandOnServer() {
    if (!roomCode || !playerName) return;

    socket.emit("clear-hand", {
      roomCode,
      playerName,
    });
  }

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

    // lobby
    publicRooms,
    fetchRooms,
    createRoom,

    // sala/gameplay
    joinRoom,
    updatePlayerLife,
    sendMessage,
    addCardToHand,

    // deck
    library,
    librarySize,
    setDeckFromResolved,
    drawCards,
    shuffleLibrary,
    tutorFromLibrary,

    // commander
    setCommanderCard,
    castCommander,
    commanderCard,

    // mulligan
    returnHandToLibrary,
    mulligan,

    // board actions
    moveCard,
    toggleTap,
    updateCardCounter,

    // global stack
    stack,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used inside GameProvider");
  }
  return ctx;
}
