const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const memoryDb = require("../store/memoryDb");
const supabaseDb = require("../store/supabaseDb");
const { sendMail } = require("../utils/mailer");

const router = express.Router();

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    nickname: { type: String, trim: true },
    fullName: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    bannerUrl: { type: String, trim: true },
    bio: { type: String, trim: true },
    resetPasswordTokenHash: { type: String, default: "" },
    resetPasswordExpiresAt: { type: Date, default: null },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const RESET_TOKEN_TTL_MS = 1000 * 60 * 15;

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function isSupabaseReady() {
  return supabaseDb.isConfigured();
}

function buildUserPayload(user) {
  return {
    _id: user._id,
    email: user.email,
    nickname: user.nickname,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    bio: user.bio,
  };
}

function generateToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function buildResetLink(rawToken) {
  const baseUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    "http://localhost:5173";

  return `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(
    rawToken
  )}`;
}

async function findUserByEmail(email) {
  if (isSupabaseReady()) return supabaseDb.findUserByEmail(email);
  if (isMongoReady()) return User.findOne({ email });
  return memoryDb.findUserByEmail(email);
}

async function findUserById(id) {
  if (isSupabaseReady()) return supabaseDb.findUserById(id);
  if (isMongoReady()) return User.findById(id);
  return memoryDb.findUserById(id);
}

async function findUserByResetToken(rawToken) {
  const tokenHash = hashResetToken(rawToken);

  if (isSupabaseReady()) {
    return supabaseDb.findUserByResetTokenHash(tokenHash);
  }

  if (isMongoReady()) {
    return User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });
  }

  return memoryDb.findUserByResetTokenHash(tokenHash);
}

async function persistUser(user) {
  if (isSupabaseReady()) {
    return supabaseDb.saveUser(user);
  }

  if (isMongoReady()) {
    await user.save();
    return user;
  }

  return memoryDb.saveUser(user);
}

