function createReviewService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute(
      `SELECT reviews.*, products.name AS product_name
       FROM reviews
       LEFT JOIN products ON products.id = reviews.product_id
       WHERE reviews.id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  return {
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
        filters.push("(reviews.user_name LIKE ? OR reviews.user_email LIKE ? OR reviews.comment LIKE ? OR products.name LIKE ?)");
        parameters.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const [reviews] = await pool.execute(
        `SELECT reviews.*, products.name AS product_name
         FROM reviews
         LEFT JOIN products ON products.id = reviews.product_id
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
