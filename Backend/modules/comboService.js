function comboError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseData(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Stored combo data must be a JSON object.");
  }
  return parsed;
}

function toCombo(row) {
  const data = parseData(row.combo_data);
  return {
    ...data,
    id: row.id,
    legacy_product_id: row.legacy_product_id == null ? null : Number(row.legacy_product_id),
    combo_code: row.combo_code || "",
    product_code: row.combo_code || "",
    name: row.name,
    category: row.category,
    subcategory: row.subcategory || "",
    mrp: Number(row.mrp),
    offer: Number(row.offer),
    offer_type: row.offer_type,
    offer_price: Number(row.offer_price),
    selling_price: Number(row.selling_price),
    total_stock: Number(row.total_stock),
    rating: Number(row.rating),
    status: row.status,
    product_type: "Combo Product",
    combo_items: Array.isArray(data.combo_items) ? data.combo_items : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateCombo(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw comboError("Combo data must be an object.");
  }
  const name = String(input.name || "").trim();
  const category = String(input.category || "").trim();
  if (!name || name.length > 191) throw comboError("Combo name is required and must be 191 characters or fewer.");
  if (!category || category.length > 191) throw comboError("Combo category is required and must be 191 characters or fewer.");

  const status = input.status || "Active";
  if (!["Active", "Inactive", "Draft"].includes(status)) {
    throw comboError("Combo status must be Active, Inactive, or Draft.");
  }
  const offerType = input.offer_type || "Percentage";
  if (!["Percentage", "Fixed Amount"].includes(offerType)) {
    throw comboError("Combo discount type must be Percentage or Fixed Amount.");
  }
  const offer = Number(input.offer || 0);
  if (!Number.isFinite(offer) || offer < 0 || (offerType === "Percentage" && offer > 100)) {
    throw comboError("Combo discount value is outside the allowed range.");
  }
  const rating = Number(input.rating ?? 5);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw comboError("Combo rating must be between 1 and 5.");
  }
  if (!Array.isArray(input.combo_items) || input.combo_items.length < 2) {
    throw comboError("A combo must include at least two products.");
  }
  const seenIds = new Set();
  const comboItems = input.combo_items.map((item, index) => {
    const productId = Number(item?.product_id);
    const quantity = Number(item?.quantity);
    const variantIndex = Number(item?.variant_index || 0);
    if (!Number.isSafeInteger(productId) || productId < 1) {
      throw comboError(`Combo item ${index + 1} has an invalid product.`);
    }
    if (seenIds.has(productId)) throw comboError("A product cannot be added to a combo more than once.");
    seenIds.add(productId);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw comboError(`Combo item ${index + 1} quantity must be between 1 and 10,000.`);
    }
    if (!Number.isSafeInteger(variantIndex) || variantIndex < 0) {
      throw comboError(`Combo item ${index + 1} has an invalid variant.`);
    }
    return {
      product_id: productId,
      quantity,
      variant_index: variantIndex,
      variant_color: String(item.variant_color || "").trim(),
      variant_size: String(item.variant_size || "").trim(),
      variant_material: String(item.variant_material || "").trim(),
    };
  });

  return {
    ...input,
    name,
    category,
    subcategory: String(input.subcategory || "").trim(),
    status,
    rating,
    offer,
    offer_type: offerType,
    offer_price_mode: input.offer_price_mode === "manual" ? "manual" : "auto",
    combo_items: comboItems,
  };
}

function getComponentPrice(product, item) {
  const data = parseData(product.product_data);
  const variants = Array.isArray(data.variants) ? data.variants : [];
  const variant = variants[item.variant_index];
  if (variants.length && !variant) {
    throw comboError(`The selected variant for ${product.name} is no longer available.`);
  }
  const price = Number(
    variant?.selling_price ?? variant?.offer_price ?? product.selling_price ??
    product.offer_price ?? product.mrp,
  );
  if (!Number.isFinite(price) || price < 0) {
    throw comboError(`Could not determine the price for ${product.name}.`);
  }
  return price;
}

function getComponentStock(product, item) {
  const totalStock = Number(product.available_stock || 0);
  if (totalStock <= 0) return 0;
  const data = parseData(product.product_data);
  const variant = Array.isArray(data.variants) ? data.variants[item.variant_index] : null;
  if (variant?.sizesStock && item.variant_size &&
      Object.prototype.hasOwnProperty.call(variant.sizesStock, item.variant_size)) {
    return Math.min(totalStock, Number(variant.sizesStock[item.variant_size]) || 0);
  }
  if (variant?.stock != null) return Math.min(totalStock, Number(variant.stock) || 0);
  return totalStock;
}