async function authRequired(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Sem token" });
  }

  const token = header.split(" ")[1];

  try {
    const data = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(data.id);

    if (!user) {
      return res.status(401).json({ error: "Usuario nao encontrado" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Erro authRequired:", err);
    return res.status(401).json({ error: "Token invalido" });
  }
}

router.post("/register", async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha sao obrigatorios" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: "Email ja cadastrado" });
    }

    const hash = await bcrypt.hash(password, 10);
    let user;
    if (isSupabaseReady()) {
      user = await supabaseDb.createUser({ email, password: hash, nickname });
    } else if (isMongoReady()) {
      user = await User.create({
        email,
        password: hash,
        nickname: nickname || email.split("@")[0],
      });
    } else {
      user = memoryDb.createUser({ email, password: hash, nickname });
    }

    const token = generateToken(user);
    res.json({ token, user: buildUserPayload(user) });
  } catch (err) {
    console.error("Erro /register:", err);
    res.status(500).json({ error: "Erro ao registrar" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: "Credenciais invalidas" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Credenciais invalidas" });
    }

    const token = generateToken(user);
    res.json({ token, user: buildUserPayload(user) });
  } catch (err) {
    console.error("Erro /login:", err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Informe o email cadastrado" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.json({
        message:
          "Se o email existir na base, enviaremos um link de recuperacao.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordTokenHash = hashResetToken(rawToken);
    user.resetPasswordExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await persistUser(user);

    const resetLink = buildResetLink(rawToken);
    await sendMail({
      to: user.email,
      subject: "Recuperacao de senha - Commander Online",
      text: `Recebemos um pedido para redefinir sua senha.\n\nUse este link por ate 15 minutos:\n${resetLink}\n\nSe voce nao pediu essa troca, ignore este email.`,
      html: `<p>Recebemos um pedido para redefinir sua senha.</p><p>Use este link por ate 15 minutos:</p><p><a href="${resetLink}">${resetLink}</a></p><p>Se voce nao pediu essa troca, ignore este email.</p>`,
    });

    const response = {
      message:
        "Se o email existir na base, enviaremos um link de recuperacao.",
    };

    if (process.env.NODE_ENV !== "production" && !process.env.SMTP_HOST) {
      response.devResetLink = resetLink;
    }

    res.json(response);
  } catch (err) {
    console.error("Erro /forgot-password:", err);
    res.status(500).json({ error: "Erro ao solicitar recuperacao de senha" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const rawToken = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!rawToken || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token e nova senha sao obrigatorios" });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({ error: "Nova senha muito curta" });
    }

    const user = await findUserByResetToken(rawToken);
    if (!user) {
      return res.status(400).json({ error: "Link invalido ou expirado" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordTokenHash = "";
    user.resetPasswordExpiresAt = null;
    await persistUser(user);

    res.json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    console.error("Erro /reset-password:", err);
    res.status(500).json({ error: "Erro ao redefinir senha" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  res.json(buildUserPayload(req.user));
});

router.put("/profile", authRequired, async (req, res) => {
  try {
    const { nickname, fullName, avatarUrl, bannerUrl, bio } = req.body;

    if (nickname && nickname.length < 2) {
      return res
        .status(400)
        .json({ error: "Apelido deve ter pelo menos 2 caracteres" });
    }

    if (bio && bio.length > 100) {
      return res
        .status(400)
        .json({ error: "Sobre voce deve ter no maximo 100 caracteres" });
    }

    req.user.nickname = nickname ?? req.user.nickname;
    req.user.fullName = fullName ?? req.user.fullName;
    req.user.avatarUrl = avatarUrl ?? req.user.avatarUrl;
    req.user.bannerUrl = bannerUrl ?? req.user.bannerUrl;
    req.user.bio = bio ?? req.user.bio;

    req.user = await persistUser(req.user);
    res.json(buildUserPayload(req.user));
  } catch (err) {
    console.error("Erro /profile:", err);
    res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

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
      return res.status(400).json({ error: "Nova senha muito curta" });
    }

    req.user.password = await bcrypt.hash(newPassword, 10);
    req.user.resetPasswordTokenHash = "";
    req.user.resetPasswordExpiresAt = null;
    req.user = await persistUser(req.user);

    res.json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    console.error("Erro /change-password:", err);
    res.status(500).json({ error: "Erro ao trocar senha" });
  }
});

router.get("/users/search", authRequired, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.json({ users: [] });
    }

    if (isSupabaseReady()) {
      return res.json({ users: await supabaseDb.searchUsers(req.user._id, q) });
    }

    if (isMongoReady()) {
      const regex = new RegExp(q, "i");
      const users = await User.find({
        _id: { $ne: req.user._id },
        $or: [{ email: regex }, { nickname: regex }, { fullName: regex }],
      })
        .select("_id email nickname fullName avatarUrl bannerUrl")
        .limit(20)
        .lean();

      return res.json({ users });
    }

    res.json({ users: memoryDb.searchUsers(req.user._id, q) });
  } catch (err) {
    console.error("Erro /users/search:", err);
    res.status(500).json({ error: "Erro ao buscar usuarios" });
  }
});

router.get("/friends", authRequired, async (req, res) => {
  try {
    if (isSupabaseReady()) {
      return res.json(await supabaseDb.getFriendsPayload(req.user._id));
    }

    if (isMongoReady()) {
      const me = await User.findById(req.user._id)
        .populate("friends", "_id email nickname fullName avatarUrl bannerUrl")
        .populate("blocked", "_id email nickname fullName avatarUrl bannerUrl")
        .lean();

      return res.json({
        friends: me?.friends || [],
        blocked: me?.blocked || [],
      });
    }

    res.json(memoryDb.getFriendsPayload(req.user._id));
  } catch (err) {
    console.error("Erro /friends GET:", err);
    res.status(500).json({ error: "Erro ao listar amigos" });
  }
});

router.post("/friends/add", authRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId e obrigatorio" });
    }

    if (String(userId) === String(req.user._id)) {
      return res
        .status(400)
        .json({ error: "Voce nao pode adicionar voce mesmo" });
    }

    const other = await findUserById(userId);
    if (!other) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const me = await findUserById(req.user._id);
    if (me.friends.some((friendId) => String(friendId) === String(other._id))) {
      return res.status(400).json({ error: "Ja e seu amigo" });
    }

    me.friends.push(other._id);
    other.friends.push(me._id);

    await persistUser(me);
    await persistUser(other);

    res.json({
      message: "Amigo adicionado com sucesso",
      friend: buildUserPayload(other),
    });
  } catch (err) {
    console.error("Erro /friends/add:", err);
    res.status(500).json({ error: "Erro ao adicionar amigo" });
  }
});

router.post("/friends/remove", authRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId e obrigatorio" });
    }

    const other = await findUserById(userId);
    if (!other) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const me = await findUserById(req.user._id);
    me.friends = me.friends.filter((id) => String(id) !== String(other._id));
    other.friends = other.friends.filter((id) => String(id) !== String(me._id));

    await persistUser(me);
    await persistUser(other);

    res.json({ message: "Amizade removida" });
  } catch (err) {
    console.error("Erro /friends/remove:", err);
    res.status(500).json({ error: "Erro ao remover amigo" });
  }
});

router.post("/block", authRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId e obrigatorio" });
    }

    if (String(userId) === String(req.user._id)) {
      return res
        .status(400)
        .json({ error: "Voce nao pode bloquear voce mesmo" });
    }

    const other = await findUserById(userId);
    if (!other) {
      return res.status(404).json({ error: "Usuario nao encontrado" });
    }

    const me = await findUserById(req.user._id);
    if (!me.blocked.some((id) => String(id) === String(other._id))) {
      me.blocked.push(other._id);
    }

    me.friends = me.friends.filter((id) => String(id) !== String(other._id));
    other.friends = other.friends.filter((id) => String(id) !== String(me._id));

    await persistUser(me);
    await persistUser(other);

    res.json({ message: "Usuario bloqueado" });
  } catch (err) {
    console.error("Erro /block:", err);
    res.status(500).json({ error: "Erro ao bloquear usuario" });
  }
});

router.post("/unblock", authRequired, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId e obrigatorio" });
    }

    const me = await findUserById(req.user._id);
    me.blocked = me.blocked.filter((id) => String(id) !== String(userId));

    await persistUser(me);
    res.json({ message: "Usuario desbloqueado" });
  } catch (err) {
    console.error("Erro /unblock:", err);
    res.status(500).json({ error: "Erro ao desbloquear usuario" });
  }
});

module.exports = router;
