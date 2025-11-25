const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const router = express.Router();

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  nickname: String,
});

const User = mongoose.model("User", UserSchema);

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// REGISTER
router.post("/register", async (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !password || !nickname)
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });

  const hashed = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({
      email,
      password: hashed,
      nickname,
    });

    res.json({ message: "Conta criada!", user });
  } catch (err) {
    res.status(400).json({ error: "Email já existe" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = jwt.sign(
    { id: user._id, nickname: user.nickname },
    JWT_SECRET,
    { expiresIn: "2d" }
  );

  res.json({ token });
});

// VALIDAR TOKEN / PEGAR INFO
router.get("/me", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Sem token" });

  try {
    const data = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(data.id).select("-password");
    res.json(user);
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
});

module.exports = router;