function createComboService(pool) {
  async function getById(id, executor = pool) {
    const [rows] = await executor.execute("SELECT * FROM combos WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? toCombo(rows[0]) : null;
  }

  async function generateCode(executor = pool) {
    const prefix = `QFC-${new Date().getFullYear()}-`;
    const [rows] = await executor.execute(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(combo_code, '-', -1) AS UNSIGNED)), 0) AS lastSequence
       FROM combos WHERE combo_code LIKE ?`,
      [`${prefix}%`],
    );
    let sequence = Number(rows[0]?.lastSequence || 0) + 1;
    for (let attempt = 0; attempt < 10000; attempt += 1) {
      const code = `${prefix}${String(sequence).padStart(5, "0")}`;
      const [matches] = await executor.execute("SELECT id FROM combos WHERE combo_code = ? LIMIT 1", [code]);
      if (!matches.length) return code;
      sequence += 1;
    }
    throw new Error("Could not generate an available combo code.");
  }

  async function save(id, input, actor) {
    const combo = validateCombo(input);
    const connection = await pool.getConnection();
    let savedId = id;
    try {
      await connection.beginTransaction();
      const [products] = await connection.execute(
        `SELECT p.id, p.name, p.product_data, p.mrp, p.offer_price, p.selling_price,
                COALESCE(ps.available_stock, p.total_stock) AS available_stock
         FROM products p
         LEFT JOIN product_stock ps ON ps.product_id = p.id
         WHERE p.id IN (${combo.combo_items.map(() => "?").join(",")})
         ORDER BY p.id FOR UPDATE`,
        combo.combo_items.map((item) => item.product_id),
      );
      const productById = new Map(products.map((product) => [Number(product.id), product]));
      if (products.length !== combo.combo_items.length) {
        throw comboError("One or more selected products no longer exist.", 409);
      }

      const totalPrice = combo.combo_items.reduce((total, item) => {
        const product = productById.get(item.product_id);
        const data = parseData(product.product_data);
        if (data.status && data.status !== "Active") {
          throw comboError(`${product.name} is no longer active and cannot be added to a combo.`, 409);
        }
        return total + getComponentPrice(product, item) * item.quantity;
      }, 0);
      if (totalPrice <= 0) throw comboError("Combo products must have a total price greater than zero.");
      const calculatedPrice = Math.max(
        0,
        combo.offer_type === "Percentage"
          ? totalPrice * (1 - combo.offer / 100)
          : totalPrice - combo.offer,
      );
      const offerPrice = combo.offer_price_mode === "manual"
        ? Number(combo.offer_price)
        : calculatedPrice;
      if (!Number.isFinite(offerPrice) || offerPrice < 0 || offerPrice > totalPrice) {
        throw comboError("Final combo price must be between zero and its original total.");
      }
      const totalStock = combo.combo_items.length
        ? Math.min(...combo.combo_items.map((item) =>
          Math.floor(getComponentStock(productById.get(item.product_id), item) / item.quantity),
        ))
        : 0;
      const comboCode = id
        ? String(combo.combo_code || combo.product_code || "").trim() || await generateCode(connection)
        : await generateCode(connection);
      if (comboCode.length > 128) throw comboError("Combo code must be 128 characters or fewer.");

      const data = {
        ...combo,
        combo_code: comboCode,
        product_code: comboCode,
        mrp: Number(totalPrice.toFixed(2)),
        offer_price: Number(offerPrice.toFixed(2)),
        selling_price: Number(offerPrice.toFixed(2)),
        total_stock: totalStock,
        rating: Number(combo.rating.toFixed(1)),
        created_by: combo.created_by || actor || null,
      };
      const values = [
        comboCode,
        combo.name,
        combo.category,
        combo.subcategory || null,
        data.mrp,
        combo.offer,
        combo.offer_type,
        data.offer_price,
        data.selling_price,
        totalStock,
        data.rating,
        combo.status,
        JSON.stringify(data),
      ];

      if (id) {
        const [existing] = await connection.execute("SELECT id FROM combos WHERE id = ? FOR UPDATE", [id]);
        if (!existing.length) throw comboError("Combo was not found.", 404);
        await connection.execute(
          `UPDATE combos SET combo_code = ?, name = ?, category = ?, subcategory = ?, mrp = ?,
             offer = ?, offer_type = ?, offer_price = ?, selling_price = ?, total_stock = ?,
             rating = ?, status = ?, combo_data = ? WHERE id = ?`,
          [...values, id],
        );
      } else {
        const [result] = await connection.execute(
          `INSERT INTO combos
           (combo_code, name, category, subcategory, mrp, offer, offer_type, offer_price,
            selling_price, total_stock, rating, status, combo_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          values,
        );
        savedId = result.insertId;
      }
      await connection.commit();
      return getById(savedId, connection);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return {
    async list({ page = 1, limit = 25, search = "", status = "All", legacyProductId = null } = {}) {
      const filters = [];
      const parameters = [];
      if (legacyProductId) {
        filters.push("legacy_product_id = ?");
        parameters.push(legacyProductId);
      }
      if (search) {
        filters.push("(name LIKE ? OR combo_code LIKE ? OR category LIKE ?)");
        const term = `%${search}%`;
        parameters.push(term, term, term);
      }
      if (status !== "All") {
        filters.push("status = ?");
        parameters.push(status);
      }
      const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const offset = (page - 1) * limit;
      const [rows] = await pool.execute(
        `SELECT * FROM combos ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...parameters, limit, offset],
      );
      const [countRows] = await pool.execute(`SELECT COUNT(*) AS total FROM combos ${where}`, parameters);
      const total = Number(countRows[0]?.total || 0);
      const [statsRows] = await pool.execute(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(status = 'Active'), 0) AS active,
                COALESCE(SUM(status = 'Inactive'), 0) AS inactive,
                COALESCE(SUM(total_stock > 0 AND total_stock <= 5), 0) AS lowStock
         FROM combos`,
      );
      const stats = statsRows[0] || {};
      return {
        combos: rows.map(toCombo),
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
        stats: {
          total: Number(stats.total || 0),
          active: Number(stats.active || 0),
          inactive: Number(stats.inactive || 0),
          lowStock: Number(stats.lowStock || 0),
        },
      };
    },
    getById,
    generateCode,
    async create(input, actor) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await save(null, input, actor);
        } catch (error) {
          if (error.code !== "ER_DUP_ENTRY" || attempt === 2) throw error;
        }
      }
      throw new Error("Could not generate an available combo code.");
    },
    update(id, input, actor) {
      return save(id, input, actor);
    },
    async delete(id) {
      const [result] = await pool.execute("DELETE FROM combos WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createComboService, toCombo, validateCombo };
