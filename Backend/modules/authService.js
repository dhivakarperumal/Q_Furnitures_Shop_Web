const bcrypt = require("bcryptjs");
const { randomBytes, randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const USER_COLUMNS = "id, user_id, username, email, phone, role, status, created_at, updated_at";
const AUTH_USER_COLUMNS = `${USER_COLUMNS}, password_hash`;

function toPublicUser(user) {
  return {
    id: user.id,
    user_id: user.user_id,
    username: user.username,
    name: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function createAuthService(pool) {
  if (!process.env.JWT_SECRET) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }

  const googleClient = process.env.GOOGLE_CLIENT_ID
    ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
    : null;

  function createToken(user) {
    return jwt.sign(
      { id: user.id, user_id: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "12h" },
    );
  }

  return {
    async register({ username, email, phone, password }) {
      const passwordHash = await bcrypt.hash(password, 12);
      const userId = randomUUID();
      await pool.execute(
        "INSERT INTO users (user_id, username, email, phone, password_hash, status) VALUES (?, ?, ?, ?, ?, 'active')",
        [userId, username, email, phone, passwordHash],
      );
      const [users] = await pool.execute(
        `SELECT ${USER_COLUMNS} FROM users WHERE user_id = ?`,
        [userId],
      );

      return toPublicUser(users[0]);
    },

    async login(identifier, password) {
      const [users] = await pool.execute(
        `SELECT ${AUTH_USER_COLUMNS} FROM users WHERE email = ? OR phone = ? LIMIT 1`,
        [identifier.toLowerCase(), identifier],
      );
      const user = users[0];

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return null;
      }

      const safeUser = toPublicUser(user);
      if (safeUser.status !== "active") {
        return { inactive: true };
      }
      return { user: safeUser, token: createToken(safeUser) };
    },

    async googleLogin(credential) {
      if (!googleClient) {
        const error = new Error("Google sign-in is not configured on the server.");
        error.status = 503;
        throw error;
      }

      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (cause) {
        const error = new Error("Google credential is invalid or expired.");
        error.status = 401;
        error.cause = cause;
        throw error;
      }

      if (!payload?.email || !payload.email_verified) {
        const error = new Error("Google account email is not verified.");
        error.status = 401;
        throw error;
      }

      const email = payload.email.toLowerCase();
      const [users] = await pool.execute(
        `SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
        [email],
      );
      let user = users[0];

      if (!user) {
        const username = (payload.name || email.split("@")[0]).trim().slice(0, 120);
        const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
        const userId = randomUUID();

        try {
          await pool.execute(
            "INSERT INTO users (user_id, username, email, phone, password_hash, status) VALUES (?, ?, ?, NULL, ?, 'active')",
            [userId, username || email, email, passwordHash],
          );
          const [createdUsers] = await pool.execute(
            `SELECT ${USER_COLUMNS} FROM users WHERE user_id = ?`,
            [userId],
          );
          user = createdUsers[0];
        } catch (error) {
          if (error.code !== "ER_DUP_ENTRY") {
            throw error;
          }

          const [existingUsers] = await pool.execute(
            `SELECT ${USER_COLUMNS} FROM users WHERE email = ? LIMIT 1`,
            [email],
          );
          if (!existingUsers[0]) {
            throw error;
          }
          user = existingUsers[0];
        }
      }

      const safeUser = toPublicUser(user);
      if (safeUser.status !== "active") {
        const error = new Error("This account is inactive. Contact support for assistance.");
        error.status = 403;
        throw error;
      }
      return { user: safeUser, token: createToken(safeUser) };
    },
  };
}

module.exports = { createAuthService };
