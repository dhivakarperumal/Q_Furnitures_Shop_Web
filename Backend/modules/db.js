const { randomUUID } = require("node:crypto");
const mysql = require("mysql2/promise");
const { getDatabaseConfig } = require("../config/db");

function createPool() {
  return mysql.createPool(getDatabaseConfig());
}

function parseLegacyOrderItems(value, orderId) {
  let items = value;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch (error) {
      throw new Error(`Could not migrate items for order ${orderId}: ${error.message}`);
    }
  }
  if (!Array.isArray(items)) {
    throw new Error(`Could not migrate items for order ${orderId}: expected a JSON array.`);
  }
  return items;
}

function normalizeLegacyOrderItem(item, orderId, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`Could not migrate item ${index + 1} for order ${orderId}: invalid item data.`);
  }

  const productName = String(item.product_name || item.name || "").trim();
  const price = Number(item.price);
  const quantity = Number(item.quantity);
  const total = Number(item.total ?? price * quantity);
  if (!productName || !Number.isFinite(price) || price < 0 ||
      !Number.isSafeInteger(quantity) || quantity < 1 ||
      !Number.isFinite(total) || total < 0) {
    throw new Error(`Could not migrate item ${index + 1} for order ${orderId}: invalid item fields.`);
  }

  const productId = Number(item.product_id);
  return [
    orderId,
    Number.isSafeInteger(productId) && productId > 0 ? productId : null,
    productName.slice(0, 191),
    price,
    quantity,
    total,
    String(item.variant_color || "").slice(0, 100),
    String(item.variant_size || "").slice(0, 100),
    typeof item.image === "string" ? item.image : null,
  ];
}

