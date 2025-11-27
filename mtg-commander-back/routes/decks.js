const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Schema de Deck
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

const Deck = mongoose.model("Deck", DeckSchema);

// Middleware de auth
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
    return res.status(401).json({ error: "Token inválido" });
  }
}

router.use(authMiddleware);

// ------------------------------
// 1) ROTA PRIORITÁRIA /resolved
// ------------------------------
router.get("/:id/resolved", async (req, res, next) => {
  try {
    const deck = await Deck.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!deck) return res.status(404).json({ error: "Deck não encontrado" });

    const resolvedCards = [];

    // resolve as 99 cartas da lista
    for (const card of deck.cards || []) {
      try {
        const response = await axios.get(
          "https://api.scryfall.com/cards/named",
          { params: { fuzzy: card.name } }
        );

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

    // resolve o comandante separado
    let commanderCard = null;
    if (deck.commander) {
      try {
        const response = await axios.get(
          "https://api.scryfall.com/cards/named",
          { params: { fuzzy: deck.commander } }
        );

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


// ------------------------------
// 2) DUPLICAR DECK
// ------------------------------
router.post("/:id/duplicate", async (req, res, next) => {
  try {
    const deck = await Deck.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!deck) return res.status(404).json({ error: "Deck não encontrado" });

    const copy = await Deck.create({
      userId: req.userId,
      name: deck.name + " (cópia)",
      commander: deck.commander,
      format: deck.format,
      cards: deck.cards,
    });

    res.json(copy);
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// 3) ROTA GENÉRICA /:id
// ------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    const deck = await Deck.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!deck) return res.status(404).json({ error: "Deck não encontrado" });

    res.json(deck);
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// 4) LISTAR
// ------------------------------
router.get("/", async (req, res, next) => {
  try {
    const decks = await Deck.find({ userId: req.userId }).sort({
      updatedAt: -1,
    });
    res.json(decks);
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// 5) CRIAR
// ------------------------------
router.post("/", async (req, res, next) => {
  try {
    const { name, commander, cards } = req.body;

    if (!name)
      return res.status(400).json({ error: "Nome obrigatório" });

    const deck = await Deck.create({
      userId: req.userId,
      name,
      commander,
      cards,
    });

    res.json(deck);
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// 6) ATUALIZAR
// ------------------------------
router.put("/:id", async (req, res, next) => {
  try {
    const { name, commander, cards } = req.body;

    const deck = await Deck.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { name, commander, cards },
      { new: true }
    );

    if (!deck) return res.status(404).json({ error: "Deck não encontrado" });

    res.json(deck);
  } catch (err) {
    next(err);
  }
});

// ------------------------------
// 7) DELETAR
// ------------------------------
router.delete("/:id", async (req, res, next) => {
  try {
    const deck = await Deck.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!deck) return res.status(404).json({ error: "Deck não encontrado" });

    res.json({ message: "Deck removido" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
