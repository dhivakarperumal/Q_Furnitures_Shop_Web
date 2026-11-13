const BANNER_COLUMNS = "id, title, image_url AS imageUrl, link_url AS linkUrl, status, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt";

function createBannerService(pool) {
  return {
    async list() {
      const [rows] = await pool.execute(
        `SELECT ${BANNER_COLUMNS} FROM banners ORDER BY sort_order ASC, created_at DESC, id DESC`,
      );
      return rows;
    },

    async create(banner) {
      const [result] = await pool.execute(
        `INSERT INTO banners (title, image_url, link_url, status, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [banner.title, banner.imageUrl, banner.linkUrl, banner.status, banner.sortOrder],
      );
      return result.insertId;
    },

    async update(id, banner) {
      const [result] = await pool.execute(
        `UPDATE banners
         SET title = ?, image_url = ?, link_url = ?, status = ?, sort_order = ?
         WHERE id = ?`,
        [banner.title, banner.imageUrl, banner.linkUrl, banner.status, banner.sortOrder, id],
      );
      return result.affectedRows > 0;
    },

    async delete(id) {
      const [result] = await pool.execute(
        "DELETE FROM banners WHERE id = ?",
        [id],
      );
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createBannerService };
