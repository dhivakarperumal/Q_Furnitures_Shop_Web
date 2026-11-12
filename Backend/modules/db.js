const { randomUUID } = require("node:crypto");
const mysql = require("mysql2/promise");
const { getDatabaseConfig } = require("../config/db");

function createPool() {
  return mysql.createPool(getDatabaseConfig());
}

async function initializeDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      username VARCHAR(120) NOT NULL,
      email VARCHAR(191) NOT NULL,
      phone VARCHAR(32) NULL,
      profile_image VARCHAR(255) NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'customer',
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY users_email_unique (email),
      UNIQUE KEY users_phone_unique (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      cat_id VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(191) NOT NULL,
      description TEXT NULL,
      subcategory JSON NOT NULL,
      images JSON NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      user_id VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_code VARCHAR(128) NULL,
      name VARCHAR(191) NOT NULL,
      category VARCHAR(191) NOT NULL,
      subcategory VARCHAR(191) NULL,
      mrp DECIMAL(12,2) NOT NULL,
      offer DECIMAL(12,2) NOT NULL DEFAULT 0,
      offer_type VARCHAR(32) NOT NULL DEFAULT 'Percentage',
      offer_price DECIMAL(12,2) NOT NULL,
      selling_price DECIMAL(12,2) NOT NULL,
      total_stock INT UNSIGNED NOT NULL DEFAULT 0,
      rating DECIMAL(2,1) NOT NULL DEFAULT 5.0,
      status VARCHAR(32) NOT NULL DEFAULT 'Active',
      product_data JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY products_product_code_unique (product_code),
      KEY products_category_idx (category),
      KEY products_status_stock_idx (status, total_stock),
      KEY products_name_idx (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255) NULL,
      customer_name VARCHAR(191) NOT NULL,
      customer_email VARCHAR(191) NULL,
      customer_phone VARCHAR(32) NOT NULL,
      address TEXT NULL,
      street_address VARCHAR(255) NOT NULL,
      city VARCHAR(191) NOT NULL,
      district VARCHAR(191) NULL,
      state VARCHAR(191) NOT NULL,
      country VARCHAR(191) NOT NULL DEFAULT 'India',
      zip_code VARCHAR(32) NOT NULL,
      order_type VARCHAR(32) NOT NULL DEFAULT 'Shop',
      payment_method VARCHAR(32) NOT NULL,
      payment_status VARCHAR(32) NOT NULL DEFAULT 'Pending',
      status VARCHAR(32) NOT NULL DEFAULT 'Order Placed',
      total_amount DECIMAL(12,2) NOT NULL,
      items JSON NOT NULL,
      tracking_number VARCHAR(191) NULL,
      courier_name VARCHAR(191) NULL,
      shipped_at DATETIME NULL,
      cancellation_reason TEXT NULL,
      cancelled_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY orders_status_created_idx (status, created_at),
      KEY orders_type_created_idx (order_type, created_at),
      KEY orders_customer_phone_idx (customer_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [productsMissingCode] = await pool.execute(
    `SELECT id, created_at
     FROM products
     WHERE product_code IS NULL OR TRIM(product_code) = ''`,
  );
  for (const product of productsMissingCode) {
    const date = new Date(product.created_at);
    const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
    const baseCode = `QF-${year}-${String(product.id).padStart(5, "0")}`;
    let productCode = baseCode;

    while (true) {
      const [matches] = await pool.execute(
        "SELECT id FROM products WHERE product_code = ? AND id <> ? LIMIT 1",
        [productCode, product.id],
      );
      if (!matches.length) break;
      productCode = `${baseCode}-${randomUUID().slice(0, 8).toUpperCase()}`;
    }

    await pool.execute(
      `UPDATE products
       SET product_code = ?, product_data = JSON_SET(product_data, '$.product_code', ?)
       WHERE id = ?`,
      [productCode, productCode, product.id],
    );
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_seed_history (
      seed_key VARCHAR(100) NOT NULL PRIMARY KEY,
      seeded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const [columns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
  );
  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
  const migrations = [
    ["status", "ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'"],
    ["created_at", "ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
    ["profile_image", "ALTER TABLE users ADD COLUMN profile_image VARCHAR(255) NULL"],
  ];

  for (const [column, statement] of migrations) {
    if (!existingColumns.has(column)) {
      await pool.query(statement);
    }
  }

  const [phoneColumns] = await pool.execute(
    `SELECT IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'phone'`,
  );
  if (phoneColumns[0]?.IS_NULLABLE === "NO") {
    await pool.query("ALTER TABLE users MODIFY COLUMN phone VARCHAR(32) NULL");
  }

  if (!existingColumns.has("id")) {
    await pool.query(`
      ALTER TABLE users
      DROP PRIMARY KEY,
      ADD COLUMN id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST
    `);
  }

  const [userIdColumns] = await pool.execute(
    `SELECT COLUMN_TYPE, EXTRA
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'user_id'`,
  );
  const userIdColumn = userIdColumns[0];

  if (userIdColumn.COLUMN_TYPE.toLowerCase() !== "varchar(255)" || userIdColumn.EXTRA.includes("auto_increment")) {
    await pool.query("ALTER TABLE users MODIFY COLUMN user_id VARCHAR(255) NOT NULL");
  }

  await pool.query(`
    UPDATE users
    SET user_id = UUID()
    WHERE user_id NOT REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  `);

  const [indexes] = await pool.execute(
    `SELECT INDEX_NAME, NON_UNIQUE, COLUMN_NAME, SEQ_IN_INDEX
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`,
  );
  const userIdHasUniqueIndex = indexes.some(
    (index) => index.COLUMN_NAME === "user_id" && index.SEQ_IN_INDEX === 1 && index.NON_UNIQUE === 0,
  );

  if (!userIdHasUniqueIndex) {
    await pool.query("ALTER TABLE users ADD UNIQUE KEY users_user_id_unique (user_id)");
  }
}

module.exports = { createPool, initializeDatabase };
