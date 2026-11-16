const { toProduct } = require("./productService");

function createFavoriteService(pool) {
  return {
    async listByUser(userId) {
      const [rows] = await pool.execute(
        `SELECT p.*, ps.available_stock, ps.reserved_stock, ps.damaged_stock,
                ps.minimum_stock, ps.stock_type, ps.deduction_rule
         FROM user_favorites favorites
         INNER JOIN products p ON p.id = favorites.product_id
         LEFT JOIN product_stock ps ON ps.product_id = p.id
         WHERE favorites.user_id = ? AND p.status = 'Active'
         ORDER BY favorites.created_at DESC, favorites.product_id DESC`,
        [userId],
      );

      return rows.map((row) => {
        const product = toProduct(row);
        const firstImage = Array.isArray(product.images) ? product.images[0] : null;
        const firstVariant = Array.isArray(product.variants) ? product.variants[0] : null;
        return {
          ...product,
          product_id: product.id,
          price: Number(product.offer_price ?? product.selling_price ?? 0),
          image: product.image || firstImage || firstVariant?.image || firstVariant?.images?.[0] || null,
        };
      });
    },

    async add(userId, productId) {
      const [products] = await pool.execute(
        "SELECT id FROM products WHERE id = ? AND status = 'Active' LIMIT 1",
        [productId],
      );
      if (!products.length) return false;

      try {
        await pool.execute(
          "INSERT INTO user_favorites (user_id, product_id) VALUES (?, ?)",
          [userId, productId],
        );
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;
      }
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
