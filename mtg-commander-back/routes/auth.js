const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    nickname: { type: String, required: true }, // nome que aparece no jogo
    fullName: { type: String },
    avatarUrl: { type: String },
    bio: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// Middleware simples para pegar o userId a partir do token
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Sem token" });
  }

  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.userId = data.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// ---------- REGISTRO ----------
router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password || !nickname) {
      return res
        .status(400)
        .json({ error: "Email, senha e nickname são obrigatórios" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Já existe usuário com esse email" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hash,
      nickname,
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    const userSafe = {
      _id: user._id,
      email: user.email,
      nickname: user.nickname,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    };

    res.json({ token, user: userSafe });
  } catch (err) {
    console.error("Erro no /register:", err);
    res.status(500).json({ error: "Erro ao registrar" });
  }
});

// ---------- LOGIN ----------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Usuário ou senha inválidos" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Usuário ou senha inválidos" });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    const userSafe = {
      _id: user._id,
      email: user.email,
      nickname: user.nickname,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    };

    res.json({ token, user: userSafe });
  } catch (err) {
    console.error("Erro no /login:", err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// ---------- GET /me ----------
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    res.json(user);
  } catch (err) {
    console.error("Erro no GET /me:", err);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

// ---------- PUT /me (atualizar perfil) ----------
router.put("/me", authMiddleware, async (req, res) => {
  try {
    const { nickname, fullName, avatarUrl, bio } = req.body;

    const update = {};
    if (nickname !== undefined) update.nickname = nickname;
    if (fullName !== undefined) update.fullName = fullName;
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    if (bio !== undefined) update.bio = bio;

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(user);
  } catch (err) {
    console.error("Erro no PUT /me:", err);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

// ---------- POST /change-password ----------
router.post("/change-password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Senha atual e nova senha são obrigatórias" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Nova senha deve ter pelo menos 6 caracteres" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(400).json({ error: "Senha atual incorreta" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Erro no POST /change-password:", err);
    res.status(500).json({ error: "Erro ao trocar senha" });
  }
});

module.exports = router;
