const OFFER_COLUMNS = [
  "id",
  "title",
  "offer_percentage",
  "description",
  "icon",
  "status",
  "show_in_header",
  "created_at",
  "updated_at",
].join(", ");

function createOfferService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute(
      `SELECT ${OFFER_COLUMNS} FROM offers WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  return {
    async list() {
      const [rows] = await pool.execute(
        `SELECT ${OFFER_COLUMNS} FROM offers ORDER BY created_at DESC, id DESC`,
      );
      return rows;
    },

    async listHeaderOffers() {
      const [rows] = await pool.execute(
        `SELECT ${OFFER_COLUMNS} FROM offers
         WHERE status = 'active' AND show_in_header = 1
         ORDER BY updated_at DESC, id DESC`,
      );
      return rows;
    },

    getById,

    async create(offer) {
      const [result] = await pool.execute(
        `INSERT INTO offers (title, offer_percentage, description, icon, status, show_in_header)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          offer.title,
          offer.offer_percentage,
          offer.description,
          offer.icon,
          offer.status,
          offer.show_in_header ? 1 : 0,
        ],
      );
      return getById(result.insertId);
    },

    async update(id, offer) {
      await pool.execute(
        `UPDATE offers
         SET title = ?, offer_percentage = ?, description = ?, icon = ?, status = ?, show_in_header = ?
         WHERE id = ?`,
        [
          offer.title,
          offer.offer_percentage,
          offer.description,
          offer.icon,
          offer.status,
          offer.show_in_header ? 1 : 0,
          id,
        ],
      );
      return getById(id);
    },

    async updateHeaderVisibility(id, showInHeader) {
      await pool.execute(
        "UPDATE offers SET show_in_header = ? WHERE id = ?",
        [showInHeader ? 1 : 0, id],
      );
      return getById(id);
    },

    async delete(id) {
      const [result] = await pool.execute("DELETE FROM offers WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createOfferService };
