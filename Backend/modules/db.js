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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dealers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      dealer_code VARCHAR(32) NULL UNIQUE,
      name VARCHAR(191) NOT NULL,
      company_name VARCHAR(191) NOT NULL,
      contact_person VARCHAR(191) NULL,
      mobile VARCHAR(32) NOT NULL,
      whatsapp VARCHAR(32) NULL,
      email VARCHAR(191) NULL UNIQUE,
      gstin VARCHAR(15) NULL UNIQUE,
      pan VARCHAR(10) NULL UNIQUE,
      dealer_type VARCHAR(48) NOT NULL DEFAULT 'Retail Dealer',
      dealer_category VARCHAR(100) NULL,
      billing_address TEXT NULL,
      shipping_address TEXT NULL,
      city VARCHAR(100) NULL,
      district VARCHAR(100) NULL,
      state VARCHAR(100) NULL,
      pincode VARCHAR(12) NULL,
      opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      credit_limit DECIMAL(14,2) NOT NULL DEFAULT 0,
      payment_terms VARCHAR(100) NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'Active',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY dealers_mobile_unique (mobile),
      KEY dealers_status_created_idx (status, created_at),
      KEY dealers_name_idx (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(40) NULL UNIQUE,
      dealer_id BIGINT UNSIGNED NULL,
      invoice_date DATE NOT NULL,
      due_date DATE NULL,
      customer_name VARCHAR(191) NOT NULL,
      mobile VARCHAR(32) NULL,
      gstin VARCHAR(15) NULL,
      billing_address TEXT NULL,
      shipping_address TEXT NULL,
      sales_person VARCHAR(191) NULL,
      payment_terms VARCHAR(100) NULL,
      seller_state VARCHAR(100) NOT NULL,
      place_of_supply VARCHAR(100) NOT NULL,
      subtotal DECIMAL(14,2) NOT NULL DEFAULT 0,
      item_discount DECIMAL(14,2) NOT NULL DEFAULT 0,
      additional_discount DECIMAL(14,2) NOT NULL DEFAULT 0,
      taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      delivery_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
      installation_charges DECIMAL(14,2) NOT NULL DEFAULT 0,
      round_off DECIMAL(8,2) NOT NULL DEFAULT 0,
      grand_total DECIMAL(14,2) NOT NULL DEFAULT 0,
      previous_outstanding DECIMAL(14,2) NOT NULL DEFAULT 0,
      amount_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
      credited_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      balance_due DECIMAL(14,2) NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'Unpaid',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT invoices_dealer_fk FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE RESTRICT,
      KEY invoices_dealer_date_idx (dealer_id, invoice_date),
      KEY invoices_status_date_idx (status, invoice_date),
      KEY invoices_date_idx (invoice_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      invoice_id BIGINT UNSIGNED NOT NULL,
      product_id BIGINT UNSIGNED NULL,
      sku VARCHAR(128) NULL,
      product_name VARCHAR(191) NOT NULL,
      category VARCHAR(191) NULL,
      hsn_code VARCHAR(32) NULL,
      material VARCHAR(191) NULL,
      dimensions VARCHAR(191) NULL,
      quantity INT UNSIGNED NOT NULL,
      unit VARCHAR(32) NOT NULL DEFAULT 'pcs',
      unit_price DECIMAL(14,2) NOT NULL,
      discount_type VARCHAR(16) NOT NULL DEFAULT 'none',
      discount_value DECIMAL(14,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      gst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      line_total DECIMAL(14,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT invoice_items_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      CONSTRAINT invoice_items_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      KEY invoice_items_product_idx (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      invoice_id BIGINT UNSIGNED NOT NULL,
      dealer_id BIGINT UNSIGNED NULL,
      paid_at DATE NOT NULL,
      payment_method VARCHAR(32) NOT NULL,
      transaction_id VARCHAR(100) NULL,
      reference_number VARCHAR(100) NULL,
      amount DECIMAL(14,2) NOT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT invoice_payments_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      CONSTRAINT invoice_payments_dealer_fk FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE SET NULL,
      KEY invoice_payments_date_idx (paid_at),
      KEY invoice_payments_dealer_idx (dealer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_notes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      credit_note_number VARCHAR(40) NULL UNIQUE,
      invoice_id BIGINT UNSIGNED NOT NULL,
      dealer_id BIGINT UNSIGNED NULL,
      credit_date DATE NOT NULL,
      reason VARCHAR(191) NOT NULL,
      amount DECIMAL(14,2) NOT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT credit_notes_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
      CONSTRAINT credit_notes_dealer_fk FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE SET NULL,
      KEY credit_notes_invoice_date_idx (invoice_id, credit_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_note_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      credit_note_id BIGINT UNSIGNED NOT NULL,
      invoice_item_id BIGINT UNSIGNED NOT NULL,
      product_name VARCHAR(191) NOT NULL,
      hsn_code VARCHAR(32) NULL,
      quantity INT UNSIGNED NOT NULL,
      taxable_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      cgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      sgst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      igst_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      amount DECIMAL(14,2) NOT NULL DEFAULT 0,
      CONSTRAINT credit_note_items_note_fk FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE,
      CONSTRAINT credit_note_items_invoice_item_fk FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id) ON DELETE RESTRICT,
      KEY credit_note_items_invoice_item_idx (invoice_item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dealer_ledger (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      dealer_id BIGINT UNSIGNED NOT NULL,
      invoice_id BIGINT UNSIGNED NULL,
      transaction_date DATE NOT NULL,
      transaction_type VARCHAR(40) NOT NULL,
      reference_number VARCHAR(100) NULL,
      description VARCHAR(500) NULL,
      debit DECIMAL(14,2) NOT NULL DEFAULT 0,
      credit DECIMAL(14,2) NOT NULL DEFAULT 0,
      balance DECIMAL(14,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT dealer_ledger_dealer_fk FOREIGN KEY (dealer_id) REFERENCES dealers(id) ON DELETE CASCADE,
      CONSTRAINT dealer_ledger_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      KEY dealer_ledger_dealer_date_idx (dealer_id, transaction_date, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [invoiceColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices'`,
  );
  if (!invoiceColumns.some((column) => column.COLUMN_NAME === "credited_amount")) {
    await pool.query("ALTER TABLE invoices ADD COLUMN credited_amount DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER amount_paid");
  }

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
