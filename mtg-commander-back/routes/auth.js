const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

// =======================================
//  SCHEMA / MODEL DE USUÁRIO
// =======================================

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    nickname: { type: String, trim: true },
    fullName: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    bio: { type: String, trim: true },

    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    blocked: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);


const User = mongoose.models.User || mongoose.model("User", UserSchema);

// =======================================
//  UTILS
// =======================================

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function authRequired(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Sem token" });
  }

  const token = header.split(" ")[1];

  try {
    const data = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(data.id);
    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Erro authRequired:", err);
    return res.status(401).json({ error: "Token inválido" });
  }
}

// =======================================
//  AUTH BÁSICO
// =======================================

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email e senha são obrigatórios" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hash,
      nickname: nickname || email.split("@")[0],
    });

    const token = generateToken(user);

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        nickname: user.nickname,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error("Erro /register:", err);
    res.status(500).json({ error: "Erro ao registrar" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        nickname: user.nickname,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        bannerUrl: user.bannerUrl,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error("Erro /login:", err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// GET /auth/me
router.get("/me", authRequired, async (req, res) => {
  const u = req.user;
  res.json({
    _id: u._id,
    email: u.email,
    nickname: u.nickname,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
    bannerUrl: u.bannerUrl, // <-- AQUI FALTAVA
    bio: u.bio,
  });
});

// =======================================
//  PERFIL
// =======================================

// PUT /auth/profile
router.put("/profile", authRequired, async (req, res) => {
  try {
    // bannerUrl incluído aqui
    const { nickname, fullName, avatarUrl, bannerUrl, bio } = req.body;

    if (nickname && nickname.length < 2) {
      return res
        .status(400)
        .json({ error: "Apelido deve ter pelo menos 2 caracteres" });
    }

    req.user.nickname  = nickname  ?? req.user.nickname;
    req.user.fullName  = fullName  ?? req.user.fullName;
    req.user.avatarUrl = avatarUrl ?? req.user.avatarUrl;
    req.user.bannerUrl = bannerUrl ?? req.user.bannerUrl; // <-- AQUI TAMBÉM
    req.user.bio       = bio       ?? req.user.bio;

    await req.user.save();

    res.json({
      _id: req.user._id,
      email: req.user.email,
      nickname: req.user.nickname,
      fullName: req.user.fullName,
      avatarUrl: req.user.avatarUrl,
      bannerUrl: req.user.bannerUrl,
      bio: req.user.bio,
    });
  } catch (err) {
    console.error("Erro /profile:", err);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

// POST /auth/change-password
router.post("/change-password", authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Informe a senha atual e a nova senha" });
    }

    const ok = await bcrypt.compare(currentPassword, req.user.password);

    if (!ok) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    if (newPassword.length < 4) {
      return res
        .status(400)
        .json({ error: "Nova senha muito curta" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    req.user.password = hash;
    await req.user.save();

    res.json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    console.error("Erro /change-password:", err);
    res.status(500).json({ error: "Erro ao trocar senha" });
  }
});

// =======================================
//  BUSCA DE USUÁRIOS (PARA AMIGOS)
// =======================================

// GET /auth/users/search?q=...
router.get("/users/search", authRequired, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(q, "i");

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ email: regex }, { nickname: regex }, { fullName: regex }],
    })
      .select("_id email nickname fullName avatarUrl bannerUrl")
      .limit(20)
      .lean();

    res.json({ users });
  } catch (err) {
    console.error("Erro /users/search:", err);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// =======================================
//  AMIGOS (SIMPLES)
// =======================================

// GET /auth/friends
router.get("/friends", authRequired, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
      .populate("friends", "_id email nickname fullName avatarUrl bannerUrl")
      .populate("blocked", "_id email nickname fullName avatarUrl bannerUrl")
      .lean();

    res.json({
      friends: me.friends || [],
      blocked: me.blocked || [],
    });
  } catch (err) {
    console.error("Erro /friends GET:", err);
    res.status(500).json({ error: "Erro ao listar amigos" });
  }
});


// POST /auth/friends/add  { userId }
router.post("/friends/add", authRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    if (userId === String(req.user._id)) {
      return res
        .status(400)
        .json({ error: "Você não pode adicionar você mesmo" });
    }

    const other = await User.findById(userId);
    if (!other) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const me = await User.findById(req.user._id);

    const alreadyFriend = me.friends.some(
      (f) => String(f) === String(other._id)
    );
    if (alreadyFriend) {
      return res.status(400).json({ error: "Já é seu amigo" });
    }

    me.friends.push(other._id);
    other.friends.push(me._id);

    await me.save();
    await other.save();

    res.json({
      message: "Amigo adicionado com sucesso",
      friend: {
        _id: other._id,
        email: other.email,
        nickname: other.nickname,
        fullName: other.fullName,
        avatarUrl: other.avatarUrl,
        bannerUrl: other.bannerUrl,
      },
    });
  } catch (err) {
    console.error("Erro /friends/add:", err);
    res.status(500).json({ error: "Erro ao adicionar amigo" });
  }
});

router.post("/block", authRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    if (userId === String(req.user._id)) {
      return res.status(400).json({ error: "Você não pode bloquear você mesmo" });
    }

    const other = await User.findById(userId);
    if (!other) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const me = await User.findById(req.user._id);

    // se ainda não estiver bloqueado, adiciona
    if (!me.blocked.some((id) => String(id) === String(userId))) {
      me.blocked.push(userId);
    }

    // opcional: remove da lista de amigos
    me.friends = (me.friends || []).filter(
      (id) => String(id) !== String(userId)
    );

    await me.save();

    res.json({ message: "Usuário bloqueado" });
  } catch (err) {
    console.error("Erro /block:", err);
    res.status(500).json({ error: "Erro ao bloquear usuário" });
  }
});

router.post("/unblock", authRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    const me = await User.findById(req.user._id);

    me.blocked = (me.blocked || []).filter(
      (id) => String(id) !== String(userId)
    );

    await me.save();

    res.json({ message: "Usuário desbloqueado" });
  } catch (err) {
    console.error("Erro /unblock:", err);
    res.status(500).json({ error: "Erro ao desbloquear usuário" });
  }
});


// POST /auth/friends/remove  { userId }
router.post("/friends/remove", authRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    const other = await User.findById(userId);
    if (!other) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const me = await User.findById(req.user._id);

    me.friends = (me.friends || []).filter(
      (id) => String(id) !== String(other._id)
    );

    other.friends = (other.friends || []).filter(
      (id) => String(id) !== String(me._id)
    );

    await me.save();
    await other.save();

    res.json({ message: "Amizade removida" });
  } catch (err) {
    console.error("Erro /friends/remove:", err);
    res.status(500).json({ error: "Erro ao remover amigo" });
  }
});

module.exports = router;