async function migrateLegacyOrderDetails(pool) {
  const [columns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'`,
  );
  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
  const addressColumns = ["address", "street_address", "city", "district", "state", "country", "zip_code"];
  const requiredAddressColumns = ["street_address", "city", "state", "zip_code"];
  const hasLegacyAddress = requiredAddressColumns.every((column) => existingColumns.has(column));
  const hasLegacyItems = existingColumns.has("items");
  if (!hasLegacyAddress && !hasLegacyItems) return;

  const selectedColumns = ["id"];
  if (hasLegacyAddress) {
    selectedColumns.push(...addressColumns.filter((column) => existingColumns.has(column)));
    selectedColumns.push(
      ...["user_id", "customer_name", "customer_email", "customer_phone"]
        .filter((column) => existingColumns.has(column)),
    );
  }
  if (hasLegacyItems) selectedColumns.push("items");
  const [legacyOrders] = await pool.query(
    `SELECT ${selectedColumns.join(", ")} FROM orders`,
  );

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const order of legacyOrders) {
      if (hasLegacyAddress) {
        const [existingAddresses] = await connection.execute(
          "SELECT order_id FROM `address` WHERE order_id = ? LIMIT 1",
          [order.id],
        );
        if (!existingAddresses.length) {
          const streetAddress = String(order.street_address || order.address || "").trim();
          const city = String(order.city || "").trim();
          const state = String(order.state || "").trim();
          const zipCode = String(order.zip_code || "").trim();
          if (!streetAddress || !city || !state || !zipCode) {
            throw new Error(`Could not migrate address for order ${order.id}: required address fields are missing.`);
          }
          await connection.execute(
            `INSERT INTO \`address\`
             (order_id, user_id, customer_name, customer_email, customer_phone, address,
              street_address, city, district, state, country, zip_code)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              order.id,
              order.user_id || null,
              order.customer_name,
              order.customer_email || null,
              order.customer_phone,
              order.address || streetAddress,
              streetAddress,
              city,
              order.district || null,
              state,
              order.country || "India",
              zipCode,
            ],
          );
        }
      }

      if (hasLegacyItems) {
        const items = parseLegacyOrderItems(order.items, order.id);
        const [existingItems] = await connection.execute(
          "SELECT COUNT(*) AS item_count FROM order_items WHERE order_id = ?",
          [order.id],
        );
        const itemCount = Number(existingItems[0].item_count);
        if (itemCount && itemCount !== items.length) {
          throw new Error(`Could not migrate items for order ${order.id}: stored item counts do not match.`);
        }
        if (!itemCount) {
          for (const [index, item] of items.entries()) {
            await connection.execute(
              `INSERT INTO order_items
               (order_id, product_id, product_name, price, quantity, total, variant_color, variant_size, image)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              normalizeLegacyOrderItem(item, order.id, index),
            );
          }
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

  const columnsToDrop = [];
  if (hasLegacyAddress) {
    for (const column of addressColumns) {
      if (existingColumns.has(column)) columnsToDrop.push(column);
    }
    const [missingAddresses] = await pool.execute(
      `SELECT orders.id
       FROM orders
       LEFT JOIN \`address\` ON \`address\`.order_id = orders.id
       WHERE \`address\`.order_id IS NULL
       LIMIT 1`,
    );
    if (missingAddresses.length) {
      throw new Error(`Order address migration is incomplete for order ${missingAddresses[0].id}.`);
    }
  }
  if (hasLegacyItems) columnsToDrop.push("items");
  if (columnsToDrop.length) {
    await pool.query(`ALTER TABLE orders ${columnsToDrop.map((column) => `DROP COLUMN ${column}`).join(", ")}`);
  }
}

async function initializeDatabase(pool) {
  const [addressTableRows] = await pool.execute(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('address', 'order_addresses')`,
  );
  const addressTableNames = new Set(addressTableRows.map((table) => table.TABLE_NAME));
  if (addressTableNames.has("address") && addressTableNames.has("order_addresses")) {
    throw new Error("Both address and order_addresses tables exist; resolve the duplicate tables before starting the backend.");
  }
  if (addressTableNames.has("order_addresses")) {
    await pool.query("RENAME TABLE order_addresses TO `address`");
  }

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
    CREATE TABLE IF NOT EXISTS banners (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(191) NOT NULL,
      image_url VARCHAR(512) NOT NULL,
      link_url VARCHAR(2048) NULL,
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY banners_status_order_idx (status, sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS banners (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      subtitle VARCHAR(240) NOT NULL DEFAULT '',
      description TEXT NULL,
      offer VARCHAR(80) NOT NULL DEFAULT '',
      destination_link VARCHAR(2048) NOT NULL DEFAULT '',
      destination_links JSON NULL,
      target_section ENUM('hero', 'offers') NOT NULL DEFAULT 'hero',
      is_published TINYINT(1) NOT NULL DEFAULT 1,
      desktop_image VARCHAR(512) NOT NULL,
      mobile_image VARCHAR(512) NULL,
      image_url VARCHAR(512) NOT NULL DEFAULT '',
      link_url VARCHAR(2048) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY banners_published_target_idx (is_published, target_section)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [bannerColumnRows] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banners'`,
  );
  const existingBannerColumns = new Set(bannerColumnRows.map((column) => column.COLUMN_NAME));
  const bannerMigrations = [
    ["subtitle", "ALTER TABLE banners ADD COLUMN subtitle VARCHAR(240) NOT NULL DEFAULT ''"],
    ["description", "ALTER TABLE banners ADD COLUMN description TEXT NULL"],
    ["offer", "ALTER TABLE banners ADD COLUMN offer VARCHAR(80) NOT NULL DEFAULT ''"],
    ["destination_link", "ALTER TABLE banners ADD COLUMN destination_link VARCHAR(2048) NOT NULL DEFAULT ''"],
    ["destination_links", "ALTER TABLE banners ADD COLUMN destination_links JSON NULL"],
    ["target_section", "ALTER TABLE banners ADD COLUMN target_section ENUM('hero', 'offers') NOT NULL DEFAULT 'hero'"],
    ["is_published", "ALTER TABLE banners ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1"],
    ["desktop_image", "ALTER TABLE banners ADD COLUMN desktop_image VARCHAR(512) NULL"],
    ["mobile_image", "ALTER TABLE banners ADD COLUMN mobile_image VARCHAR(512) NULL"],
    ["image_url", "ALTER TABLE banners ADD COLUMN image_url VARCHAR(512) NOT NULL DEFAULT ''"],
    ["link_url", "ALTER TABLE banners ADD COLUMN link_url VARCHAR(2048) NULL"],
    ["status", "ALTER TABLE banners ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'Active'"],
    ["sort_order", "ALTER TABLE banners ADD COLUMN sort_order INT NOT NULL DEFAULT 0"],
  ];
  for (const [column, statement] of bannerMigrations) {
    if (!existingBannerColumns.has(column)) {
      await pool.query(statement);
    }
  }
  const [offerColumnRows] = await pool.execute(
    `SELECT CHARACTER_MAXIMUM_LENGTH
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'banners' AND COLUMN_NAME = 'offer'`,
  );
  if (Number(offerColumnRows[0]?.CHARACTER_MAXIMUM_LENGTH) < 80) {
    await pool.query("ALTER TABLE banners MODIFY COLUMN offer VARCHAR(80) NOT NULL DEFAULT ''");
  }
  await pool.query(
    `UPDATE banners
     SET desktop_image = image_url
     WHERE (desktop_image IS NULL OR desktop_image = '') AND image_url <> ''`,
  );
  await pool.query(
    `UPDATE banners
     SET destination_link = COALESCE(link_url, '')
     WHERE destination_link = '' AND link_url IS NOT NULL AND link_url <> ''`,
  );
  await pool.query(
    `UPDATE banners
     SET destination_links = JSON_ARRAY(JSON_OBJECT('label', 'Shop now', 'url', destination_link))
     WHERE destination_links IS NULL AND destination_link <> ''`,
  );
  await pool.query(
    `UPDATE banners
     SET is_published = CASE WHEN status = 'Inactive' THEN 0 ELSE 1 END`,
  );
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
      total_stock INT NOT NULL DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS coupons (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(160) NOT NULL,
      description TEXT NULL,
      discount_type ENUM('percentage', 'fixed') NOT NULL,
      discount_value DECIMAL(12,2) NOT NULL,
      min_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
      start_date DATETIME NOT NULL,
      expiry_date DATETIME NOT NULL,
      usage_limit_global INT UNSIGNED NULL,
      usage_limit_per_customer INT UNSIGNED NOT NULL DEFAULT 1,
      usage_count INT UNSIGNED NOT NULL DEFAULT 0,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      coupon_scope ENUM(
        'all',
        'first_order_only',
        'new_customers_only',
        'specific_products',
        'specific_categories'
      ) NOT NULL DEFAULT 'all',
      applicable_product_ids JSON NOT NULL,
      applicable_category_ids JSON NOT NULL,
      applicable_subcategory_ids JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY coupons_status_expiry_idx (status, expiry_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(160) NOT NULL,
      offer_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
      description TEXT NULL,
      icon VARCHAR(32) NOT NULL DEFAULT 'Tag',
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      show_in_header TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY offers_header_visibility_idx (status, show_in_header)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id BIGINT UNSIGNED NULL,
      user_name VARCHAR(191) NOT NULL,
      user_email VARCHAR(191) NULL,
      rating TINYINT UNSIGNED NOT NULL,
      comment TEXT NOT NULL,
      review_image VARCHAR(512) NULL,
      status ENUM('Pending', 'Published', 'Flagged') NOT NULL DEFAULT 'Pending',
      admin_reply TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY reviews_status_created_idx (status, created_at),
      KEY reviews_rating_idx (rating),
      CONSTRAINT reviews_product_fk
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS youtube_videos (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      video_code VARCHAR(32) NOT NULL UNIQUE,
      title VARCHAR(160) NOT NULL,
      video_source ENUM('link', 'upload') NOT NULL DEFAULT 'link',
      video_url VARCHAR(2048) NOT NULL,
      video_id CHAR(11) NULL,
      description TEXT NULL,
      thumbnail_image VARCHAR(512) NULL,
      thumbnail_url VARCHAR(2048) NULL,
      application_links JSON NOT NULL,
      documents JSON NOT NULL,
      follow_up_notes TEXT NULL,
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY youtube_videos_status_created_idx (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [youtubeVideoColumns] = await pool.execute(
    `SELECT COLUMN_NAME, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'youtube_videos'`,
  );
  const youtubeVideoColumnMap = new Map(
    youtubeVideoColumns.map((column) => [column.COLUMN_NAME, column]),
  );
  if (!youtubeVideoColumnMap.has("video_source")) {
    await pool.query(
      "ALTER TABLE youtube_videos ADD COLUMN video_source ENUM('link', 'upload') NOT NULL DEFAULT 'link' AFTER title",
    );
  }
  if (youtubeVideoColumnMap.get("video_id")?.IS_NULLABLE === "NO") {
    await pool.query("ALTER TABLE youtube_videos MODIFY COLUMN video_id CHAR(11) NULL");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id VARCHAR(32) NULL,
      user_id VARCHAR(255) NULL,
      customer_name VARCHAR(191) NOT NULL,
      customer_email VARCHAR(191) NULL,
      customer_phone VARCHAR(32) NOT NULL,
      order_type VARCHAR(32) NOT NULL DEFAULT 'Shop',
      payment_method VARCHAR(32) NOT NULL,
      payment_status VARCHAR(32) NOT NULL DEFAULT 'Pending',
      status VARCHAR(32) NOT NULL DEFAULT 'Order Placed',
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount_type VARCHAR(16) NOT NULL DEFAULT 'percentage',
      discount_value DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
      gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL,
      tracking_number VARCHAR(191) NULL,
      courier_name VARCHAR(191) NULL,
      shipped_at DATETIME NULL,
      cancellation_reason TEXT NULL,
      cancelled_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY orders_order_id_unique (order_id),
      KEY orders_status_created_idx (status, created_at),
      KEY orders_type_created_idx (order_type, created_at),
      KEY orders_customer_phone_idx (customer_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`address\` (
      order_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
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
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY address_user_idx (user_id),
      CONSTRAINT address_order_fk
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [addressColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'address'`,
  );
  const addressColumnNames = new Set(addressColumns.map((column) => column.COLUMN_NAME));
  const addressColumnMigrations = [
    ["user_id", "ALTER TABLE `address` ADD COLUMN user_id VARCHAR(255) NULL AFTER order_id"],
    ["customer_name", "ALTER TABLE `address` ADD COLUMN customer_name VARCHAR(191) NULL AFTER user_id"],
    ["customer_email", "ALTER TABLE `address` ADD COLUMN customer_email VARCHAR(191) NULL AFTER customer_name"],
    ["customer_phone", "ALTER TABLE `address` ADD COLUMN customer_phone VARCHAR(32) NULL AFTER customer_email"],
  ];
  for (const [column, statement] of addressColumnMigrations) {
    if (!addressColumnNames.has(column)) {
      await pool.query(statement);
    }
  }
  const [addressIndexes] = await pool.execute(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'address'`,
  );
  if (!addressIndexes.some((index) => ["address_user_idx", "order_addresses_user_idx"].includes(index.INDEX_NAME))) {
    await pool.query("ALTER TABLE `address` ADD KEY address_user_idx (user_id)");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      product_id BIGINT UNSIGNED NULL,
      product_name VARCHAR(191) NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      quantity INT UNSIGNED NOT NULL,
      total DECIMAL(12,2) NOT NULL,
      variant_color VARCHAR(100) NOT NULL DEFAULT '',
      variant_size VARCHAR(100) NOT NULL DEFAULT '',
      image TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY order_items_order_idx (order_id, id),
      KEY order_items_product_idx (product_id),
      CONSTRAINT order_items_order_fk
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await migrateLegacyOrderDetails(pool);
  await pool.query(
    `UPDATE \`address\` AS address
     INNER JOIN orders AS orders ON orders.id = address.order_id
     SET address.user_id = COALESCE(address.user_id, orders.user_id),
         address.customer_name = COALESCE(NULLIF(TRIM(address.customer_name), ''), orders.customer_name),
         address.customer_email = COALESCE(address.customer_email, orders.customer_email),
         address.customer_phone = COALESCE(NULLIF(TRIM(address.customer_phone), ''), orders.customer_phone)
     WHERE (address.user_id IS NULL AND orders.user_id IS NOT NULL)
        OR address.customer_name IS NULL OR TRIM(address.customer_name) = ''
        OR address.customer_phone IS NULL OR TRIM(address.customer_phone) = ''`,
  );
  const [missingAddressCustomers] = await pool.execute(
    `SELECT order_id FROM \`address\`
     WHERE customer_name IS NULL OR TRIM(customer_name) = ''
        OR customer_phone IS NULL OR TRIM(customer_phone) = ''
     LIMIT 1`,
  );
  if (missingAddressCustomers.length) {
    throw new Error(`Could not migrate customer details for order ${missingAddressCustomers[0].order_id}.`);
  }
  const [nullableCustomerColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'address'
       AND COLUMN_NAME IN ('customer_name', 'customer_phone') AND IS_NULLABLE = 'YES'`,
  );
  if (nullableCustomerColumns.length) {
    await pool.query(`
      ALTER TABLE \`address\`
      MODIFY COLUMN customer_name VARCHAR(191) NOT NULL,
      MODIFY COLUMN customer_phone VARCHAR(32) NOT NULL
    `);
  }
  const [orderColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'`,
  );
  const existingOrderColumns = new Set(orderColumns.map((column) => column.COLUMN_NAME));
  const orderMigrations = [
    ["order_id", "ALTER TABLE orders ADD COLUMN order_id VARCHAR(32) NULL"],
    ["subtotal", "ALTER TABLE orders ADD COLUMN subtotal DECIMAL(12,2) NOT NULL DEFAULT 0"],
    ["discount_type", "ALTER TABLE orders ADD COLUMN discount_type VARCHAR(16) NOT NULL DEFAULT 'percentage'"],
    ["discount_value", "ALTER TABLE orders ADD COLUMN discount_value DECIMAL(12,2) NOT NULL DEFAULT 0"],
    ["discount_amount", "ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0"],
    ["gst_rate", "ALTER TABLE orders ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0"],
    ["gst_amount", "ALTER TABLE orders ADD COLUMN gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0"],
  ];
  for (const [column, statement] of orderMigrations) {
    if (!existingOrderColumns.has(column)) {
      await pool.query(statement);
    }
  }
  const [orderIndexes] = await pool.execute(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'`,
  );
  if (!orderIndexes.some((index) => index.INDEX_NAME === "orders_order_id_unique")) {
    await pool.query("ALTER TABLE orders ADD UNIQUE KEY orders_order_id_unique (order_id)");
  }
  await pool.query(
    `UPDATE orders
     SET order_id = CONCAT('ORD', LPAD(CAST(id AS CHAR), GREATEST(4, CHAR_LENGTH(CAST(id AS CHAR))), '0'))
     WHERE order_id IS NULL OR TRIM(order_id) = ''`,
  );
  await pool.query(
    `UPDATE orders
     SET subtotal = total_amount
     WHERE subtotal = 0 AND discount_amount = 0 AND gst_amount = 0 AND total_amount <> 0`,
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_stock (
      product_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
      available_stock INT NOT NULL DEFAULT 0,
      reserved_stock INT UNSIGNED NOT NULL DEFAULT 0,
      damaged_stock INT UNSIGNED NOT NULL DEFAULT 0,
      minimum_stock INT UNSIGNED NOT NULL DEFAULT 5,
      stock_type VARCHAR(32) NOT NULL DEFAULT 'Ready-Made Furniture',
      deduction_rule VARCHAR(16) NOT NULL DEFAULT 'deduct',
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT product_stock_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      KEY product_stock_alert_idx (available_stock, minimum_stock)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_settings (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      allow_negative_stock TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_import_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      import_token CHAR(36) NOT NULL UNIQUE,
      created_by VARCHAR(191) NULL,
      file_name VARCHAR(255) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'preview',
      row_count INT UNSIGNED NOT NULL DEFAULT 0,
      valid_count INT UNSIGNED NOT NULL DEFAULT 0,
      errors JSON NULL,
      preview_data JSON NULL,
      confirmed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY product_import_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [importLogColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_import_logs'`,
  );
  if (!importLogColumns.some((column) => column.COLUMN_NAME === "preview_data")) {
    await pool.query("ALTER TABLE product_import_logs ADD COLUMN preview_data JSON NULL AFTER errors");
  }
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
  const [invoiceStockColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices'`,
  );
  const invoiceStockColumnNames = new Set(invoiceStockColumns.map((column) => column.COLUMN_NAME));
  if (!invoiceStockColumnNames.has("stock_deducted")) {
    await pool.query("ALTER TABLE invoices ADD COLUMN stock_deducted TINYINT(1) NOT NULL DEFAULT 0");
  }
  if (!invoiceStockColumnNames.has("cancel_reason")) {
    await pool.query("ALTER TABLE invoices ADD COLUMN cancel_reason TEXT NULL");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      transaction_ref VARCHAR(191) NOT NULL UNIQUE,
      transaction_type VARCHAR(40) NOT NULL,
      reference_type VARCHAR(32) NULL,
      reference_id BIGINT UNSIGNED NULL,
      reference_number VARCHAR(100) NULL,
      created_by VARCHAR(191) NULL,
      remarks TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY stock_transactions_reference_idx (reference_type, reference_id),
      KEY stock_transactions_created_idx (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      transaction_id BIGINT UNSIGNED NOT NULL,
      product_id BIGINT UNSIGNED NULL,
      invoice_id BIGINT UNSIGNED NULL,
      invoice_item_id BIGINT UNSIGNED NULL,
      movement_key VARCHAR(191) NOT NULL UNIQUE,
      transaction_type VARCHAR(40) NOT NULL,
      product_name VARCHAR(191) NOT NULL,
      product_sku VARCHAR(128) NULL,
      previous_stock INT NOT NULL,
      stock_in INT UNSIGNED NOT NULL DEFAULT 0,
      stock_out INT UNSIGNED NOT NULL DEFAULT 0,
      damaged_in INT UNSIGNED NOT NULL DEFAULT 0,
      current_stock INT NOT NULL,
      updated_by VARCHAR(191) NULL,
      remarks TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT stock_movements_transaction_fk FOREIGN KEY (transaction_id) REFERENCES stock_transactions(id) ON DELETE RESTRICT,
      CONSTRAINT stock_movements_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      CONSTRAINT stock_movements_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
      CONSTRAINT stock_movements_invoice_item_fk FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id) ON DELETE SET NULL,
      KEY stock_movements_product_date_idx (product_id, created_at, id),
      KEY stock_movements_invoice_idx (invoice_id),
      KEY stock_movements_type_date_idx (transaction_type, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [stockMovementColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_movements'`,
  );
  if (!stockMovementColumns.some((column) => column.COLUMN_NAME === "damaged_in")) {
    await pool.query("ALTER TABLE stock_movements ADD COLUMN damaged_in INT UNSIGNED NOT NULL DEFAULT 0 AFTER stock_out");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      transaction_id BIGINT UNSIGNED NOT NULL,
      product_id BIGINT UNSIGNED NULL,
      quantity_change INT NOT NULL,
      reason VARCHAR(191) NOT NULL,
      created_by VARCHAR(191) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT stock_adjustments_transaction_fk FOREIGN KEY (transaction_id) REFERENCES stock_transactions(id) ON DELETE RESTRICT,
      CONSTRAINT stock_adjustments_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
      KEY stock_adjustments_product_date_idx (product_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await pool.query(`
    INSERT IGNORE INTO product_stock
      (product_id, available_stock, minimum_stock, stock_type, deduction_rule)
    SELECT id, total_stock, 5,
           LEFT(COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(product_data, '$.inventory_type')), ''), 'Ready-Made Furniture'), 32),
           CASE
             WHEN LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(product_data, '$.stock_deduction_rule')), 'deduct')) IN ('none', 'made-to-order')
               OR LOWER(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(product_data, '$.inventory_type')), '')) LIKE '%made-to-order%' THEN 'none'
             ELSE 'deduct'
           END
    FROM products
  `);
  await pool.query("INSERT IGNORE INTO stock_settings (id, allow_negative_stock) VALUES (1, 0)");
  await pool.query(`
    INSERT IGNORE INTO stock_transactions
      (transaction_ref, transaction_type, reference_type, reference_id, reference_number, remarks)
    SELECT CONCAT('opening-stock:', p.id), 'Opening Stock', 'product', p.id, p.product_code,
           'Existing product stock loaded into the stock ledger'
    FROM products p
    JOIN product_stock ps ON ps.product_id = p.id
    WHERE ps.available_stock > 0
  `);
  await pool.query(`
    INSERT IGNORE INTO stock_movements
      (transaction_id, product_id, movement_key, transaction_type, product_name, product_sku,
       previous_stock, stock_in, stock_out, current_stock, remarks)
    SELECT st.id, p.id, CONCAT('opening-stock:', p.id), 'Opening Stock', p.name, p.product_code,
           0, ps.available_stock, 0, ps.available_stock,
           'Existing product stock loaded into the stock ledger'
    FROM products p
    JOIN product_stock ps ON ps.product_id = p.id
    JOIN stock_transactions st ON st.transaction_ref = CONCAT('opening-stock:', p.id)
    WHERE ps.available_stock > 0
  `);
  const [productStockColumns] = await pool.execute(
    `SELECT COLUMN_TYPE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'total_stock'`,
  );
  if (productStockColumns[0]?.COLUMN_TYPE.includes("unsigned")) {
    await pool.query("ALTER TABLE products MODIFY COLUMN total_stock INT NOT NULL DEFAULT 0");
  }
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
      stock_disposition VARCHAR(16) NOT NULL DEFAULT 'pending',
      CONSTRAINT credit_note_items_note_fk FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id) ON DELETE CASCADE,
      CONSTRAINT credit_note_items_invoice_item_fk FOREIGN KEY (invoice_item_id) REFERENCES invoice_items(id) ON DELETE RESTRICT,
      KEY credit_note_items_invoice_item_idx (invoice_item_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [creditItemColumns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'credit_note_items'`,
  );
  if (!creditItemColumns.some((column) => column.COLUMN_NAME === "stock_disposition")) {
    await pool.query("ALTER TABLE credit_note_items ADD COLUMN stock_disposition VARCHAR(16) NOT NULL DEFAULT 'pending'");
  }
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
