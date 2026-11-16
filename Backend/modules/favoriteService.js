const { toProduct } = require("./productService");

function getStoredProductDetails(value) {
  const details = typeof value === "string" ? JSON.parse(value) : value;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    throw new Error("Stored favorite product details must be a JSON object.");
  }
  return details;
}

function createFavoriteService(pool) {
  return {
    async listByUser(userId) {
      const [rows] = await pool.execute(
        `SELECT favorites.product_id, favorites.product_name, favorites.product_details
         FROM user_favorites favorites
         INNER JOIN products p ON p.id = favorites.product_id
         WHERE favorites.user_id = ? AND p.status = 'Active'
         ORDER BY favorites.created_at DESC, favorites.product_id DESC`,
        [userId],
      );

      return rows.map((row) => {
        const product = getStoredProductDetails(row.product_details);
        const firstImage = Array.isArray(product.images) ? product.images[0] : null;
        const firstVariant = Array.isArray(product.variants) ? product.variants[0] : null;
        return {
          ...product,
          id: Number(row.product_id),
          product_id: Number(row.product_id),
          name: row.product_name,
          price: Number(product.offer_price ?? product.selling_price ?? 0),
          image: product.image || firstImage || firstVariant?.image || firstVariant?.images?.[0] || null,
        };
      });
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

      const product = toProduct(products[0]);
      await pool.execute(
        `INSERT INTO user_favorites (user_id, product_id, product_name, product_details)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           product_name = VALUES(product_name),
           product_details = VALUES(product_details)`,
        [userId, productId, product.name, JSON.stringify(product)],
      );
      return true;
    },

    async remove(userId, productId) {
      const [result] = await pool.execute(
        "DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?",
        [userId, productId],
      );
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createFavoriteService };
