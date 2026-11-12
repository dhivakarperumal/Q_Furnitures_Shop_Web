const furnitureCategories = require("./furnitureCategories");

const CATEGORY_COLUMNS = "id, cat_id AS catId, name, description, subcategory, images, status, created_at, updated_at";
const DEFAULT_CATEGORIES_SEED_KEY = "default-furniture-categories-v1";

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

    async seedDefaults() {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        try {
          await connection.execute(
            "INSERT INTO app_seed_history (seed_key) VALUES (?)",
            [DEFAULT_CATEGORIES_SEED_KEY],
          );
        } catch (error) {
          if (error.code === "ER_DUP_ENTRY") {
            await connection.rollback();
            return;
          }
          throw error;
        }

        for (const category of furnitureCategories) {
          const catId = `CAT${String(category.id).padStart(3, "0")}`;
          try {
            await connection.execute(
              `INSERT INTO categories (cat_id, name, description, subcategory, images)
               VALUES (?, ?, ?, ?, ?)`,
              [
                catId,
                category.name,
                "",
                JSON.stringify(category.subcategories),
                JSON.stringify([]),
              ],
            );
          } catch (error) {
            if (error.code !== "ER_DUP_ENTRY") {
              throw error;
            }
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
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
