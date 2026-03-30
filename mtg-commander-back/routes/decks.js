const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const memoryDb = require("../store/memoryDb");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

const DeckSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: String,
    commander: String,
    format: { type: String, default: "commander" },
    cards: [
      {
        name: String,
        quantity: Number,
      },
    ],
  },
  { timestamps: true }
);

const Deck = mongoose.models.Deck || mongoose.model("Deck", DeckSchema);

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Sem token" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token malformado" });

  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.userId = data.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalido" });
  }
}

async function findDeck(deckId, userId) {
  return isMongoReady()
    ? Deck.findOne({ _id: deckId, userId })
    : memoryDb.findDeckById(userId, deckId);
}

router.use(authMiddleware);

router.get("/:id/resolved", async (req, res, next) => {
  try {
    const deck = await findDeck(req.params.id, req.userId);
    if (!deck) return res.status(404).json({ error: "Deck nao encontrado" });

    const resolvedCards = [];
    for (const card of deck.cards || []) {
      try {
        const response = await axios.get("https://api.scryfall.com/cards/named", {
          params: { fuzzy: card.name },
        });

        const c = response.data;
        resolvedCards.push({
          name: c.name,
          quantity: card.quantity || 1,
          mana_cost: c.mana_cost,
          type_line: c.type_line,
          oracle_text: c.oracle_text,
          image_uris: c.image_uris || c.card_faces?.[0]?.image_uris || null,
          set_name: c.set_name,
          set: c.set,
        });
      } catch (err) {
        console.error("Erro ao resolver carta do deck:", card.name, err.message);
      }
    }

    let commanderCard = null;
    if (deck.commander) {
      try {
        const response = await axios.get("https://api.scryfall.com/cards/named", {
          params: { fuzzy: deck.commander },
        });

        const c = response.data;
        commanderCard = {
          name: c.name,
          mana_cost: c.mana_cost,
          type_line: c.type_line,
          oracle_text: c.oracle_text,
          image_uris: c.image_uris || c.card_faces?.[0]?.image_uris || null,
          set_name: c.set_name,
          set: c.set,
        };
      } catch (err) {
        console.error("Erro ao resolver comandante:", deck.commander, err.message);
      }
    }

    res.json({
      id: deck._id,
      name: deck.name,
      commander: deck.commander,
      commanderCard,
      cards: resolvedCards,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/duplicate", async (req, res, next) => {
  try {
    const deck = await findDeck(req.params.id, req.userId);
    if (!deck) return res.status(404).json({ error: "Deck nao encontrado" });

    const payload = {
      userId: req.userId,
      name: `${deck.name} (copia)`,
      commander: deck.commander,
      format: deck.format,
      cards: deck.cards,
    };

    const copy = isMongoReady()
      ? await Deck.create(payload)
      : memoryDb.createDeck(payload);

    res.json(copy);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const deck = await findDeck(req.params.id, req.userId);
    if (!deck) return res.status(404).json({ error: "Deck nao encontrado" });
    res.json(deck);
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const decks = isMongoReady()
      ? await Deck.find({ userId: req.userId }).sort({ updatedAt: -1 })
      : memoryDb.listDecks(req.userId);

    res.json(decks);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, commander, cards } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nome obrigatorio" });
    }

    const payload = {
      userId: req.userId,
      name,
      commander,
      cards,
    };

    const deck = isMongoReady()
      ? await Deck.create(payload)
      : memoryDb.createDeck(payload);

    res.json(deck);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, commander, cards } = req.body;
    const deck = isMongoReady()
      ? await Deck.findOneAndUpdate(
          { _id: req.params.id, userId: req.userId },
          { name, commander, cards },
          { new: true }
        )
      : memoryDb.updateDeck(req.userId, req.params.id, { name, commander, cards });

    if (!deck) return res.status(404).json({ error: "Deck nao encontrado" });
    res.json(deck);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deck = isMongoReady()
      ? await Deck.findOneAndDelete({ _id: req.params.id, userId: req.userId })
      : memoryDb.deleteDeck(req.userId, req.params.id);

    if (!deck) return res.status(404).json({ error: "Deck nao encontrado" });
    res.json({ message: "Deck removido" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
