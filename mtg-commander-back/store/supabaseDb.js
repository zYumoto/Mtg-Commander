const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "profile-media";

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

let bucketReadyPromise = null;

function isConfigured() {
  return !!supabase;
}

function normalizeError(error) {
  if (error) {
    throw new Error(error.message || "Erro ao consultar Supabase");
  }
}

async function ensureStorageBucket() {
  if (!supabase) {
    throw new Error("Supabase Storage nao configurado");
  }

  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);
      if (!error && data) {
        if (!data.public) {
          const { error: updateError } = await supabase.storage.updateBucket(
            STORAGE_BUCKET,
            {
              public: true,
              fileSizeLimit: "5242880",
              allowedMimeTypes: ["image/*"],
            }
          );
          normalizeError(updateError);
        }
        return;
      }

      const bucketMissing =
        error &&
        /not found|does not exist|no bucket/i.test(
          `${error.message || ""} ${error.name || ""}`
        );

      if (!bucketMissing) {
        normalizeError(error);
      }

      const { error: createError } = await supabase.storage.createBucket(
        STORAGE_BUCKET,
        {
          public: true,
          fileSizeLimit: "5242880",
          allowedMimeTypes: ["image/*"],
        }
      );
      normalizeError(createError);
    })().catch((err) => {
      bucketReadyPromise = null;
      throw err;
    });
  }

  await bucketReadyPromise;
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Formato de imagem invalido");
  }

  const [, mimeType, base64] = match;
  return {
    mimeType,
    buffer: Buffer.from(base64, "base64"),
  };
}

function buildStoragePath(userId, field) {
  return `${userId}/${field}`;
}

function extractStoragePathFromUrl(url) {
  if (!url || !SUPABASE_URL) return null;

  const normalizedBaseUrl = SUPABASE_URL.replace(/\/$/, "");
  const publicPrefix = `${normalizedBaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const renderPrefix = `${normalizedBaseUrl}/storage/v1/render/image/public/${STORAGE_BUCKET}/`;

  if (String(url).startsWith(publicPrefix)) {
    return decodeURIComponent(String(url).slice(publicPrefix.length).split("?")[0]);
  }

  if (String(url).startsWith(renderPrefix)) {
    return decodeURIComponent(String(url).slice(renderPrefix.length).split("?")[0]);
  }

  return null;
}

async function uploadProfileImage({ userId, field, dataUrl }) {
  await ensureStorageBucket();

  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const path = buildStoragePath(userId, field);

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: true,
    cacheControl: "3600",
  });
  normalizeError(error);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function removeProfileImageByUrl(url) {
  const path = extractStoragePathFromUrl(url);
  if (!path || !supabase) return;

  await ensureStorageBucket();

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  normalizeError(error);
}

async function getProfileImagePublicUrl(userId, field) {
  if (!supabase) return "";

  await ensureStorageBucket();

  const folder = String(userId);
  const fileName = String(field);
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list(folder, {
    limit: 20,
    search: fileName,
  });
  normalizeError(error);

  const exists = (data || []).some((item) => item.name === fileName);
  if (!exists) {
    return "";
  }

  const { data: publicData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(buildStoragePath(userId, field));
  return publicData.publicUrl;
}

async function hydrateProfileMedia(user) {
  if (!user || !supabase) return user;

  for (const field of ["avatarUrl", "bannerUrl", "showcaseImageUrl"]) {
    if (!user[field]) {
      user[field] = await getProfileImagePublicUrl(user._id, field);
    }
  }

  return user;
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
    customTitle: row.custom_title || "",
    victoryCount: row.victory_count || 0,
    showcaseImageUrl: row.showcase_image_url || "",
    showcaseImageScale: row.showcase_image_scale || 1,
    featuredDeckId: row.featured_deck_id || "",
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
    custom_title: user.customTitle || "",
    victory_count: user.victoryCount || 0,
    showcase_image_url: user.showcaseImageUrl || "",
    showcase_image_scale: user.showcaseImageScale || 1,
    featured_deck_id: user.featuredDeckId || "",
    reset_password_token_hash: user.resetPasswordTokenHash || "",
    reset_password_expires_at: user.resetPasswordExpiresAt || null,
    friends: user.friends || [],
    blocked: user.blocked || [],
  };
}

function extractMissingColumn(error) {
  const message = String(error?.message || "");
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match ? match[1] : null;
}

async function updateUserWithSchemaFallback(id, payload) {
  let remainingPayload = { ...payload };

  while (true) {
    const { data, error } = await supabase
      .from("app_users")
      .update(remainingPayload)
      .eq("id", String(id))
      .select("*")
      .single();

    if (!error) {
      return data;
    }

    const missingColumn = extractMissingColumn(error);
    if (!missingColumn || !(missingColumn in remainingPayload)) {
      normalizeError(error);
    }

    delete remainingPayload[missingColumn];
  }
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
  return hydrateProfileMedia(mapUser(data));
}

async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  normalizeError(error);
  return hydrateProfileMedia(mapUser(data));
}

async function findUserById(id) {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", String(id))
    .maybeSingle();

  normalizeError(error);
  return hydrateProfileMedia(mapUser(data));
}

async function findUserByResetTokenHash(tokenHash) {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("reset_password_token_hash", tokenHash)
    .gt("reset_password_expires_at", new Date().toISOString())
    .maybeSingle();

  normalizeError(error);
  return hydrateProfileMedia(mapUser(data));
}

async function saveUser(user) {
  const data = await updateUserWithSchemaFallback(user._id, userPayload(user));
  return hydrateProfileMedia(mapUser(data));
}

async function searchUsers(currentUserId, query) {
  const safeQuery = String(query || "").replace(/[%,]/g, "").trim();
  if (!safeQuery) return [];

  const like = `%${safeQuery}%`;
  const { data, error } = await supabase
    .from("app_users")
    .select(
      "id,email,nickname,full_name,avatar_url,banner_url,bio,custom_title,victory_count,showcase_image_url,showcase_image_scale,featured_deck_id,friends,blocked,created_at,updated_at"
    )
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
  removeProfileImageByUrl,
  saveUser,
  searchUsers,
  uploadProfileImage,
  updateDeck,
  upsertRoom,
};
