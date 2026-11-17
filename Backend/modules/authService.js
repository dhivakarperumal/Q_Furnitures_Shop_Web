const bcrypt = require("bcryptjs");
const { randomBytes, randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const USER_COLUMNS = "id, user_id, username, email, phone, date_of_birth, profile_image, role, status, created_at, updated_at";
const AUTH_USER_COLUMNS = `${USER_COLUMNS}, password_hash`;

function toPublicUser(user) {
  return {
    id: user.id,
    user_id: user.user_id,
    username: user.username,
    name: user.username,
    email: user.email,
    phone: user.phone,
    date_of_birth: user.date_of_birth || null,
    profile_image: user.profile_image || null,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function accountError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeProfile(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw accountError(400, "Profile data must be an object.");
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const dateOfBirth = typeof input.date_of_birth === "string" ? input.date_of_birth.trim() : "";
  if (name.length < 2 || name.length > 120) {
    throw accountError(400, "Name must be between 2 and 120 characters.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191) {
    throw accountError(400, "Enter a valid email address.");
  }
  if (phone && (phone.length < 6 || phone.length > 32)) {
    throw accountError(400, "Phone number must be between 6 and 32 characters.");
  }
  if (dateOfBirth) {
    const parsedDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== dateOfBirth ||
        dateOfBirth > new Date().toISOString().slice(0, 10)) {
      throw accountError(400, "Enter a valid date of birth that is not in the future.");
    }
  }

  return { name, email, phone: phone || null, date_of_birth: dateOfBirth || null };
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

  async function getProfile(userId) {
    const [users] = await pool.execute(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );
    return users[0] ? toPublicUser(users[0]) : null;
  }

  return {
    async listUsers() {
      const [users] = await pool.execute(
        `SELECT ${USER_COLUMNS} FROM users ORDER BY created_at DESC`,
      );
      return users.map(toPublicUser);
    },

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

    getProfile,

    async updateProfile(userId, input) {
      const profile = normalizeProfile(input);
      try {
        await pool.execute(
          "UPDATE users SET username = ?, email = ?, phone = ?, date_of_birth = ? WHERE id = ?",
          [profile.name, profile.email, profile.phone, profile.date_of_birth, userId],
        );
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          throw accountError(409, "That email or phone number is already in use.");
        }
        throw error;
      }

      const user = await getProfile(userId);
      if (!user) throw accountError(404, "Account was not found.");
      return user;
    },

    async changePassword(userId, currentPassword, newPassword) {
      if (typeof currentPassword !== "string" || !currentPassword) {
        throw accountError(400, "Enter your current password.");
      }
      if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) {
        throw accountError(400, "New password must be between 8 and 72 characters.");
      }
      if (!/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
        throw accountError(400, "New password must include an uppercase letter, a number, and a special character.");
      }

      const [users] = await pool.execute(
        "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
        [userId],
      );
      if (!users[0]) throw accountError(404, "Account was not found.");
      if (!await bcrypt.compare(currentPassword, users[0].password_hash)) {
        throw accountError(400, "Current password is incorrect.");
      }
      if (await bcrypt.compare(newPassword, users[0].password_hash)) {
        throw accountError(400, "Choose a password you have not used before.");
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [passwordHash, userId],
      );
    },

    async login(identifier, password) {
      const [users] = await pool.execute(
        `SELECT ${AUTH_USER_COLUMNS} FROM users WHERE email = ? OR phone = ? OR username = ?`,
        [identifier.toLowerCase(), identifier, identifier],
      );
      let user = null;
      for (const candidate of users) {
        if (await bcrypt.compare(password, candidate.password_hash)) {
          user = candidate;
          break;
        }
      }

      if (!user) {
        return null;
      }

      const safeUser = toPublicUser(user);
      if (safeUser.status !== "active") {
        return { inactive: true };
      }
      return { user: safeUser, token: createToken(safeUser) };
    },

    async updateProfileImage(userId, imageUrl) {
      const [result] = await pool.execute(
        "UPDATE users SET profile_image = ? WHERE id = ?",
        [imageUrl, userId],
      );
      if (result.affectedRows === 0) {
        return null;
      }

      const [users] = await pool.execute(
        `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
        [userId],
      );
      return users[0] ? toPublicUser(users[0]) : null;
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
