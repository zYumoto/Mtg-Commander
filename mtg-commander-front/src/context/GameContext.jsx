import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { socket } from "../socket";

const GameContext = createContext(null);

function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function GameProvider({ children }) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);

  // 🔹 deck LOCAL do jogador (biblioteca embaralhada)
  const [localLibrary, setLocalLibrary] = useState([]);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      console.log("✅ Conectado ao servidor Socket.IO");
    }

    function onDisconnect() {
      setConnected(false);
      console.log("❌ Desconectado do servidor Socket.IO");
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

  // ======================
  // ENTRAR NA SALA
  // ======================
  function joinRoom({ name, room }) {
    if (!name || !room) return;
    connectSocketIfNeeded();

    setPlayerName(name);
    setRoomCode(room.toUpperCase());
    setLocalLibrary([]); // limpa deck local ao entrar em nova sala

    socket.emit("join-room", {
      roomCode: room,
      playerName: name,
    });
  }

  // ======================
  // VIDA
  // ======================
  function updatePlayerLife(target, delta) {
    if (!roomCode || !target) return;

    console.log("🎯 updatePlayerLife (front):", {
      roomCode,
      target,
      delta,
    });

    socket.emit("update-life", {
      roomCode,
      playerName: target,
      delta,
    });
  }

  // ======================
  // CHAT
  // ======================
  function sendMessage(text) {
    if (!roomCode || !playerName || !text.trim()) return;

    socket.emit("chat-message", {
      roomCode,
      from: playerName,
      text: text.trim(),
    });
  }

  // ======================
  // ADICIONAR CARTA NA MÃO (backend faz push na mão)
  // ======================
  function addCardToHand(card) {
    if (!roomCode || !playerName || !card) return;

    console.log("🃏 add-card-to-hand (front):", {
      roomCode,
      playerName,
      cardName: card.name,
    });

    socket.emit("add-card-to-hand", {
      roomCode,
      playerName,
      card,
    });
  }

  // ======================
  // DECK LOCAL (usar deck salvo + shuffle + draw)
  // ======================

  /**
   * Recebe as cartas "resolvidas" da rota /decks/:id/resolved
   * (cada item tem { name, quantity, mana_cost, type_line, oracle_text, image_uris, set_name, set })
   * Expande pela quantity, embaralha e guarda localmente.
   */
  function setDeckFromResolved(resolvedCards) {
    if (!Array.isArray(resolvedCards) || resolvedCards.length === 0) return;

    const expanded = [];

    resolvedCards.forEach((card) => {
      const qty = card.quantity || 1;
      for (let i = 0; i < qty; i++) {
        expanded.push({
          name: card.name,
          mana_cost: card.mana_cost,
          type_line: card.type_line,
          oracle_text: card.oracle_text,
          image_uris: card.image_uris || null,
          set_name: card.set_name,
          set: card.set,
        });
      }
    });

    const shuffled = shuffleArray(expanded);
    setLocalLibrary(shuffled);

    console.log("🔀 Deck carregado e embaralhado:", {
      total: shuffled.length,
    });
  }

  /**
   * Comprar N cartas do topo do deck local
   * e enviá-las para a mão via socket (add-card-to-hand).
   */
  function drawCards(amount = 1) {
    if (!roomCode || !playerName) return;
    if (localLibrary.length === 0) {
      console.warn("📭 Sem cartas no deck para comprar.");
      return;
    }

    const n = Math.max(1, Number(amount) || 1);
    const available = localLibrary.length;
    const toDraw = Math.min(n, available);

    const drawn = localLibrary.slice(0, toDraw);
    const remaining = localLibrary.slice(toDraw);

    setLocalLibrary(remaining);

    drawn.forEach((card) => addCardToHand(card));

    console.log("📥 Draw:", {
      requested: n,
      drawn: toDraw,
      remaining: remaining.length,
    });
  }

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

    // Deck local (apenas do jogador atual)
    setDeckFromResolved,
    drawCards,
    librarySize: localLibrary.length,
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
