const { toProduct } = require("./productService");
const { PRODUCT_SNAPSHOT_FIELDS } = require("./productSnapshotFields");

function getFavoriteProduct(product) {
  const specifications = product.specifications || {};
  const shipping = product.shipping || {};
  const images = Array.isArray(product.images) ? product.images : [];
  return {
    ...product,
    image: (typeof product.image === "string" && product.image) ||
      images[Number(product.main_image_index) || 0] || images[0] || null,
    material_type: product.material_type || specifications.materialType,
    wood_type: product.wood_type || specifications.woodType,
    colour: product.colour || specifications.colour,
    finish_type: product.finish_type || specifications.finishType,
    height: product.height ?? specifications.height,
    width: product.width ?? specifications.width,
    depth: product.depth ?? specifications.depth,
    weight: product.weight ?? specifications.weight,
    seating_capacity: product.seating_capacity ?? specifications.seatingCapacity,
    doors: product.doors ?? specifications.doors,
    drawers: product.drawers ?? specifications.drawers,
    mattress_size: product.mattress_size || specifications.mattressSize,
    warranty_period: product.warranty_period || specifications.warrantyPeriod,
    country_of_origin: product.country_of_origin || specifications.countryOfOrigin,
    package_length: product.package_length ?? shipping.packageLength,
    package_width: product.package_width ?? shipping.packageWidth,
    package_height: product.package_height ?? shipping.packageHeight,
    delivery_available: product.delivery_available ?? shipping.deliveryAvailable,
    delivery_charges: product.delivery_charges ?? shipping.deliveryCharges,
    free_delivery: product.free_delivery ?? shipping.freeDelivery,
    estimated_delivery_days: product.estimated_delivery_days ?? shipping.estimatedDeliveryDays,
    assembly_required: product.assembly_required ?? shipping.assemblyRequired,
    installation_available: product.installation_available ?? shipping.installationAvailable,
    return_policy: product.return_policy || shipping.returnPolicy,
  };
}

function getFieldValue(value) {
  return value === "" || value == null ? null : value;
}

function parseComboData(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Stored combo data must be a JSON object.");
  }
  return parsed;
}

function getFavoriteCombo(row) {
  const combo = parseComboData(row.combo_data);
  const images = Array.isArray(combo.images)
    ? combo.images
    : typeof combo.images === "string"
      ? (() => {
        try {
          const parsed = JSON.parse(combo.images);
          return Array.isArray(parsed) ? parsed : [combo.images];
        } catch {
          return [combo.images];
        }
      })()
      : [];
  const image = combo.image || images[Number(combo.main_image_index) || 0] || images[0] || null;
  const comboId = Number(row.combo_id);

  return {
    ...combo,
    id: `combo-${comboId}`,
    item_type: "combo",
    combo_id: comboId,
    combo_code: row.combo_code || "",
    name: row.name,
    category: row.category,
    subcategory: row.subcategory || "",
    mrp: Number(row.mrp) || 0,
    offer_price: Number(row.offer_price) || 0,
    selling_price: Number(row.selling_price) || 0,
    price: Number(row.offer_price ?? row.selling_price) || 0,
    rating: Number(row.rating) || 0,
    status: row.status,
    image,
    images,
    created_at: row.created_at,
  };
}

function createFavoriteService(pool) {
  return {
    async listByUser(userId) {
      const [[products], [combos]] = await Promise.all([
        pool.execute(
          `SELECT favorites.*
           FROM \`wishlist\` favorites
           INNER JOIN products p ON p.id = favorites.product_id
           WHERE favorites.user_id = ? AND p.status = 'Active'
           ORDER BY favorites.created_at DESC, favorites.product_id DESC`,
          [userId],
        ),
        pool.execute(
          `SELECT favorites.combo_id, favorites.created_at, combos.combo_code, combos.name,
                  combos.category, combos.subcategory, combos.mrp, combos.offer_price,
                  combos.selling_price, combos.rating, combos.status, combos.combo_data
           FROM combo_favorites favorites
           INNER JOIN combos ON combos.id = favorites.combo_id
           WHERE favorites.user_id = ? AND combos.status = 'Active'
           ORDER BY favorites.created_at DESC, favorites.combo_id DESC`,
          [userId],
        ),
      ]);

      return [
        ...products.map((favorite) => ({
          ...favorite,
          id: Number(favorite.product_id),
          item_type: "product",
          product_id: Number(favorite.product_id),
          name: favorite.product_name,
          price: Number(favorite.offer_price ?? favorite.selling_price ?? 0),
        })),
        ...combos.map(getFavoriteCombo),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    async add(userId, productId) {
      const [products] = await pool.execute(
        `SELECT p.*, ps.available_stock, ps.reserved_stock, ps.damaged_stock,
                ps.minimum_stock, ps.stock_type, ps.deduction_rule
         FROM products p
         LEFT JOIN product_stock ps ON ps.product_id = p.id
         WHERE p.id = ? AND p.status = 'Active'
         LIMIT 1`,
        [productId],
      );
      if (!products.length) return false;

      const product = getFavoriteProduct(toProduct(products[0]));
      const fieldNames = PRODUCT_SNAPSHOT_FIELDS.map(([column]) => column);
      const insertColumns = ["user_id", "product_id", ...fieldNames, "created_by", "updated_by"];
      const values = [
        userId,
        productId,
        ...PRODUCT_SNAPSHOT_FIELDS.map(([, , key]) => getFieldValue(product[key])),
        userId,
        userId,
      ];
      const updates = [
        ...fieldNames.map((column) => `${column} = VALUES(${column})`),
        "updated_by = VALUES(updated_by)",
        "updated_at = CURRENT_TIMESTAMP",
      ];

      await pool.execute(
        `INSERT INTO \`wishlist\` (${insertColumns.join(", ")})
         VALUES (${insertColumns.map(() => "?").join(", ")})
         ON DUPLICATE KEY UPDATE ${updates.join(", ")}`,
        values,
      );
      return true;
    },

    async remove(userId, productId) {
      const [result] = await pool.execute(
        "DELETE FROM `wishlist` WHERE user_id = ? AND product_id = ?",
        [userId, productId],
      );
      return result.affectedRows > 0;
    },

    async addCombo(userId, comboId) {
      const [combos] = await pool.execute(
        "SELECT id FROM combos WHERE id = ? AND status = 'Active' LIMIT 1",
        [comboId],
      );
      if (!combos.length) return false;

      await pool.execute(
        `INSERT INTO combo_favorites (user_id, combo_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE combo_id = VALUES(combo_id)`,
        [userId, comboId],
      );
      return true;
    },

    async removeCombo(userId, comboId) {
      const [result] = await pool.execute(
        "DELETE FROM combo_favorites WHERE user_id = ? AND combo_id = ?",
        [userId, comboId],
      );
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createFavoriteService };
