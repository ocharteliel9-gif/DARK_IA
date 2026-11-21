import crypto from "node:crypto";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { OAuth2Client } from "google-auth-library";

const { Pool } = pg;
const sessionStoreFactory = connectPgSimple(session);
const COOKIE_NAME = "darkia.sid";
const MODE_IDS = new Set(["general", "coding", "knowledge", "gaming"]);
const PERSONALITIES = new Set(["professional", "cheerful", "direct", "friendly", "creative", "teacher"]);
const EMOJI_LEVELS = new Set(["none", "low", "medium", "always"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidRedirectUri(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) && !url.username && !url.password && !url.hash;
  } catch {
    return false;
  }
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function sessionCall(req, method) {
  return new Promise((resolve, reject) => {
    req.session[method](error => error ? reject(error) : resolve());
  });
}

function safeError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

function validateStoredMessages(messages) {
  if (!Array.isArray(messages) || messages.length > 500) return false;
  let total = 0;
  for (const message of messages) {
    if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string" || message.content.length > 20_000) return false;
    total += message.content.length;
    if (total > 500_000) return false;
  }
  return true;
}

export function mountAuthentication(app, env = process.env) {
  const redirectUri = env.GOOGLE_REDIRECT_URI || "";
  const sessionSecret = env.SESSION_SECRET || "";
  const secureCookies = env.COOKIE_SECURE === "true" || env.NODE_ENV === "production";
  const configured = Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    isValidRedirectUri(redirectUri) &&
    Buffer.byteLength(sessionSecret, "utf8") >= 32 &&
    env.DATABASE_URL
  );

  const pool = configured ? new Pool({ connectionString: env.DATABASE_URL }) : null;
  const oauth = configured
    ? new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, redirectUri)
    : null;

  if (configured) {
    const store = new sessionStoreFactory({
      pool,
      tableName: "darkia_sessions",
      createTableIfMissing: true
    });
    app.use(session({
      name: COOKIE_NAME,
      secret: sessionSecret,
      store,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      proxy: secureCookies,
      cookie: {
        httpOnly: true,
        secure: secureCookies,
        sameSite: secureCookies ? "none" : "lax",
        maxAge: 8 * 60 * 60 * 1000
      }
    }));
  } else {
    app.use((_req, _res, next) => next());
  }

  async function initialize() {
    if (!configured) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS darkia_users (
        id UUID PRIMARY KEY,
        google_sub TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        picture_url TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS darkia_chats (
        id UUID PRIMARY KEY,
        owner_id UUID NOT NULL REFERENCES darkia_users(id) ON DELETE CASCADE,
        title VARCHAR(80) NOT NULL,
        model TEXT NOT NULL,
        mode TEXT NOT NULL,
        messages JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS darkia_chats_owner_updated_idx
        ON darkia_chats(owner_id, updated_at DESC);
    `);
  }

  function requireUser(req, res, next) {
    if (!configured) return safeError(res, 503, "El inicio de sesión seguro no está configurado en el servidor.");
    const id = req.session?.user?.id;
    if (!id || !UUID_PATTERN.test(id)) return safeError(res, 401, "Inicia sesión con Google para continuar.");
    req.user = { id };
    return next();
  }

  function requireCsrf(req, res, next) {
    const expected = req.session?.csrfToken;
    const supplied = req.get("x-csrf-token");
    if (typeof expected !== "string" || typeof supplied !== "string") return safeError(res, 403, "La sesión venció. Actualiza la página e inténtalo otra vez.");
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return safeError(res, 403, "La sesión venció. Actualiza la página e inténtalo otra vez.");
    }
    return next();
  }

  app.get("/api/auth/status", (_req, res) => {
    res.json({ success: true, configured });
  });

  app.get("/api/me", async (req, res) => {
    if (!configured) return res.json({ success: true, configured: false, authenticated: false });
    const userId = req.session?.user?.id;
    if (!userId || !UUID_PATTERN.test(userId)) {
      return res.json({ success: true, configured: true, authenticated: false });
    }
    try {
      const { rows } = await pool.query(
        "SELECT id, email, display_name, picture_url FROM darkia_users WHERE id = $1",
        [userId]
      );
      if (!rows[0]) {
        await sessionCall(req, "destroy");
        return res.json({ success: true, configured: true, authenticated: false });
      }
      if (!req.session.csrfToken) {
        req.session.csrfToken = randomToken();
        await sessionCall(req, "save");
      }
      return res.json({
        success: true,
        configured: true,
        authenticated: true,
        csrfToken: req.session.csrfToken,
        user: {
          id: rows[0].id,
          email: rows[0].email,
          name: rows[0].display_name,
          picture: rows[0].picture_url
        }
      });
    } catch (error) {
      console.error("No se pudo recuperar la cuenta DARK IA:", error.message);
      return safeError(res, 503, "No se pudo consultar la sesión segura. Intenta más tarde.");
    }
  });

  app.get("/auth/google", async (req, res) => {
    if (!configured) return res.status(503).send("El acceso de Google todavía no está configurado.");
    try {
      const state = randomToken();
      const nonce = randomToken();
      req.session.oauthState = state;
      req.session.oauthNonce = nonce;
      await sessionCall(req, "save");
      const url = oauth.generateAuthUrl({
        response_type: "code",
        scope: ["openid", "email", "profile"],
        state,
        nonce,
        prompt: "select_account"
      });
      return res.redirect(url);
    } catch (error) {
      console.error("No se pudo iniciar Google OAuth:", error.message);
      return res.status(503).send("No se pudo iniciar el acceso seguro. Intenta más tarde.");
    }
  });

  app.get("/auth/google/callback", async (req, res) => {
    if (!configured) return res.status(503).send("El acceso de Google todavía no está configurado.");
    const state = req.query.state;
    if (typeof state !== "string" || typeof req.session?.oauthState !== "string" || state !== req.session.oauthState) {
      return res.status(400).send("No se pudo validar la sesión de Google. Vuelve a intentarlo.");
    }
    const nonce = req.session.oauthNonce;
    delete req.session.oauthState;
    delete req.session.oauthNonce;

    if (typeof req.query.error === "string") {
      try { await sessionCall(req, "save"); } catch {}
      return res.redirect("/?login=cancelled");
    }
    if (typeof req.query.code !== "string" || !nonce) {
      return res.status(400).send("La respuesta de Google no es válida.");
    }

    try {
      const { tokens } = await oauth.getToken({ code: req.query.code, redirect_uri: redirectUri });
      if (!tokens.id_token) return res.status(401).send("Google no devolvió un token de identidad.");
      const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
      const claims = ticket.getPayload();
      if (!claims?.sub || claims.nonce !== nonce || claims.email_verified !== true || !claims.email) {
        return res.status(401).send("No se pudo verificar la identidad de Google.");
      }

      const { rows } = await pool.query(
        `INSERT INTO darkia_users (id, google_sub, email, display_name, picture_url)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (google_sub) DO UPDATE SET
           email = EXCLUDED.email,
           display_name = EXCLUDED.display_name,
           picture_url = EXCLUDED.picture_url,
           updated_at = NOW()
         RETURNING id`,
        [crypto.randomUUID(), claims.sub, claims.email, claims.name || "", claims.picture || ""]
      );
      await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
      req.session.user = { id: rows[0].id };
      req.session.csrfToken = randomToken();
      await sessionCall(req, "save");
      return res.redirect("/");
    } catch (error) {
      console.error("Error de verificación en el retorno Google:", error.message);
      return res.status(401).send("No se pudo completar el acceso seguro. Vuelve a intentarlo.");
    }
  });

  app.post("/api/logout", requireUser, requireCsrf, async (req, res) => {
    try {
      await sessionCall(req, "destroy");
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: secureCookies,
        sameSite: secureCookies ? "none" : "lax"
      });
      return res.json({ success: true });
    } catch (error) {
      console.error("No se pudo cerrar la sesión:", error.message);
      return safeError(res, 500, "No se pudo cerrar la sesión. Intenta de nuevo.");
    }
  });

  app.get("/api/chats", requireUser, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, title, model, mode, messages, created_at, updated_at
         FROM darkia_chats WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 200`,
        [req.user.id]
      );
      return res.json({ success: true, chats: rows.map(row => ({
        id: row.id,
        title: row.title,
        model: row.model,
        mode: row.mode,
        messages: row.messages,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })) });
    } catch (error) {
      console.error("No se pudo listar chats:", error.message);
      return safeError(res, 503, "No se pudo cargar el historial seguro.");
    }
  });

  app.put("/api/chats/:id", requireUser, requireCsrf, async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};
    if (!UUID_PATTERN.test(id) || typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 80 || !validateStoredMessages(body.messages) || typeof body.model !== "string" || body.model.length > 180 || !MODE_IDS.has(body.mode)) {
      return safeError(res, 400, "Los datos de la conversación no son válidos.");
    }
    try {
      const { rows } = await pool.query(
        `INSERT INTO darkia_chats (id, owner_id, title, model, mode, messages)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           model = EXCLUDED.model,
           mode = EXCLUDED.mode,
           messages = EXCLUDED.messages,
           updated_at = NOW()
         WHERE darkia_chats.owner_id = EXCLUDED.owner_id
         RETURNING id`,
        [id, req.user.id, body.title.trim(), body.model, body.mode, JSON.stringify(body.messages)]
      );
      if (!rows.length) return safeError(res, 404, "No se encontró esa conversación.");
      return res.json({ success: true });
    } catch (error) {
      console.error("No se pudo guardar chat:", error.message);
      return safeError(res, 503, "No se pudo guardar la conversación segura.");
    }
  });

  app.delete("/api/chats/:id", requireUser, requireCsrf, async (req, res) => {
    if (!UUID_PATTERN.test(req.params.id)) return safeError(res, 400, "El identificador de conversación no es válido.");
    try {
      await pool.query("DELETE FROM darkia_chats WHERE id = $1 AND owner_id = $2", [req.params.id, req.user.id]);
      return res.json({ success: true });
    } catch (error) {
      console.error("No se pudo borrar chat:", error.message);
      return safeError(res, 503, "No se pudo borrar la conversación.");
    }
  });

  return {
    configured,
    pool,
    initialize,
    requireUser,
    requireCsrf
  };
}

export { validateStoredMessages };
