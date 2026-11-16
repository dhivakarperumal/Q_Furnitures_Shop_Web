const furnitureProducts = require("./furnitureProducts");
const { createStockService, getStockForUpdate } = require("./stockService");

const PRODUCT_COLUMNS = [
  "id",
  "product_code",
  "name",
  "category",
  "subcategory",
  "mrp",
  "offer",
  "offer_type",
  "offer_price",
  "selling_price",
  "total_stock",
  "rating",
  "status",
  "product_data",
  "created_at",
  "updated_at",
].map((column) => `p.${column}`).join(", ");

function parseProductData(value) {
  if (value == null) return {};
  if (typeof value === "object") return value;
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Stored product data must be a JSON object.");
  }
  return parsed;
}

function toProduct(row) {
  const data = parseProductData(row.product_data);
  const availableStock = Number(row.available_stock ?? row.total_stock ?? 0);
  const minimumStock = Number(row.minimum_stock ?? 5);
  return {
    ...data,
    id: row.id,
    product_code: row.product_code || "",
    name: row.name,
    category: row.category,
    subcategory: row.subcategory || "",
    mrp: row.mrp,
    offer: row.offer,
    offer_type: row.offer_type,
    offer_price: row.offer_price,
    selling_price: row.selling_price,
    total_stock: availableStock,
    available_stock: availableStock,
    reserved_stock: Number(row.reserved_stock || 0),
    damaged_stock: Number(row.damaged_stock || 0),
    minimum_stock: minimumStock,
    stock_type: row.stock_type || data.stock_type || "Ready-Made Furniture",
    deduction_rule: row.deduction_rule || data.deduction_rule || "deduct",
    rating: row.rating,
    status: row.status,
    inventory_status: availableStock <= 0
      ? "Out of Stock"
      : availableStock <= minimumStock
        ? "Low Stock"
        : "In Stock",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getSeedVariants(product) {
  const materialColors = {
    "Solid Wood": ["Walnut Brown", "Natural Teak"],
    "Engineered Wood": ["White", "Oak"],
    Upholstered: ["Beige", "Grey"],
    Plywood: ["White", "Natural Oak"],
    Metal: ["Black", "Charcoal"],
  };
  const baseColor = product.colour || "Natural";
  const alternateColor = (materialColors[product.material_type] || ["Natural", "Walnut"])
    .find((color) => color.toLowerCase() !== baseColor.toLowerCase()) || "Natural";
  const name = product.name.toLowerCase();
  let sizes = ["Standard", "Large"];

  if (name.includes("mattress") || /\bbed\b/.test(name)) {
    sizes = ["Queen", "King"];
  } else if (name.includes("dining")) {
    sizes = ["4 Seater", "6 Seater"];
  } else if (name.includes("sofa")) {
    const capacity = Number(product.seating_capacity) || 5;
    sizes = [`${Math.max(2, capacity - 2)} Seater`, `${capacity} Seater`];
  } else if (name.includes("chair")) {
    sizes = ["Standard", "Wide"];
  }

  const stock = Number(product.total_stock) || 0;
  const firstVariantStock = Math.floor(stock / 2);
  const colors = [baseColor, alternateColor];

  return colors.map((color, index) => {
    const mrp = Number(product.mrp);
    const offer = Number(product.offer) || 0;
    const sellingPrice = Math.max(
      0,
      product.offer_type === "Percentage" ? mrp * (1 - offer / 100) : mrp - offer,
    );
    return {
      color,
      size: sizes[index],
      material: product.material_type,
      mrp,
      offer_type: product.offer_type,
      offer,
      selling_price: Number(sellingPrice.toFixed(2)),
      stock: index === 0 ? firstVariantStock : stock - firstVariantStock,
      image: "",
      images: [],
    };
  });
}

function createProductService(pool) {
  const stockService = createStockService(pool);

  async function getById(id) {
    const [rows] = await pool.execute(
      `SELECT ${PRODUCT_COLUMNS}, ps.available_stock, ps.reserved_stock, ps.damaged_stock,
              ps.minimum_stock, ps.stock_type, ps.deduction_rule
       FROM products p LEFT JOIN product_stock ps ON ps.product_id = p.id
       WHERE p.id = ? LIMIT 1`,
      [id],
    );
    return rows[0] ? toProduct(rows[0]) : null;
  }

  async function generateCode() {
    const year = new Date().getFullYear();
    const prefix = `QF-${year}-`;
    const [rows] = await pool.execute(
      `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(product_code, '-', -1) AS UNSIGNED)), 0) AS lastSequence
       FROM products
       WHERE product_code LIKE ?`,
      [`${prefix}%`],
    );
    let nextSequence = Number(rows[0]?.lastSequence || 0) + 1;

    for (let attempt = 0; attempt < 10000; attempt += 1) {
      const productCode = `${prefix}${String(nextSequence).padStart(5, "0")}`;
      const [matches] = await pool.execute(
        "SELECT id FROM products WHERE product_code = ? LIMIT 1",
        [productCode],
      );
      if (!matches.length) return productCode;
      nextSequence += 1;
    }

    throw new Error("Could not generate an available product SKU.");
  }

  async function save(product, actor) {
    const values = [
      product.product_code || null,
      product.name,
      product.category,
      product.subcategory || null,
      product.mrp,
      product.offer,
      product.offer_type,
      product.offer_price,
      product.selling_price,
      product.total_stock,
      product.rating,
      product.status,
      JSON.stringify(product.data),
    ];

    const connection = await pool.getConnection();
    let productId = product.id;
    try {
      await connection.beginTransaction();
      if (product.id) {
        const existingStock = await getStockForUpdate(connection, product.id);
        if (!existingStock) {
          const error = new Error("Product was not found.");
          error.status = 404;
          throw error;
        }
        await connection.execute(
          `UPDATE products
           SET product_code = ?, name = ?, category = ?, subcategory = ?, mrp = ?,
               offer = ?, offer_type = ?, offer_price = ?, selling_price = ?, total_stock = ?,
               rating = ?, status = ?, product_data = ?
           WHERE id = ?`,
          [
            ...values.slice(0, 9),
            Number(existingStock.available_stock),
            ...values.slice(10),
            product.id,
          ],
        );
        await stockService.changeProductStock(connection, {
          productId: product.id,
          quantity: product.total_stock,
          productData: product.data,
          reason: "Product management stock update",
          actor,
        });
      } else {
        const newValues = [...values];
        newValues[9] = 0;
        const [result] = await connection.execute(
          `INSERT INTO products
           (product_code, name, category, subcategory, mrp, offer, offer_type, offer_price,
            selling_price, total_stock, rating, status, product_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          newValues,
        );
        productId = result.insertId;
        await stockService.initializeProduct(connection, {
          productId,
          quantity: product.total_stock,
          productData: product.data,
          actor,
        });
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return getById(productId);
  }

  return {
    async seedFurnitureProducts() {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        try {
          await connection.execute(
            "INSERT INTO app_seed_history (seed_key) VALUES (?)",
            ["sample-furniture-products-v1"],
          );
        } catch (error) {
          if (error.code === "ER_DUP_ENTRY") {
            await connection.rollback();
            return 0;
          }
          throw error;
        }

        let inserted = 0;
        for (const product of furnitureProducts) {
          const [existing] = await connection.execute(
            "SELECT id FROM products WHERE product_code = ? LIMIT 1",
            [product.product_code],
          );
          if (existing.length) continue;

          const mrp = Number(product.mrp);
          const offer = Number(product.offer) || 0;
          const offerPrice = Math.max(
            0,
            product.offer_type === "Percentage" ? mrp * (1 - offer / 100) : mrp - offer,
          );
          const data = {
            ...product,
            product_type: "Variable Product",
            status: "Active",
            rating: 5,
            offer_price: Number(offerPrice.toFixed(2)),
            selling_price: Number(offerPrice.toFixed(2)),
            variants: getSeedVariants(product),
            images: [],
            image_roles: [],
            main_image_index: 0,
          };

          const [insertResult] = await connection.execute(
            `INSERT INTO products
             (product_code, name, category, subcategory, mrp, offer, offer_type, offer_price,
              selling_price, total_stock, rating, status, product_data)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              product.product_code,
              product.name,
              product.category,
              product.subcategory,
              mrp,
              offer,
              product.offer_type,
              offerPrice,
              offerPrice,
              0,
              5,
              "Active",
              JSON.stringify(data),
            ],
          );
          await stockService.initializeProduct(connection, {
            productId: insertResult.insertId,
            quantity: Number(product.total_stock) || 0,
            productData: data,
            actor: "system-seed",
          });
          inserted += 1;
        }

        await connection.commit();
        return inserted;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async list({ page, limit, search, status }) {
      const filters = [];
      const parameters = [];

      if (search) {
        const searchTerm = `%${search}%`;
        filters.push("(p.name LIKE ? OR p.product_code LIKE ? OR p.category LIKE ?)");
        parameters.push(searchTerm, searchTerm, searchTerm);
      }
      if (status === "Low Stock") {
        filters.push("COALESCE(ps.available_stock, p.total_stock) > 0 AND COALESCE(ps.available_stock, p.total_stock) <= COALESCE(ps.minimum_stock, 5)");
      }

      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const offset = (page - 1) * limit;
      const [rows] = await pool.execute(
        `SELECT ${PRODUCT_COLUMNS}, ps.available_stock, ps.reserved_stock, ps.damaged_stock,
                ps.minimum_stock, ps.stock_type, ps.deduction_rule
         FROM products p LEFT JOIN product_stock ps ON ps.product_id = p.id ${whereClause}
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT ? OFFSET ?`,
        [...parameters, limit, offset],
      );
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM products p LEFT JOIN product_stock ps ON ps.product_id = p.id ${whereClause}`,
        parameters,
      );
      const [statsRows] = await pool.execute(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(status = 'Active'), 0) AS active,
                COALESCE(SUM(status = 'Inactive'), 0) AS outOfStock,
                COALESCE(SUM(COALESCE(ps.available_stock, p.total_stock) > 0 AND
                  COALESCE(ps.available_stock, p.total_stock) <= COALESCE(ps.minimum_stock, 5)), 0) AS lowStock
         FROM products p LEFT JOIN product_stock ps ON ps.product_id = p.id`,
      );
      const total = Number(countRows[0]?.total || 0);
      const stats = statsRows[0] || {};

      return {
        products: rows.map(toProduct),
        pagination: {
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
          page,
          limit,
        },
        stats: {
          total: Number(stats.total || 0),
          active: Number(stats.active || 0),
          outOfStock: Number(stats.outOfStock || 0),
          lowStock: Number(stats.lowStock || 0),
        },
      };
    },

    async getById(id) {
      return getById(id);
    },

    async create(product, actor) {
      if (product.product_code) return save(product);

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const productCode = await generateCode();
        try {
          return await save({
            ...product,
            product_code: productCode,
            data: { ...product.data, product_code: productCode },
          }, actor);
        } catch (error) {
          if (error.code !== "ER_DUP_ENTRY" || attempt === 2) throw error;
        }
      }
      throw new Error("Could not generate an available product SKU.");
    },

    async update(id, product, actor) {
      const existing = await getById(id);
      if (!existing) return null;
      return save({ ...product, id }, actor);
    },

    async delete(id) {
      const [result] = await pool.execute("DELETE FROM products WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },

    generateCode,
  };
}

module.exports = { createProductService, toProduct };
