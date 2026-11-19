const COUPON_COLUMNS = [
  "id",
  "code",
  "name",
  "description",
  "discount_type",
  "discount_value",
  "min_order_value",
  "DATE_FORMAT(start_date, '%Y-%m-%dT%H:%i') AS start_date",
  "DATE_FORMAT(expiry_date, '%Y-%m-%dT%H:%i') AS expiry_date",
  "usage_limit_global",
  "usage_limit_per_customer",
  "usage_count",
  "status",
  "coupon_scope",
  "applicable_product_ids",
  "applicable_category_ids",
  "applicable_subcategory_ids",
  "created_at",
  "updated_at",
].join(", ");

function createCouponService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute(
      `SELECT ${COUPON_COLUMNS} FROM coupons WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  return {
    async list() {
      const [rows] = await pool.execute(
        `SELECT ${COUPON_COLUMNS} FROM coupons ORDER BY created_at DESC, id DESC`,
      );
      return rows;
    },

    getById,

    async create(coupon) {
      const [result] = await pool.execute(
        `INSERT INTO coupons
         (code, name, description, discount_type, discount_value, min_order_value,
          start_date, expiry_date, usage_limit_global, usage_limit_per_customer, status,
          coupon_scope, applicable_product_ids, applicable_category_ids, applicable_subcategory_ids)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          coupon.code,
          coupon.name,
          coupon.description,
          coupon.discount_type,
          coupon.discount_value,
          coupon.min_order_value,
          coupon.start_date,
          coupon.expiry_date,
          coupon.usage_limit_global,
          coupon.usage_limit_per_customer,
          coupon.status,
          coupon.coupon_scope,
          JSON.stringify(coupon.applicable_product_ids),
          JSON.stringify(coupon.applicable_category_ids),
          JSON.stringify(coupon.applicable_subcategory_ids),
        ],
      );
      return getById(result.insertId);
    },

    async update(id, coupon) {
      await pool.execute(
        `UPDATE coupons
         SET code = ?, name = ?, description = ?, discount_type = ?, discount_value = ?,
             min_order_value = ?, start_date = ?, expiry_date = ?, usage_limit_global = ?,
             usage_limit_per_customer = ?, status = ?, coupon_scope = ?,
             applicable_product_ids = ?, applicable_category_ids = ?, applicable_subcategory_ids = ?
         WHERE id = ?`,
        [
          coupon.code,
          coupon.name,
          coupon.description,
          coupon.discount_type,
          coupon.discount_value,
          coupon.min_order_value,
          coupon.start_date,
          coupon.expiry_date,
          coupon.usage_limit_global,
          coupon.usage_limit_per_customer,
          coupon.status,
          coupon.coupon_scope,
          JSON.stringify(coupon.applicable_product_ids),
          JSON.stringify(coupon.applicable_category_ids),
          JSON.stringify(coupon.applicable_subcategory_ids),
          id,
        ],
      );
      return getById(id);
    },

    async delete(id) {
      const [result] = await pool.execute("DELETE FROM coupons WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createCouponService };
