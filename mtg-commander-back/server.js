require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const axios = require('axios');

const authRoutes = require("./routes/auth");
const deckRoutes = require("./routes/decks");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/decks", deckRoutes);

const server = http.createServer(app);

// ======================
// Conexão com MongoDB
// ======================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mtg_commander';
const PORT = process.env.PORT || 4000;

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch((err) => console.error('❌ Erro ao conectar no MongoDB:', err));

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
  owner: String,      // dono da sala
  startTime: Date,    // quando a partida começou
});

const RoomModel = mongoose.model('Room', RoomSchema);

// ======================
// Socket.IO server
// ======================

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
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
  };
}

// Sincronizar sala com Mongo
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
  }));

  const messagesArray = (room.messages || []).map((m) => ({
    from: m.from,
    text: m.text,
    createdAt: m.createdAt,
  }));

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
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Erro ao salvar sala no Mongo:', err);
  }
}

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // ======================
  // Entrar em uma sala
  // ======================
 
  socket.on('join-room', async ({ roomCode, playerName }) => {
    if (!roomCode || !playerName) return;

    const code = roomCode.toUpperCase();

    // Garante que a sala exista em memória
    if (!rooms[code]) {
      rooms[code] = {
        code,
        players: {},
        messages: [],
        owner: null,
        startTime: null,
      };
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
      // Se já existia, reaproveita os dados e só troca o socket.id
      const [oldKey, oldPlayer] = existingEntry;

      // Remove o registro antigo (outro socket/id antigo)
      delete room.players[oldKey];

      player = {
        ...oldPlayer,
        id: socket.id,
      };
    } else {
      // Se não existia, cria um jogador novo do zero
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
      };
    }

    // Salva/atualiza o jogador na sala (chave = socket.id atual)
    room.players[socket.id] = player;

    console.log(`🎮 Jogador ${playerName} entrou na sala ${code}`);
    console.log("Estado da sala agora:", getRoomState(code));

    // Envia o estado atualizado para todo mundo na sala
    io.to(code).emit('room-state', getRoomState(code));

    // Persiste no Mongo (se quiser manter histórico)
    await syncRoomToDb(code);
  });


  // ======================
  // Atualizar vida
  // ======================
  socket.on('update-life', async ({ roomCode, playerName, delta }) => {
    const code = roomCode?.toUpperCase();
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

    console.log(`✅ Vida de ${playerName} na sala ${code}: ${currentLife} -> ${newLife}`);

    io.to(code).emit('room-state', getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Adicionar carta na mão
  // ======================
  socket.on('add-card-to-hand', async ({ roomCode, playerName, card }) => {
    console.log("BACKEND RECEBEU add-card-to-hand:", roomCode, playerName, !!card);

    const code = roomCode?.toUpperCase();
    const room = rooms[code];
    if (!room || !card) return;

    const playerEntry = Object.entries(room.players).find(
      ([, p]) => p.name === playerName
    );
    if (!playerEntry) return;

    const [socketId, player] = playerEntry;

    const newCard = {
      ...card,
      instanceId: card.instanceId || `${Date.now()}-${Math.random()}`, // mantém ou cria id único
    };

    const currentHand = player.hand || [];

    // se já existe carta com mesmo instanceId, não adiciona de novo
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

    io.to(code).emit('room-state', getRoomState(code));
    await syncRoomToDb(code);
  });
  // ======================
  // Tap / Untap de carta
  // ======================
  socket.on("toggle-tap", async ({ roomCode, playerName, cardInstanceId, zone }) => {
    const code = roomCode?.toUpperCase();
    const room = rooms[code];
    if (!room) return;

    if (!cardInstanceId || !zone) return;

  const validZones = ['hand', 'battlefield', 'lands', 'graveyard', 'exile'];
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
    card.tapped = !card.tapped; // alterna true/false

    zoneArr[idx] = card;

    room.players[socketId] = {
      ...player,
      [zone]: zoneArr,
    };

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Atualizar contador da carta (ex: +1/+1, marcadores, etc.)
  // ======================
  socket.on("update-card-counter", async ({ roomCode, playerName, cardInstanceId, zone, delta }) => {
    const code = roomCode?.toUpperCase();
    const room = rooms[code];
    if (!room) return;

    if (!cardInstanceId || !zone) return;

    // por enquanto vamos permitir só battlefield; se quiser, dá pra expandir
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
    const nextValue = Math.max(0, current + diff); // não deixa negativo

    card.counters = nextValue;
    zoneArr[idx] = card;

    room.players[socketId] = {
      ...player,
      [zone]: zoneArr,
    };

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });


  // ======================
  // Mover carta entre zonas
  // ======================
  socket.on('move-card', async ({ roomCode, playerName, cardInstanceId, fromZone, toZone }) => {
    console.log('BACKEND move-card:', roomCode, playerName, cardInstanceId, fromZone, '->', toZone);

    const code = roomCode?.toUpperCase();
    const room = rooms[code];
    if (!room) return;

    if (!cardInstanceId || !fromZone || !toZone || fromZone === toZone) return;

    const validZones = ['hand', 'battlefield', 'lands','graveyard', 'exile'];
    if (!validZones.includes(fromZone) || !validZones.includes(toZone)) {
      console.log('⚠️ Zona inválida:', fromZone, toZone);
      return;
    }

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
      console.log('⚠️ Carta não encontrada na zona de origem:', fromZone, cardInstanceId);
      return;
    }

    const [card] = fromArray.splice(cardIndex, 1);
    toArray.push(card);

    room.players[socketId] = {
      ...player,
      [fromZone]: fromArray,
      [toZone]: toArray,
    };

    io.to(code).emit('room-state', getRoomState(code));
    await syncRoomToDb(code);
  });


    socket.on("clear-hand", async ({ roomCode, playerName }) => {
    const code = roomCode?.toUpperCase();
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

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });



  // ===== Definir comandante (APENAS UM LISTENER) =====
  socket.on("set-commander-card", async ({ roomCode, playerName, card }) => {
    const code = roomCode?.toUpperCase();
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

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Conjurar comandante
  // ======================
  socket.on("cast-commander", async ({ roomCode, playerName }) => {
    const code = roomCode?.toUpperCase();
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

    io.to(code).emit("room-state", getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Mensagem de chat
  // ======================
  socket.on('chat-message', async ({ roomCode, from, text }) => {
    const code = roomCode?.toUpperCase();
    const room = rooms[code];
    if (!room || !text) return;

    const message = {
      from,
      text,
      createdAt: new Date().toISOString(),
    };

    room.messages.push(message);

    io.to(code).emit('room-state', getRoomState(code));
    await syncRoomToDb(code);
  });

  // ======================
  // Disconnect
  // ======================
  socket.on('disconnect', async () => {
    console.log('🔌 Cliente desconectado:', socket.id);

    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      if (!room.players[socket.id]) continue;

      delete room.players[socket.id];

      if (Object.keys(room.players).length === 0) {
        // sala vazia -> remove de memória e do banco
        delete rooms[code];
        await RoomModel.deleteOne({ code });
        console.log(`🗑️ Sala ${code} removida (sem jogadores)`);
      } else {
        io.to(code).emit('room-state', getRoomState(code));
        await syncRoomToDb(code);
      }
    }
  });
});

// ======================
// Rotas HTTP extras
// ======================

// rota de saúde
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// proxy simples pro Scryfall
app.get('/api/cards/named', async (req, res) => {
  const { fuzzy } = req.query;
  if (!fuzzy) {
    return res.status(400).json({ error: 'Parâmetro "fuzzy" é obrigatório' });
  }

  try {
    const response = await axios.get('https://api.scryfall.com/cards/named', {
      params: { fuzzy },
    });
    res.json(response.data);
  } catch (err) {
    console.error('Erro ao consultar Scryfall:', err.message);
    res.status(500).json({ error: 'Erro ao consultar Scryfall' });
  }
});

// handler global
app.use((err, req, res, next) => {
  console.error('Erro interno:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
