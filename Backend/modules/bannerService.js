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
const BANNER_COLUMNS = [
  "id",
  "title",
  "subtitle",
  "description",
  "offer",
  "destination_link",
  "destination_links",
  "target_section",
  "is_published",
  "desktop_image",
  "mobile_image",
  "created_at",
  "updated_at",
].join(", ");

function createBannerService(pool) {
  const getById = async (id) => {
    const [rows] = await pool.execute(
      `SELECT ${BANNER_COLUMNS} FROM banners WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  };

  return {
    async list() {
      const [rows] = await pool.execute(
        `SELECT ${BANNER_COLUMNS} FROM banners ORDER BY created_at DESC, id DESC`,
      );
      return rows;
    },

    getById,

    async create(banner) {
      const [result] = await pool.execute(
        `INSERT INTO banners
         (title, subtitle, description, offer, destination_link, destination_links, target_section, is_published,
          desktop_image, mobile_image, image_url, link_url, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          banner.title,
          banner.subtitle,
          banner.description,
          banner.offer,
          banner.destination_link,
          JSON.stringify(banner.destination_links || []),
          banner.target_section,
          banner.is_published,
          banner.desktop_image,
          banner.mobile_image,
          banner.desktop_image,
          banner.destination_link || null,
          banner.is_published ? "Active" : "Inactive",
          0,
        ],
      );
      return getById(result.insertId);
    },

    async update(id, banner) {
      await pool.execute(
        `UPDATE banners
         SET title = ?, subtitle = ?, description = ?, offer = ?, destination_link = ?, destination_links = ?,
             target_section = ?, is_published = ?, desktop_image = ?, mobile_image = ?,
             image_url = ?, link_url = ?, status = ?
         WHERE id = ?`,
        [
          banner.title,
          banner.subtitle,
          banner.description,
          banner.offer,
          banner.destination_link,
          JSON.stringify(banner.destination_links || []),
          banner.target_section,
          banner.is_published,
          banner.desktop_image,
          banner.mobile_image,
          banner.desktop_image,
          banner.destination_link || null,
          banner.is_published ? "Active" : "Inactive",
          id,
        ],
      );
      return getById(id);
    },

    async delete(id) {
      const banner = await getById(id);
      if (!banner) return null;
      const [result] = await pool.execute("DELETE FROM banners WHERE id = ?", [id]);
      return result.affectedRows > 0 ? banner : null;
    },
  };
}

module.exports = { createBannerService };
