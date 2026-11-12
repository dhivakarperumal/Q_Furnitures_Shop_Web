const CATEGORY_COLUMNS = "id, cat_id AS catId, name, description, subcategory, images, status, created_at, updated_at";

function parseArray(value, fieldName) {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }

  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`Stored category ${fieldName} must be a JSON array.`);
  }
  return parsed;
}

function toCategory(row) {
  return {
    ...row,
    subcategory: parseArray(row.subcategory, "subcategories"),
    images: parseArray(row.images, "images"),
  };
}

function createCategoryService(pool) {
  return {
    async list() {
      const [rows] = await pool.execute(
        `SELECT ${CATEGORY_COLUMNS} FROM categories ORDER BY created_at DESC, id DESC`,
      );
      return rows.map(toCategory);
    },

    async create(category) {
      const [result] = await pool.execute(
        `INSERT INTO categories (cat_id, name, description, subcategory, images, user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          category.catId,
          category.name,
          category.description,
          JSON.stringify(category.subcategory),
          JSON.stringify(category.images),
          category.userId,
        ],
      );
      return result.insertId;
    },

    async update(catId, category) {
      const [result] = await pool.execute(
        `UPDATE categories
         SET name = ?, description = ?, subcategory = ?, images = ?
         WHERE cat_id = ?`,
        [
          category.name,
          category.description,
          JSON.stringify(category.subcategory),
          JSON.stringify(category.images),
          catId,
        ],
      );

      if (result.affectedRows > 0) {
        return true;
      }

      const [rows] = await pool.execute(
        "SELECT id FROM categories WHERE cat_id = ? LIMIT 1",
        [catId],
      );
      return rows.length > 0;
    },

    async delete(catId) {
      const [result] = await pool.execute(
        "DELETE FROM categories WHERE cat_id = ?",
        [catId],
      );
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createCategoryService };
