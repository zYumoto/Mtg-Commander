require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

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
    source: String, // nome do comandante adversário
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
});

const RoomModel = mongoose.model('Room', RoomSchema);

// ======================
// Socket.IO server
// ======================

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Estrutura em memória (rápida para o jogo em tempo real)
const rooms = {};

// Converte room (da memória) para formato do Mongo
function roomToDoc(code) {
  const room = rooms[code];
  if (!room) return null;

  const playersArray = Object.values(room.players).map((p) => ({
    name: p.name,
    life: p.life,
    poison: p.poison,
    commanderDamage: Object.entries(p.commanderDamage || {}).map(
      ([source, damage]) => ({ source, damage })
    ),
  }));

  const messagesArray = room.messages.map((m) => ({
    from: m.from,
    text: m.text,
    createdAt: new Date(m.createdAt),
  }));

  return { code, players: playersArray, messages: messagesArray };
}

function getRoomState(roomCode) {
  const room = rooms[roomCode];
  if (!room) return null;

  const playersArray = Object.values(room.players);
  return {
    roomCode: room.code,
    players: playersArray,
    messages: room.messages,
  };
}

// Sincroniza sala da memória com o Mongo
async function syncRoomToDb(code) {
  const docData = roomToDoc(code);
  if (!docData) return;

  try {
    await RoomModel.findOneAndUpdate(
      { code },
      { $set: docData },
      { upsert: true, new: true }
    );
    // console.log(`Sala ${code} sincronizada com o banco.`);
  } catch (err) {
    console.error('Erro ao salvar sala no MongoDB:', err);
  }
}

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Jogador entra em uma sala
  socket.on('join-room', async ({ roomCode, playerName }) => {
    if (!roomCode || !playerName) return;

    const code = roomCode.toUpperCase();

    // Se não existe em memória, tenta buscar no banco
    if (!rooms[code]) {
      let roomDoc = await RoomModel.findOne({ code }).lean();

      if (roomDoc) {
        // Carrega do banco
        const playersMap = {};
        (roomDoc.players || []).forEach((p) => {
          const fakeId = `${p.name}-${Date.now()}-${Math.random()}`;
          playersMap[fakeId] = {
            id: fakeId,
            name: p.name,
            life: p.life,
            poison: p.poison,
            commanderDamage: (p.commanderDamage || []).reduce((acc, cd) => {
              acc[cd.source] = cd.damage;
              return acc;
            }, {}),
          };
        });

        rooms[code] = {
          code,
          players: playersMap,
          messages:
            (roomDoc.messages || []).map((m) => ({
              id: `${m.createdAt?.getTime?.() || Date.now()}-${Math.random()}`,
              from: m.from,
              text: m.text,
              createdAt: m.createdAt || new Date().toISOString(),
            })) || [],
        };
      } else {
        // Cria uma nova
        rooms[code] = {
          code,
          players: {},
          messages: [],
        };
      }
    }

    socket.join(code);

    // Ver se já existe jogador com esse nome
    let existingPlayerEntry = Object.entries(rooms[code].players).find(
      ([, p]) => p.name === playerName
    );

    let player;
    if (existingPlayerEntry) {
      const [, p] = existingPlayerEntry;
      player = { ...p, id: socket.id };
    } else {
      player = {
        id: socket.id,
        name: playerName,
        life: 40,
        poison: 0,
        commanderDamage: {},
      };
    }

    rooms[code].players[socket.id] = player;

    console.log(`Jogador ${playerName} entrou na sala ${code}`);

    const state = getRoomState(code);
    io.to(code).emit('room-state', state);

    await syncRoomToDb(code);
  });

  // Atualizar vida
  socket.on('update-life', async ({ roomCode, playerName, delta }) => {
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
      life: player.life + delta,
    };

    const state = getRoomState(code);
    io.to(code).emit('room-state', state);
    await syncRoomToDb(code);
  });

  // Mensagens de chat
  socket.on('chat-message', async ({ roomCode, from, text }) => {
    const code = roomCode?.toUpperCase();
    const room = rooms[code];
    if (!room || !text) return;

    const msg = {
      id: Date.now().toString(),
      from: from || 'Anônimo',
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    room.messages.push(msg);

    io.to(code).emit('room-state', getRoomState(code));
    await syncRoomToDb(code);
  });

  // Desconexão
  socket.on('disconnect', async () => {
    console.log('Cliente desconectado:', socket.id);

    for (const code of Object.keys(rooms)) {
      const room = rooms[code];
      if (room.players[socket.id]) {
        delete room.players[socket.id];

        if (Object.keys(room.players).length === 0) {
          delete rooms[code];
          console.log(`Sala ${code} removida (vazia).`);
          await RoomModel.deleteOne({ code });
        } else {
          io.to(code).emit('room-state', getRoomState(code));
          await syncRoomToDb(code);
        }
      }
    }
  });
});

// ======================
// Rotas HTTP (API REST)
// ======================

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rota para buscar carta no Scryfall
app.get('/api/cards/search', async (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Parâmetro "name" é obrigatório' });
  }

  try {
    const response = await axios.get('https://api.scryfall.com/cards/named', {
      params: {
        fuzzy: name,
      },
    });

    const card = response.data;

    // Devolvemos só o essencial pro front
    res.json({
      name: card.name,
      mana_cost: card.mana_cost,
      type_line: card.type_line,
      oracle_text: card.oracle_text,
      image_uris: card.image_uris || card.card_faces?.[0]?.image_uris || null,
      set_name: card.set_name,
    });
  } catch (err) {
    console.error('Erro ao buscar carta no Scryfall:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao buscar carta no Scryfall' });
  }
});

// ======================
// Iniciar servidor
// ======================

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
