const crypto = require("crypto");

const users = [];
const decks = [];

function createId() {
  return crypto.randomBytes(12).toString("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...clone(user),
    friends: [...(user.friends || [])],
    blocked: [...(user.blocked || [])],
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = normalizeUser(user);
  return safeUser;
}

function createUser({ email, password, nickname }) {
  const user = {
    _id: createId(),
    email,
    password,
    nickname: nickname || email.split("@")[0],
    fullName: "",
    avatarUrl: "",
    bannerUrl: "",
    bio: "",
    resetPasswordTokenHash: "",
    resetPasswordExpiresAt: "",
    friends: [],
    blocked: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  users.push(user);
  return normalizeUser(user);
}

function findUserByEmail(email) {
  return normalizeUser(users.find((user) => user.email === email) || null);
}

function findUserById(id) {
  return normalizeUser(users.find((user) => user._id === String(id)) || null);
}

function findUserByResetTokenHash(tokenHash) {
  return normalizeUser(
    users.find(
      (user) =>
        user.resetPasswordTokenHash === tokenHash &&
        user.resetPasswordExpiresAt &&
        new Date(user.resetPasswordExpiresAt).getTime() > Date.now()
    ) || null
  );
}

function saveUser(user) {
  const index = users.findIndex((entry) => entry._id === String(user?._id));
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    ...clone(user),
    _id: users[index]._id,
    updatedAt: nowIso(),
  };

  return normalizeUser(users[index]);
}

function searchUsers(currentUserId, query) {
  const regex = new RegExp(query, "i");

  return users
    .filter((user) => user._id !== String(currentUserId))
    .filter(
      (user) =>
        regex.test(user.email || "") ||
        regex.test(user.nickname || "") ||
        regex.test(user.fullName || "")
    )
    .slice(0, 20)
    .map(sanitizeUser);
}

function getFriendsPayload(userId) {
  const user = users.find((entry) => entry._id === String(userId));
  if (!user) {
    return { friends: [], blocked: [] };
  }

  return {
    friends: (user.friends || [])
      .map((id) => findUserById(id))
      .filter(Boolean)
      .map(sanitizeUser),
    blocked: (user.blocked || [])
      .map((id) => findUserById(id))
      .filter(Boolean)
      .map(sanitizeUser),
  };
}

function createDeck({ userId, name, commander, cards, format = "commander" }) {
  const deck = {
    _id: createId(),
    userId: String(userId),
    name,
    commander: commander || "",
    format,
    cards: clone(cards || []),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  decks.push(deck);
  return clone(deck);
}

function listDecks(userId) {
  return decks
    .filter((deck) => deck.userId === String(userId))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(clone);
}

function findDeckById(userId, deckId) {
  const deck =
    decks.find(
      (entry) =>
        entry.userId === String(userId) && entry._id === String(deckId)
    ) || null;

  return deck ? clone(deck) : null;
}

function updateDeck(userId, deckId, updates) {
  const index = decks.findIndex(
    (entry) =>
      entry.userId === String(userId) && entry._id === String(deckId)
  );

  if (index === -1) return null;

  decks[index] = {
    ...decks[index],
    ...clone(updates),
    _id: decks[index]._id,
    userId: decks[index].userId,
    updatedAt: nowIso(),
  };

  return clone(decks[index]);
}

function deleteDeck(userId, deckId) {
  const index = decks.findIndex(
    (entry) =>
      entry.userId === String(userId) && entry._id === String(deckId)
  );

  if (index === -1) return null;

  const [removed] = decks.splice(index, 1);
  return clone(removed);
}

module.exports = {
  createDeck,
  createUser,
  deleteDeck,
  findDeckById,
  findUserByEmail,
  findUserById,
  findUserByResetTokenHash,
  getFriendsPayload,
  listDecks,
  sanitizeUser,
  saveUser,
  searchUsers,
  updateDeck,
};
