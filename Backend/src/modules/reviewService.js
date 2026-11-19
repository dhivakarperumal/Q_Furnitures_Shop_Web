function createReviewService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute(
      `SELECT reviews.*, products.name AS product_name, combos.name AS combo_name
       FROM reviews
       LEFT JOIN products ON products.id = reviews.product_id
       LEFT JOIN combos ON combos.id = reviews.combo_id
       WHERE reviews.id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  return {
    async listPublished() {
      const [reviews] = await pool.execute(
        `SELECT reviews.id, reviews.product_id, reviews.combo_id, reviews.user_name, reviews.rating,
                reviews.comment, reviews.review_image, reviews.admin_reply, reviews.created_at,
                products.name AS product_name, combos.name AS combo_name
         FROM reviews
         LEFT JOIN products ON products.id = reviews.product_id
         LEFT JOIN combos ON combos.id = reviews.combo_id
         WHERE reviews.status = 'Published'
         ORDER BY reviews.created_at DESC, reviews.id DESC
         LIMIT 6`,
      );
      return reviews;
    },

    async listPublishedForProduct(productId) {
      const [reviews] = await pool.execute(
        `SELECT reviews.id, reviews.product_id, reviews.user_name, reviews.rating,
                reviews.comment, reviews.review_image, reviews.admin_reply, reviews.created_at
         FROM reviews
         WHERE reviews.status = 'Published' AND reviews.product_id = ?
         ORDER BY reviews.created_at DESC, reviews.id DESC`,
        [productId],
      );
      return reviews;
    },

    async listPublishedForCombo(comboId) {
      const [reviews] = await pool.execute(
        `SELECT reviews.id, reviews.combo_id, reviews.user_name, reviews.rating,
                reviews.comment, reviews.review_image, reviews.admin_reply, reviews.created_at
         FROM reviews
         WHERE reviews.status = 'Published' AND reviews.combo_id = ?
         ORDER BY reviews.created_at DESC, reviews.id DESC`,
        [comboId],
      );
      return reviews;
    },

    async getCustomerReview(productId, userId) {
      const [reviews] = await pool.execute(
        `SELECT reviews.id, reviews.status
         FROM reviews
         WHERE reviews.product_id = ? AND reviews.reviewer_user_id = ?
         LIMIT 1`,
        [productId, userId],
      );
      return reviews[0] || null;
    },

    async getCustomerComboReview(comboId, userId) {
      const [reviews] = await pool.execute(
        `SELECT reviews.id, reviews.status
         FROM reviews
         WHERE reviews.combo_id = ? AND reviews.reviewer_user_id = ?
         LIMIT 1`,
        [comboId, userId],
      );
      return reviews[0] || null;
    },

    async list({ status, rating, search }) {
      const filters = [];
      const parameters = [];

      if (status) {
        filters.push("reviews.status = ?");
        parameters.push(status);
      }
      if (rating) {
        filters.push("reviews.rating = ?");
        parameters.push(rating);
      }
      if (search) {
        const searchTerm = `%${search}%`;
        filters.push("(reviews.user_name LIKE ? OR reviews.user_email LIKE ? OR reviews.comment LIKE ? OR products.name LIKE ? OR combos.name LIKE ?)");
        parameters.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const [reviews] = await pool.execute(
        `SELECT reviews.*, products.name AS product_name, combos.name AS combo_name
         FROM reviews
         LEFT JOIN products ON products.id = reviews.product_id
         LEFT JOIN combos ON combos.id = reviews.combo_id
         ${whereClause}
         ORDER BY reviews.created_at DESC, reviews.id DESC`,
        parameters,
      );
      const [statsRows] = await pool.execute(
        `SELECT COUNT(*) AS total_reviews,
                COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating,
                COALESCE(SUM(status = 'Pending'), 0) AS pending_count
         FROM reviews`,
      );
      return { reviews, stats: statsRows[0] || {} };
    },

    getById,

    async create(review) {
      const [result] = await pool.execute(
        `INSERT INTO reviews (product_id, user_name, user_email, rating, comment, review_image)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          review.product_id,
          review.user_name,
          review.user_email,
          review.rating,
          review.comment,
          review.review_image,
        ],
      );
      return getById(result.insertId);
    },

    async createCustomer(review, userId) {
      const [result] = await pool.execute(
        `INSERT INTO reviews
           (product_id, reviewer_user_id, user_name, user_email, rating, comment, review_image)
         SELECT ?, users.id, users.username, users.email, ?, ?, ?
         FROM users
         WHERE users.id = ?`,
        [review.product_id, review.rating, review.comment, review.review_image, userId],
      );
      if (!result.affectedRows) return null;
      return getById(result.insertId);
    },

    async createCustomerCombo(review, userId) {
      const [result] = await pool.execute(
        `INSERT INTO reviews
           (combo_id, reviewer_user_id, user_name, user_email, rating, comment, review_image)
         SELECT ?, users.id, users.username, users.email, ?, ?, ?
         FROM users
         WHERE users.id = ?`,
        [review.combo_id, review.rating, review.comment, review.review_image, userId],
      );
      if (!result.affectedRows) return null;
      return getById(result.insertId);
    },

    async updateStatus(id, status) {
      await pool.execute("UPDATE reviews SET status = ? WHERE id = ?", [status, id]);
      return getById(id);
    },

    async updateReply(id, adminReply) {
      await pool.execute("UPDATE reviews SET admin_reply = ? WHERE id = ?", [adminReply, id]);
      return getById(id);
    },

    async delete(id) {
      const review = await getById(id);
      if (!review) return null;
      const [result] = await pool.execute("DELETE FROM reviews WHERE id = ?", [id]);
      return result.affectedRows > 0 ? review : null;
    },
  };
}

module.exports = { createReviewService };
