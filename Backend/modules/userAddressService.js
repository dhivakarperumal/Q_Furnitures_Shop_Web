function addressError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeAddress(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw addressError(400, "Address data must be an object.");
  }

  const label = String(input.label || "Home").trim();
  const customerName = String(input.customer_name || "").trim();
  const customerPhone = String(input.customer_phone || "").trim();
  const streetAddress = String(input.street_address || "").trim();
  const city = String(input.city || "").trim();
  const district = String(input.district || "").trim();
  const state = String(input.state || "").trim();
  const country = String(input.country || "India").trim();
  const zipCode = String(input.zip_code || "").trim();
  if (!label || label.length > 40) throw addressError(400, "Address label must be 40 characters or fewer.");
  if (customerName.length < 2 || customerName.length > 120) {
    throw addressError(400, "Enter a recipient name between 2 and 120 characters.");
  }
  if (customerPhone.length < 6 || customerPhone.length > 32) {
    throw addressError(400, "Enter a valid phone number.");
  }
  if (!streetAddress || streetAddress.length > 255) {
    throw addressError(400, "Street address is required and must be 255 characters or fewer.");
  }
  if (!city || city.length > 191) throw addressError(400, "City is required and must be 191 characters or fewer.");
  if (district.length > 191) throw addressError(400, "District must be 191 characters or fewer.");
  if (!state || state.length > 191) throw addressError(400, "State is required and must be 191 characters or fewer.");
  if (!country || country.length > 191) throw addressError(400, "Country is required and must be 191 characters or fewer.");
  if (!zipCode || zipCode.length > 32) throw addressError(400, "PIN code is required and must be 32 characters or fewer.");

  return {
    label,
    customer_name: customerName,
    customer_phone: customerPhone,
    street_address: streetAddress,
    city,
    district: district || null,
    state,
    country,
    zip_code: zipCode,
    is_default: input.is_default === true || input.is_default === 1,
  };
}

function createUserAddressService(pool) {
  async function assertUser(executor, userId) {
    const [users] = await executor.execute(
      "SELECT user_id FROM users WHERE user_id = ? LIMIT 1 FOR UPDATE",
      [userId],
    );
    if (!users.length) throw addressError(404, "Account was not found.");
  }

  async function listForUser(userId, executor = pool) {
    const [addresses] = await executor.execute(
      `SELECT id, label, customer_name, customer_phone, street_address, city, district,
              state, country, zip_code, is_default, created_at, updated_at
       FROM user_addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC, id DESC`,
      [userId],
    );
    return addresses;
  }

  return {
    listForUser,

    async create(userId, input) {
      const address = normalizeAddress(input);
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await assertUser(connection, userId);
        const [existing] = await connection.execute(
          "SELECT id FROM user_addresses WHERE user_id = ? FOR UPDATE",
          [userId],
        );
        const isDefault = address.is_default || existing.length === 0;
        if (isDefault) {
          await connection.execute(
            "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?",
            [userId],
          );
        }
        const [result] = await connection.execute(
          `INSERT INTO user_addresses
           (user_id, label, customer_name, customer_phone, street_address, city, district,
            state, country, zip_code, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            address.label,
            address.customer_name,
            address.customer_phone,
            address.street_address,
            address.city,
            address.district,
            address.state,
            address.country,
            address.zip_code,
            isDefault ? 1 : 0,
          ],
        );
        await connection.commit();
        const addresses = await listForUser(userId);
        return addresses.find((item) => Number(item.id) === Number(result.insertId));
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async update(userId, id, input) {
      const address = normalizeAddress(input);
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await assertUser(connection, userId);
        const [existingRows] = await connection.execute(
          "SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ? FOR UPDATE",
          [id, userId],
        );
        const existing = existingRows[0];
        if (!existing) throw addressError(404, "Address was not found.");

        const [otherAddresses] = await connection.execute(
          "SELECT id, is_default FROM user_addresses WHERE user_id = ? AND id <> ? ORDER BY is_default DESC, id",
          [userId, id],
        );
        let isDefault = address.is_default;
        if (!isDefault && Number(existing.is_default)) {
          isDefault = otherAddresses.length === 0;
          if (!isDefault && !otherAddresses.some((item) => Number(item.is_default))) {
            await connection.execute(
              "UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
              [otherAddresses[0].id, userId],
            );
          }
        }
        if (isDefault) {
          await connection.execute(
            "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?",
            [userId],
          );
        }
        await connection.execute(
          `UPDATE user_addresses
           SET label = ?, customer_name = ?, customer_phone = ?, street_address = ?, city = ?,
               district = ?, state = ?, country = ?, zip_code = ?, is_default = ?
           WHERE id = ? AND user_id = ?`,
          [
            address.label,
            address.customer_name,
            address.customer_phone,
            address.street_address,
            address.city,
            address.district,
            address.state,
            address.country,
            address.zip_code,
            isDefault ? 1 : 0,
            id,
            userId,
          ],
        );
        await connection.commit();
        const addresses = await listForUser(userId);
        return addresses.find((item) => Number(item.id) === Number(id));
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async setDefault(userId, id) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await assertUser(connection, userId);
        const [addresses] = await connection.execute(
          "SELECT id FROM user_addresses WHERE id = ? AND user_id = ? FOR UPDATE",
          [id, userId],
        );
        if (!addresses.length) throw addressError(404, "Address was not found.");
        await connection.execute(
          "UPDATE user_addresses SET is_default = 0 WHERE user_id = ?",
          [userId],
        );
        await connection.execute(
          "UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
          [id, userId],
        );
        await connection.commit();
        const result = await listForUser(userId);
        return result.find((item) => Number(item.id) === Number(id));
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async delete(userId, id) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await assertUser(connection, userId);
        const [addresses] = await connection.execute(
          "SELECT id, is_default FROM user_addresses WHERE id = ? AND user_id = ? FOR UPDATE",
          [id, userId],
        );
        const address = addresses[0];
        if (!address) throw addressError(404, "Address was not found.");
        const [others] = await connection.execute(
          "SELECT id FROM user_addresses WHERE user_id = ? AND id <> ? ORDER BY id",
          [userId, id],
        );
        await connection.execute(
          "DELETE FROM user_addresses WHERE id = ? AND user_id = ?",
          [id, userId],
        );
        if (Number(address.is_default) && others[0]) {
          await connection.execute(
            "UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?",
            [others[0].id, userId],
          );
        }
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}

module.exports = { createUserAddressService, normalizeAddress };
