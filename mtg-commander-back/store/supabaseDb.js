const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function isConfigured() {
  return !!supabase;
}

function normalizeError(error) {
  if (error) {
    throw new Error(error.message || "Erro ao consultar Supabase");
  }
}

function mapUser(row) {
  if (!row) return null;

  return {
    _id: row.id,
    email: row.email,
    password: row.password,
    nickname: row.nickname || "",
    fullName: row.full_name || "",
    avatarUrl: row.avatar_url || "",
    bannerUrl: row.banner_url || "",
    bio: row.bio || "",
    resetPasswordTokenHash: row.reset_password_token_hash || "",
    resetPasswordExpiresAt: row.reset_password_expires_at || "",
    friends: row.friends || [],
    blocked: row.blocked || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function userPayload(user) {
  return {
    email: user.email,
    password: user.password,
    nickname: user.nickname || "",
    full_name: user.fullName || "",
    avatar_url: user.avatarUrl || "",
    banner_url: user.bannerUrl || "",
    bio: user.bio || "",
    reset_password_token_hash: user.resetPasswordTokenHash || "",
    reset_password_expires_at: user.resetPasswordExpiresAt || null,
    friends: user.friends || [],
    blocked: user.blocked || [],
  };
}

function mapDeck(row) {
  if (!row) return null;

  return {
    _id: row.id,
    userId: row.user_id,
    name: row.name,
    commander: row.commander || "",
    format: row.format || "commander",
    cards: row.cards || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function createUser({ email, password, nickname }) {
  const { data, error } = await supabase
    .from("app_users")
    .insert({
      email,
      password,
      nickname: nickname || email.split("@")[0],
    })
    .select("*")
    .single();

  normalizeError(error);
  return mapUser(data);
}

async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  normalizeError(error);
  return mapUser(data);
}

async function findUserById(id) {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", String(id))
    .maybeSingle();

  normalizeError(error);
  return mapUser(data);
}

async function findUserByResetTokenHash(tokenHash) {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("reset_password_token_hash", tokenHash)
    .gt("reset_password_expires_at", new Date().toISOString())
    .maybeSingle();

  normalizeError(error);
  return mapUser(data);
}

async function saveUser(user) {
  const { data, error } = await supabase
    .from("app_users")
    .update(userPayload(user))
    .eq("id", String(user._id))
    .select("*")
    .single();

  normalizeError(error);
  return mapUser(data);
}

async function searchUsers(currentUserId, query) {
  const safeQuery = String(query || "").replace(/[%,]/g, "").trim();
  if (!safeQuery) return [];

  const like = `%${safeQuery}%`;
  const { data, error } = await supabase
    .from("app_users")
    .select("id,email,nickname,full_name,avatar_url,banner_url,bio,friends,blocked,created_at,updated_at")
    .neq("id", String(currentUserId))
    .or(`email.ilike.${like},nickname.ilike.${like},full_name.ilike.${like}`)
    .limit(20);

  normalizeError(error);
  return (data || []).map(mapUser).map(sanitizeUser);
}

async function getFriendsPayload(userId) {
  const user = await findUserById(userId);
  if (!user) {
    return { friends: [], blocked: [] };
  }

  const ids = [...new Set([...(user.friends || []), ...(user.blocked || [])])];
  if (!ids.length) {
    return { friends: [], blocked: [] };
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .in("id", ids);

  normalizeError(error);

  const usersById = new Map((data || []).map((row) => [row.id, mapUser(row)]));
  return {
    friends: (user.friends || [])
      .map((id) => usersById.get(id))
      .filter(Boolean)
      .map(sanitizeUser),
    blocked: (user.blocked || [])
      .map((id) => usersById.get(id))
      .filter(Boolean)
      .map(sanitizeUser),
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

async function createDeck({ userId, name, commander, cards, format = "commander" }) {
  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: String(userId),
      name,
      commander: commander || "",
      format,
      cards: cards || [],
    })
    .select("*")
    .single();

  normalizeError(error);
  return mapDeck(data);
}

async function listDecks(userId) {
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .eq("user_id", String(userId))
    .order("updated_at", { ascending: false });

  normalizeError(error);
  return (data || []).map(mapDeck);
}

async function findDeckById(userId, deckId) {
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .eq("id", String(deckId))
    .eq("user_id", String(userId))
    .maybeSingle();

  normalizeError(error);
  return mapDeck(data);
}

async function updateDeck(userId, deckId, updates) {
  const { data, error } = await supabase
    .from("decks")
    .update({
      name: updates.name,
      commander: updates.commander || "",
      cards: updates.cards || [],
    })
    .eq("id", String(deckId))
    .eq("user_id", String(userId))
    .select("*")
    .maybeSingle();

  normalizeError(error);
  return mapDeck(data);
}

async function deleteDeck(userId, deckId) {
  const { data, error } = await supabase
    .from("decks")
    .delete()
    .eq("id", String(deckId))
    .eq("user_id", String(userId))
    .select("*")
    .maybeSingle();

  normalizeError(error);
  return mapDeck(data);
}

async function upsertRoom(room) {
  const { error } = await supabase.from("rooms").upsert(
    {
      code: room.code,
      name: room.name || `Sala ${room.code}`,
      is_public: !!room.isPublic,
      players: room.players || [],
      messages: room.messages || [],
      owner: room.owner || null,
      start_time: room.startTime || null,
      stack: room.stack || [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "code" }
  );

  normalizeError(error);
}

async function deleteRoom(code) {
  const { error } = await supabase.from("rooms").delete().eq("code", code);
  normalizeError(error);
}

module.exports = {
  createDeck,
  createUser,
  deleteDeck,
  deleteRoom,
  findDeckById,
  findUserByEmail,
  findUserById,
  findUserByResetTokenHash,
  getFriendsPayload,
  isConfigured,
  listDecks,
  saveUser,
  searchUsers,
  updateDeck,
  upsertRoom,
};
