require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const axios = require("axios");

const authRoutes = require("./routes/auth");
const deckRoutes = require("./routes/decks");
const supabaseDb = require("./store/supabaseDb");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/decks", deckRoutes);

const server = http.createServer(app);

// ======================
// Conexão com MongoDB
// ======================
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mtg_commander";
const PORT = process.env.PORT || 4000;
const hasMongoConnection = () => mongoose.connection.readyState === 1;
const hasSupabaseConnection = () => supabaseDb.isConfigured();

if (hasSupabaseConnection()) {
  console.log("Supabase configurado para persistencia");
}

if (!hasSupabaseConnection() || process.env.MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    })
    .then(() => console.log("MongoDB conectado"))
    .catch((err) => {
      console.warn(
        `MongoDB indisponivel (${err.message}). Continuando com fallback em memoria.`
      );
    });
}

// ======================
// Schemas e Models
// ======================

const CommanderDamageSchema = new mongoose.Schema(
  {
    source: String,
    damage: Number,
  },
  { _id: false }
);

const PlayerSchema = new mongoose.Schema(
  {
    name: String,
    life: Number,
    poison: Number,
    commanderDamage: [CommanderDamageSchema],
    hand: [mongoose.Schema.Types.Mixed],
    commanderCard: mongoose.Schema.Types.Mixed,
    commanderCastCount: { type: Number, default: 0 },
    battlefield: [mongoose.Schema.Types.Mixed],
    lands: [mongoose.Schema.Types.Mixed],
    graveyard: [mongoose.Schema.Types.Mixed],
    exile: [mongoose.Schema.Types.Mixed],
    stack: [mongoose.Schema.Types.Mixed], // <<< NOVO: zona de stack (player)
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    from: String,
    text: String,
    createdAt: Date,
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema({
  code: { type: String, unique: true, index: true },
  players: [PlayerSchema],
  messages: [MessageSchema],
  owner: String, // dono da sala
  startTime: Date,
  stack: [mongoose.Schema.Types.Mixed], // stack global
});

const RoomModel = mongoose.model("Room", RoomSchema);

// ======================
// Socket.IO server
// ======================

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// rooms em memória
const rooms = {};

// Função auxiliar para montar estado simplificado
function getRoomState(code) {
  const room = rooms[code];
  if (!room) return null;

  return {
    roomCode: code,
    players: Object.values(room.players),
    messages: room.messages || [],
    owner: room.owner || null,
    startTime: room.startTime || null,
    stack: room.stack || [],
  };
}

// ======================
// Lobby: salas públicas
// ======================

function generateRoomCode(len = 5) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

function sanitizeRoomCode(codeRaw) {
  const raw = String(codeRaw || "").trim().toUpperCase();
  // só A-Z e 0-9, max 8
  return raw.replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function getPublicRoomsList() {
  return Object.values(rooms)
    .filter((r) => r && r.isPublic)
    .map((r) => ({
      code: r.code,
      name: r.name || `Sala ${r.code}`,
      isPublic: !!r.isPublic,
      playersCount: r.players ? Object.keys(r.players).length : 0,
      owner: r.owner || null,
      updatedAt: r.updatedAt || null,
      createdAt: r.createdAt || null,
    }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function broadcastRooms() {
  io.emit("rooms-list", getPublicRoomsList());
}

// ======================
// Sincronizar sala com o banco configurado
// ======================
async function syncRoomToDb(code) {
  const room = rooms[code];
  if (!room) return;

  const playersArray = Object.values(room.players).map((p) => ({
    name: p.name,
    life: p.life,
    poison: p.poison,
    commanderDamage: Object.entries(p.commanderDamage || {}).map(
      ([source, damage]) => ({ source, damage })
    ),
    hand: p.hand || [],
    commanderCard: p.commanderCard || null,
    commanderCastCount: p.commanderCastCount || 0,
    battlefield: p.battlefield || [],
    lands: p.lands || [],
    graveyard: p.graveyard || [],
    exile: p.exile || [],
    stack: p.stack || [], // <<< salva stack do player no Mongo
  }));

  const messagesArray = (room.messages || []).map((m) => ({
    from: m.from,
    text: m.text,
    createdAt: m.createdAt,
  }));

  if (hasSupabaseConnection()) {
    try {
      await supabaseDb.upsertRoom({
        code,
        name: room.name || `Sala ${code}`,
        isPublic: !!room.isPublic,
        players: playersArray,
        messages: messagesArray,
        owner: room.owner || null,
        startTime: room.startTime || null,
        stack: room.stack || [],
      });
    } catch (err) {
      console.error("Erro ao salvar sala no Supabase:", err);
    }
    return;
  }

  if (!hasMongoConnection()) return;

  try {
    await RoomModel.findOneAndUpdate(
      { code },
      {
        $set: {
          code,
          players: playersArray,
          messages: messagesArray,
          owner: room.owner || null,
          startTime: room.startTime || null,
          stack: room.stack || [], // stack global
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("Erro ao salvar sala no Mongo:", err);
  }
}

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);

  // ======================
  // Lobby: listar salas públicas
  // ======================
  socket.on("list-rooms", () => {
    socket.emit("rooms-list", getPublicRoomsList());
  });

  // ======================
  // Lobby: criar sala (nome, código opcional, pública/privada)
  // ======================
  socket.on("create-room", ({ roomName, roomCode, isPublic }) => {
    const raw = roomCode ? String(roomCode) : generateRoomCode();
    const finalCode = sanitizeRoomCode(raw);

    if (!finalCode) {
      socket.emit("create-room-error", {
        message: "Código inválido (use letras/números).",
      });
      return;
    }

    if (rooms[finalCode]) {
      socket.emit("create-room-error", { message: "Esse código já está em uso." });
      return;
    }

    const now = Date.now();

    rooms[finalCode] = {
      code: finalCode,
      name:
        roomName && String(roomName).trim()
          ? String(roomName).trim()
          : `Sala ${finalCode}`,
      isPublic: !!isPublic,
      players: {},
      messages: [],
      owner: null,
      startTime: null,
      stack: [],
      createdAt: now,
      updatedAt: now,
    };

    socket.emit("create-room-success", { roomCode: finalCode });
    broadcastRooms();
  });

  // ======================
  // Entrar em uma sala
  // ======================
  socket.on("join-room", async ({ roomCode, playerName }) => {
    if (!roomCode || !playerName) return;

    const code = sanitizeRoomCode(roomCode);
    if (!code) return;

    // Garante que a sala exista em memória
    // ⚠️ fallback do join-room cria sala PRIVADA por padrão (não polui lobby)
    if (!rooms[code]) {
      const now = Date.now();
      rooms[code] = {
        code,
        name: `Sala ${code}`,
        isPublic: false, // ✅ importante
        players: {},
        messages: [],
        owner: null,
        startTime: null,
        stack: [],
        createdAt: now,
        updatedAt: now,
      };
      broadcastRooms();
    }

    const room = rooms[code];

    // Entra na sala do Socket.IO
    socket.join(code);

    // Primeiro jogador que entrar vira dono
    if (!room.owner) {
      room.owner = playerName;
      room.startTime = new Date();
    }

    // Verifica se já existe um jogador com esse nome na sala
    let existingEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );

    let player;

    if (existingEntry) {
      // reaproveita dados e troca socket.id
      const [oldKey, oldPlayer] = existingEntry;
      delete room.players[oldKey];

      player = {
        ...oldPlayer,
        id: socket.id,
        stack: oldPlayer.stack || [],
      };
    } else {
      player = {
        id: socket.id,
        name: playerName,
        life: 40,
        poison: 0,
        commanderDamage: {},
        hand: [],
        commanderCard: null,
        commanderCastCount: 0,
        lands: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        stack: [],
      };
    }

    // Salva/atualiza o jogador na sala
    room.players[socket.id] = player;

    room.updatedAt = Date.now();
    broadcastRooms();

    console.log(`🎮 Jogador ${playerName} entrou na sala ${code}`);
    console.log("Estado da sala agora:", getRoomState(code));

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Atualizar vida
  // ======================
  socket.on("update-life", async ({ roomCode, playerName, delta }) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room) return;

    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;
    const numericDelta = Number(delta) || 0;
    const currentLife = player.life ?? 40;
    const newLife = currentLife + numericDelta;

    room.players[socketId] = {
      ...player,
      life: newLife,
    };

    room.updatedAt = Date.now();

    console.log(
      `✅ Vida de ${playerName} na sala ${code}: ${currentLife} -> ${newLife}`
    );

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Adicionar carta na mão
  // ======================
  socket.on("add-card-to-hand", async ({ roomCode, playerName, card }) => {
    console.log("BACKEND RECEBEU add-card-to-hand:", roomCode, playerName, !!card);

    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room || !card) return;

    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;

    const newCard = {
      ...card,
      instanceId: card.instanceId || `${Date.now()}-${Math.random()}`,
    };

    const currentHand = player.hand || [];

    const alreadyInHand = currentHand.some(
      (c) => c.instanceId && c.instanceId === newCard.instanceId
    );
    if (alreadyInHand) {
      console.log(
        "⚠️ Ignorando carta duplicada na mão (mesmo instanceId):",
        newCard.name,
        newCard.instanceId
      );
      return;
    }

    const newHand = [...currentHand, newCard];

    room.players[socketId] = {
      ...player,
      hand: newHand,
    };

    room.updatedAt = Date.now();

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Tap / Untap de carta
  // ======================
  socket.on("toggle-tap", async ({ roomCode, playerName, cardInstanceId, zone }) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room) return;

    if (!cardInstanceId || !zone) return;

    const validZones = ["hand", "battlefield", "lands", "graveyard", "exile"];
    if (!validZones.includes(zone)) {
      console.log("⚠️ Zona inválida para toggle-tap:", zone);
      return;
    }

    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;

    const zoneArr = Array.isArray(player[zone]) ? [...player[zone]] : [];
    const idx = zoneArr.findIndex(
      (c) => c.instanceId && c.instanceId === cardInstanceId
    );
    if (idx === -1) {
      console.log("⚠️ Carta para tap/untap não encontrada:", cardInstanceId);
      return;
    }

    const card = { ...zoneArr[idx] };
    card.tapped = !card.tapped;

    zoneArr[idx] = card;

    room.players[socketId] = {
      ...player,
      [zone]: zoneArr,
    };

    room.updatedAt = Date.now();

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Atualizar contador da carta
  // ======================
  socket.on("update-card-counter", async ({ roomCode, playerName, cardInstanceId, zone, delta }) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room) return;

    if (!cardInstanceId || !zone) return;

    const validZones = ["battlefield"];
    if (!validZones.includes(zone)) return;

    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;

    const zoneArr = Array.isArray(player[zone]) ? [...player[zone]] : [];
    const idx = zoneArr.findIndex(
      (c) => c.instanceId && c.instanceId === cardInstanceId
    );
    if (idx === -1) return;

    const card = { ...zoneArr[idx] };
    const current = Number(card.counters || 0);
    const diff = Number(delta) || 0;
    const nextValue = Math.max(0, current + diff);

    card.counters = nextValue;
    zoneArr[idx] = card;

    room.players[socketId] = {
      ...player,
      [zone]: zoneArr,
    };

    room.updatedAt = Date.now();

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Mover carta entre zonas
  // ======================
  socket.on("move-card", async ({ roomCode, playerName, cardInstanceId, fromZone, toZone }) => {
    console.log("BACKEND move-card:", roomCode, playerName, cardInstanceId, fromZone, "->", toZone);

    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room) return;

    if (!cardInstanceId || !fromZone || !toZone || fromZone === toZone) return;

    const validZones = ["hand", "battlefield", "lands", "graveyard", "exile", "stack"];
    if (!validZones.includes(fromZone) || !validZones.includes(toZone)) {
      console.log("⚠️ Zona inválida:", fromZone, toZone);
      return;
    }

    // Player -> STACK (global)
    if (toZone === "stack" && fromZone !== "stack") {
      const playerEntry = Object.entries(room.players).find(
        ([, p]) => p.name === playerName
      );
      if (!playerEntry) return;

      const [socketId, player] = playerEntry;

      const fromArray = Array.isArray(player[fromZone]) ? [...player[fromZone]] : [];
      const cardIndex = fromArray.findIndex(
        (c) => c.instanceId && c.instanceId === cardInstanceId
      );
      if (cardIndex === -1) {
        console.log("⚠️ Carta não encontrada na zona de origem:", fromZone, cardInstanceId);
        return;
      }

      const [card] = fromArray.splice(cardIndex, 1);

      const stackArr = Array.isArray(room.stack) ? [...room.stack] : [];
      stackArr.push({
        ...card,
        ownerName: playerName,
      });
      room.stack = stackArr;

      room.players[socketId] = {
        ...player,
        [fromZone]: fromArray,
      };

      room.updatedAt = Date.now();

      io.to(code).emit("room-state", getRoomState(code));
      await syncRoomToDb(code);
      return;
    }

    // STACK (global) -> Player
    if (fromZone === "stack" && toZone !== "stack") {
      const stackArr = Array.isArray(room.stack) ? [...room.stack] : [];
      const cardIndex = stackArr.findIndex(
        (c) => c.instanceId && c.instanceId === cardInstanceId
      );
      if (cardIndex === -1) {
        console.log("⚠️ Carta não encontrada na STACK:", cardInstanceId);
        return;
      }

      const [card] = stackArr.splice(cardIndex, 1);
      room.stack = stackArr;

      const playerEntry = Object.entries(room.players).find(
        ([, p]) => p.name === playerName
      );
      if (!playerEntry) return;

      const [socketId, player] = playerEntry;

      const toArray = Array.isArray(player[toZone]) ? [...player[toZone]] : [];
      toArray.push(card);

      room.players[socketId] = {
        ...player,
        [toZone]: toArray,
      };

      room.updatedAt = Date.now();

      io.to(code).emit("room-state", getRoomState(code));
      await syncRoomToDb(code);
      return;
    }

    // Player -> Player (sem stack)
    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;

    const fromArray = Array.isArray(player[fromZone]) ? [...player[fromZone]] : [];
    const toArray = Array.isArray(player[toZone]) ? [...player[toZone]] : [];

    const cardIndex = fromArray.findIndex(
      (c) => c.instanceId && c.instanceId === cardInstanceId
    );

    if (cardIndex === -1) {
      console.log("⚠️ Carta não encontrada na zona de origem:", fromZone, cardInstanceId);
      return;
    }

    const [card] = fromArray.splice(cardIndex, 1);
    toArray.push(card);

    room.players[socketId] = {
      ...player,
      [fromZone]: fromArray,
      [toZone]: toArray,
    };

    room.updatedAt = Date.now();

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  socket.on("clear-hand", async ({ roomCode, playerName }) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room) return;

    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;

    room.players[socketId] = {
      ...player,
      hand: [],
    };

    room.updatedAt = Date.now();

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ===== Definir comandante =====
  socket.on("set-commander-card", async ({ roomCode, playerName, card }) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room || !card) return;

    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;

    room.players[socketId] = {
      ...player,
      commanderCard: card,
    };

    room.updatedAt = Date.now();

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Conjurar comandante
  // ======================
  socket.on("cast-commander", async ({ roomCode, playerName }) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room) return;

    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;

    if (!player.commanderCard) return;

    const castCount = (player.commanderCastCount || 0) + 1;

    const newBattlefield = [
      ...(player.battlefield || []),
      {
        ...player.commanderCard,
        instanceId: `commander-${Date.now()}-${Math.random()}`,
        isCommander: true,
      },
    ];

    room.players[socketId] = {
      ...player,
      commanderCastCount: castCount,
      battlefield: newBattlefield,
    };

    room.updatedAt = Date.now();

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Mensagem de chat
  // ======================
  socket.on("chat-message", async ({ roomCode, from, text }) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms[code];
    if (!room || !text) return;

    const message = {
      from,
      text,
      createdAt: new Date().toISOString(),
    };

    room.messages.push(message);
    room.updatedAt = Date.now();

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Disconnect
  // ======================
  socket.on("disconnect", async () => {
    console.log("🔌 Cliente desconectado:", socket.id);

    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      if (!room.players[socket.id]) continue;

      delete room.players[socket.id];

      if (Object.keys(room.players).length === 0) {
        delete rooms[code];
        if (hasSupabaseConnection()) {
          await supabaseDb.deleteRoom(code);
        } else if (hasMongoConnection()) {
          await RoomModel.deleteOne({ code });
        }
        console.log(`🗑️ Sala ${code} removida (sem jogadores)`);
      } else {
        room.updatedAt = Date.now();
        io.to(code).emit("room-state", getRoomState(code));
        await syncRoomToDb(code);
      }
    }

    broadcastRooms();
  });
});

// ======================
// Rotas HTTP extras
// ======================

// rota de saúde
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// proxy simples pro Scryfall
app.get("/api/cards/named", async (req, res) => {
  const { fuzzy } = req.query;
  if (!fuzzy) {
    return res.status(400).json({ error: 'Parâmetro "fuzzy" é obrigatório' });
  }

  try {
    const response = await axios.get("https://api.scryfall.com/cards/named", {
      params: { fuzzy },
    });
    res.json(response.data);
  } catch (err) {
    console.error("Erro ao consultar Scryfall:", err.message);
    res.status(500).json({ error: "Erro ao consultar Scryfall" });
  }
});

// handler global
app.use((err, req, res, next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

