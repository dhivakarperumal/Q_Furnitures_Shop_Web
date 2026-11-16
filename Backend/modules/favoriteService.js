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

function createFavoriteService(pool) {
  return {
    async listByUser(userId) {
      const [favorites] = await pool.execute(
        `SELECT favorites.*
         FROM user_favorites favorites
         INNER JOIN products p ON p.id = favorites.product_id
         WHERE favorites.user_id = ? AND p.status = 'Active'
         ORDER BY favorites.created_at DESC, favorites.product_id DESC`,
        [userId],
      );

      return favorites.map((favorite) => ({
        ...favorite,
        id: Number(favorite.product_id),
        product_id: Number(favorite.product_id),
        name: favorite.product_name,
        price: Number(favorite.offer_price ?? favorite.selling_price ?? 0),
      }));
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
        `INSERT INTO user_favorites (${insertColumns.join(", ")})
         VALUES (${insertColumns.map(() => "?").join(", ")})
         ON DUPLICATE KEY UPDATE ${updates.join(", ")}`,
        values,
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
