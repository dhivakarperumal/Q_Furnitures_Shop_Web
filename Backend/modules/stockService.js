const { randomUUID } = require("node:crypto");

function stockError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function createTransaction(connection, transaction) {
  const [result] = await connection.execute(
    `INSERT INTO stock_transactions
      (transaction_ref, transaction_type, reference_type, reference_id, reference_number, created_by, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [
      transaction.reference,
      transaction.type,
      transaction.referenceType || null,
      transaction.referenceId || null,
      transaction.referenceNumber || null,
      transaction.createdBy || null,
      transaction.remarks || null,
    ],
  );
  return result.insertId;
}

async function getStockForUpdate(connection, productId) {
  let [rows] = await connection.execute(
    `SELECT p.id, p.name, p.product_code, p.total_stock, p.product_data,
            ps.available_stock, ps.reserved_stock, ps.damaged_stock,
            ps.stock_type, ps.deduction_rule, ps.minimum_stock
     FROM products p
     LEFT JOIN product_stock ps ON ps.product_id = p.id
     WHERE p.id = ? FOR UPDATE`,
    [productId],
  );
  if (!rows[0]) return null;
  if (rows[0].available_stock === null || rows[0].available_stock === undefined) {
    await connection.execute(
      `INSERT IGNORE INTO product_stock (product_id, available_stock)
       VALUES (?, ?)`,
      [productId, Number(rows[0].total_stock || 0)],
    );
    [rows] = await connection.execute(
      `SELECT p.id, p.name, p.product_code, p.total_stock, p.product_data,
              ps.available_stock, ps.reserved_stock, ps.damaged_stock,
              ps.stock_type, ps.deduction_rule, ps.minimum_stock
       FROM products p
       JOIN product_stock ps ON ps.product_id = p.id
       WHERE p.id = ? FOR UPDATE`,
      [productId],
    );
  }
  return rows[0];
}

async function updateAvailableStock(connection, productId, availableStock) {
  await connection.execute(
    "UPDATE product_stock SET available_stock = ? WHERE product_id = ?",
    [availableStock, productId],
  );
  await connection.execute(
    "UPDATE products SET total_stock = ? WHERE id = ?",
    [availableStock, productId],
  );
}

async function insertMovement(connection, movement) {
  await connection.execute(
    `INSERT INTO stock_movements
      (transaction_id, product_id, invoice_id, invoice_item_id, movement_key, transaction_type,
       product_name, product_sku, previous_stock, stock_in, stock_out, damaged_in, current_stock, updated_by, remarks)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movement.transactionId,
      movement.productId,
      movement.invoiceId || null,
      movement.invoiceItemId || null,
      movement.key,
      movement.type,
      movement.productName,
      movement.productSku || null,
      movement.previousStock,
      movement.stockIn || 0,
      movement.stockOut || 0,
      movement.damagedIn || 0,
      movement.currentStock,
      movement.updatedBy || null,
      movement.remarks || null,
    ],
  );
}

function createStockService(pool) {
  async function getNegativeStockSetting(executor = pool) {
    const [rows] = await executor.execute(
      "SELECT allow_negative_stock FROM stock_settings WHERE id = 1",
    );
    return Boolean(rows[0]?.allow_negative_stock);
  }

  async function moveInvoiceStock(connection, invoice, items, direction, actor = null) {
    const isDeduction = direction === "out";
    const type = isDeduction ? "Sales Invoice" : "Invoice Cancellation";
    const transactionReference = `invoice:${invoice.id}:${isDeduction ? "finalize" : "cancel"}`;
    let stockItems = items
      .filter((item) => item.product_id)
      .slice()
      .sort((left, right) => Number(left.product_id) - Number(right.product_id) || Number(left.id) - Number(right.id));
    if (!isDeduction) {
      const deductedItems = [];
      for (const item of stockItems) {
        const sourceKey = `invoice:${invoice.id}:finalize:item:${item.id}`;
        const [sourceMovements] = await connection.execute(
          "SELECT id FROM stock_movements WHERE movement_key = ? LIMIT 1",
          [sourceKey],
        );
        if (sourceMovements.length) deductedItems.push(item);
      }
      stockItems = deductedItems;
    }
    if (!stockItems.length) return;

    const products = new Map();
    for (const item of stockItems) {
      const productId = Number(item.product_id);
      if (!products.has(productId)) {
        const product = await getStockForUpdate(connection, productId);
        if (!product) throw stockError(`Product ${item.product_name} no longer exists.`, 409);
        products.set(productId, {
          product,
          currentStock: Number(product.available_stock || 0),
        });
      }
    }

    const settings = await getNegativeStockSetting(connection);
    if (isDeduction && !settings) {
      for (const item of stockItems) {
        const state = products.get(Number(item.product_id));
        if (state.product.deduction_rule === "none") continue;
        const quantity = stockItems
          .filter((line) => Number(line.product_id) === Number(item.product_id))
          .reduce((sum, line) => sum + Number(line.quantity), 0);
        if (quantity > state.currentStock) {
          throw stockError(
            `Insufficient stock for ${state.product.name}. Available: ${state.currentStock}, requested: ${quantity}.`,
            409,
          );
        }
      }
    }

    const transactionId = await createTransaction(connection, {
      reference: transactionReference,
      type,
      referenceType: "invoice",
      referenceId: invoice.id,
      referenceNumber: invoice.invoice_number,
      createdBy: actor,
      remarks: isDeduction ? `Stock deducted for ${invoice.invoice_number}` : `Stock restored for ${invoice.invoice_number}`,
    });

    for (const item of stockItems) {
      const productId = Number(item.product_id);
      const state = products.get(productId);
      if (isDeduction && state.product.deduction_rule === "none") continue;
      const quantity = Number(item.quantity);
      const previousStock = state.currentStock;
      const currentStock = previousStock + (isDeduction ? -quantity : quantity);
      const movementKey = `${transactionReference}:item:${item.id}`;
      const [existingMovements] = await connection.execute(
        "SELECT id FROM stock_movements WHERE movement_key = ? LIMIT 1",
        [movementKey],
      );
      if (existingMovements.length) continue;

      state.currentStock = currentStock;
      await updateAvailableStock(connection, productId, currentStock);
      await insertMovement(connection, {
        transactionId,
        productId,
        invoiceId: invoice.id,
        invoiceItemId: item.id,
        key: movementKey,
        type,
        productName: item.product_name || state.product.name,
        productSku: item.sku || state.product.product_code,
        previousStock,
        stockIn: isDeduction ? 0 : quantity,
        stockOut: isDeduction ? quantity : 0,
        currentStock,
        updatedBy: actor,
        remarks: isDeduction ? `Sold on ${invoice.invoice_number}` : `Restored from ${invoice.invoice_number}`,
      });
    }
  }

  return {
    getNegativeStockSetting,
    async initializeProduct(connection, { productId, quantity = 0, productData = {}, actor = null }) {
      const current = await getStockForUpdate(connection, productId);
      if (!current) throw stockError("Product was not found.", 404);
      const inventoryType = String(productData.inventory_type || productData.stock_type || "Ready-Made Furniture").slice(0, 32);
      const configuredRule = String(productData.stock_deduction_rule || "").toLowerCase();
      const madeToOrder = inventoryType.toLowerCase().includes("made-to-order");
      const deductionRule = ["deduct", "none"].includes(configuredRule)
        ? configuredRule
        : madeToOrder ? "none" : "deduct";
      const minimumStock = productData.minimum_stock === undefined
        ? Number(current.minimum_stock || 5)
        : Number.isSafeInteger(Number(productData.minimum_stock)) && Number(productData.minimum_stock) >= 0
          ? Number(productData.minimum_stock)
          : 5;
      const currentStock = Number(current.available_stock || 0);
      const quantityChange = quantity - currentStock;
      await connection.execute(
        `UPDATE product_stock
         SET stock_type = ?, deduction_rule = ?, minimum_stock = ?
         WHERE product_id = ?`,
        [inventoryType, deductionRule, minimumStock, productId],
      );
      if (quantityChange === 0) return;
      await updateAvailableStock(connection, productId, quantity);
      const reference = `opening-stock:${productId}`;
      const transactionId = await createTransaction(connection, {
        reference,
        type: "Opening Stock",
        referenceType: "product",
        referenceId: productId,
        referenceNumber: current.product_code,
        createdBy: actor,
        remarks: "Initial product stock",
      });
      await insertMovement(connection, {
        transactionId,
        productId,
        key: reference,
        type: "Opening Stock",
        productName: current.name,
        productSku: current.product_code,
        previousStock: currentStock,
        stockIn: Math.max(quantityChange, 0),
        stockOut: Math.max(-quantityChange, 0),
        currentStock: quantity,
        updatedBy: actor,
        remarks: "Initial product stock",
      });
    },
    async restoreReturnedStock(connection, {
      invoiceId,
      invoiceItemId,
      creditNoteId,
      creditNoteNumber,
      productId,
      productName,
      productSku,
      quantity,
      disposition,
      actor,
    }) {
      if (!productId || !["sellable", "damaged"].includes(disposition)) return;
      const sourceKey = `invoice:${invoiceId}:finalize:item:${invoiceItemId}`;
      const [sourceMovements] = await connection.execute(
        "SELECT id FROM stock_movements WHERE movement_key = ? LIMIT 1",
        [sourceKey],
      );
      if (!sourceMovements.length) return;
      const reference = `return:${creditNoteId}:item:${invoiceItemId}`;
      const [existingMovements] = await connection.execute(
        "SELECT id FROM stock_movements WHERE movement_key = ? LIMIT 1",
        [reference],
      );
      if (existingMovements.length) return;
      const product = await getStockForUpdate(connection, productId);
      if (!product) return;
      const isSellable = disposition === "sellable";
      const previousStock = Number(product.available_stock || 0);
      const currentStock = previousStock + (isSellable ? quantity : 0);
      const transactionType = isSellable ? "Sales Return" : "Damaged Stock";
      const transactionId = await createTransaction(connection, {
        reference,
        type: transactionType,
        referenceType: "credit-note",
        referenceId: creditNoteId,
        referenceNumber: creditNoteNumber,
        createdBy: actor,
        remarks: `${quantity} returned unit(s) marked ${disposition}`,
      });
      if (isSellable) {
        await updateAvailableStock(connection, productId, currentStock);
      } else {
        await connection.execute(
          "UPDATE product_stock SET damaged_stock = damaged_stock + ? WHERE product_id = ?",
          [quantity, productId],
        );
      }
      await insertMovement(connection, {
        transactionId,
        productId,
        invoiceId,
        invoiceItemId,
        key: reference,
        type: transactionType,
        productName,
        productSku,
        previousStock,
        stockIn: isSellable ? quantity : 0,
        damagedIn: isSellable ? 0 : quantity,
        currentStock,
        updatedBy: actor,
        remarks: `${quantity} returned unit(s) marked ${disposition}`,
      });
    },
    async changeProductStock(connection, { productId, quantity, productData = {}, reason, actor = null }) {
      const product = await getStockForUpdate(connection, productId);
      if (!product) throw stockError("Product was not found.", 404);
      const previousStock = Number(product.available_stock || 0);
      const quantityChange = quantity - previousStock;
      if (quantity < 0 && !await getNegativeStockSetting(connection)) {
        throw stockError("Available stock cannot be negative.");
      }
      const inventoryType = String(productData.inventory_type || productData.stock_type || product.stock_type || "Ready-Made Furniture").slice(0, 32);
      const configuredRule = String(productData.stock_deduction_rule || "").toLowerCase();
      const madeToOrder = inventoryType.toLowerCase().includes("made-to-order");
      let deductionRule = String(product.deduction_rule || "deduct") === "none" ? "none" : "deduct";
      if (madeToOrder) deductionRule = "none";
      if (configuredRule) deductionRule = configuredRule === "none" ? "none" : "deduct";
      const minimumStock = productData.minimum_stock === undefined
        ? Number(product.minimum_stock || 5)
        : Number.isSafeInteger(Number(productData.minimum_stock)) && Number(productData.minimum_stock) >= 0
          ? Number(productData.minimum_stock)
          : 5;
      await connection.execute(
        `UPDATE product_stock
         SET stock_type = ?, deduction_rule = ?, minimum_stock = ?
         WHERE product_id = ?`,
        [inventoryType, deductionRule, minimumStock, productId],
      );
      if (quantityChange === 0) return;
      const reference = `product-adjustment:${randomUUID()}`;
      const transactionId = await createTransaction(connection, {
        reference,
        type: "Stock Adjustment",
        referenceType: "product",
        referenceId: productId,
        referenceNumber: product.product_code,
        createdBy: actor,
        remarks: reason,
      });
      await updateAvailableStock(connection, productId, quantity);
      await connection.execute(
        `INSERT INTO stock_adjustments (transaction_id, product_id, quantity_change, reason, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [transactionId, productId, quantityChange, reason, actor || null],
      );
      await insertMovement(connection, {
        transactionId,
        productId,
        key: reference,
        type: "Stock Adjustment",
        productName: product.name,
        productSku: product.product_code,
        previousStock,
        stockIn: Math.max(quantityChange, 0),
        stockOut: Math.max(-quantityChange, 0),
        currentStock: quantity,
        updatedBy: actor,
        remarks: reason,
      });
    },
    deductInvoiceStock(connection, invoice, items, actor) {
      return moveInvoiceStock(connection, invoice, items, "out", actor);
    },
    restoreInvoiceStock(connection, invoice, items, actor) {
      return moveInvoiceStock(connection, invoice, items, "in", actor);
    },
    async list({ page = 1, limit = 25, search = "", lowStock = false } = {}) {
      const filters = [];
      const parameters = [];
      if (search) {
        filters.push("(p.name LIKE ? OR p.product_code LIKE ? OR p.category LIKE ?)");
        const term = `%${search}%`;
        parameters.push(term, term, term);
      }
      if (lowStock) filters.push("ps.available_stock <= ps.minimum_stock");
      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const offset = (page - 1) * limit;
      const [products] = await pool.execute(
        `SELECT p.id, p.product_code, p.name, p.category, p.total_stock,
                ps.available_stock, ps.reserved_stock, ps.damaged_stock, ps.minimum_stock,
                ps.stock_type, ps.deduction_rule, p.status
         FROM products p JOIN product_stock ps ON ps.product_id = p.id
         ${whereClause}
         ORDER BY ps.available_stock <= 0 DESC, ps.available_stock <= ps.minimum_stock DESC, p.name
         LIMIT ? OFFSET ?`,
        [...parameters, limit, offset],
      );
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM products p JOIN product_stock ps ON ps.product_id = p.id ${whereClause}`,
        parameters,
      );
      const total = Number(countRows[0]?.total || 0);
      return {
        products: products.map((product) => ({
          ...product,
          available_stock: Number(product.available_stock),
          reserved_stock: Number(product.reserved_stock),
          damaged_stock: Number(product.damaged_stock),
          minimum_stock: Number(product.minimum_stock),
          inventory_status: Number(product.available_stock) <= 0
            ? "Out of Stock"
            : Number(product.available_stock) <= Number(product.minimum_stock) ? "Low Stock" : "In Stock",
        })),
        pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      };
    },
    async listMovements({ page = 1, limit = 25, productId = null, invoiceId = null, from = null, to = null, type = "" } = {}) {
      const filters = [];
      const parameters = [];
      if (productId) {
        filters.push("sm.product_id = ?");
        parameters.push(productId);
      }
      if (invoiceId) {
        filters.push("sm.invoice_id = ?");
        parameters.push(invoiceId);
      }
      if (from) {
        filters.push("sm.created_at >= ?");
        parameters.push(`${from} 00:00:00`);
      }
      if (to) {
        filters.push("sm.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
        parameters.push(to);
      }
      if (type) {
        filters.push("sm.transaction_type = ?");
        parameters.push(type);
      }
      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const offset = (page - 1) * limit;
      const [movements] = await pool.execute(
        `SELECT sm.*, st.id AS transaction_id, st.transaction_ref AS transaction_reference,
                i.invoice_number, COALESCE(sm.product_name, p.name) AS product_name,
                COALESCE(sm.product_sku, p.product_code) AS product_sku
         FROM stock_movements sm
         JOIN stock_transactions st ON st.id = sm.transaction_id
         LEFT JOIN invoices i ON i.id = sm.invoice_id
         LEFT JOIN products p ON p.id = sm.product_id
         ${whereClause}
         ORDER BY sm.created_at DESC, sm.id DESC
         LIMIT ? OFFSET ?`,
        [...parameters, limit, offset],
      );
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM stock_movements sm ${whereClause}`,
        parameters,
      );
      const total = Number(countRows[0]?.total || 0);
      return { movements, pagination: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) } };
    },
    async adjust({ productId, quantityChange, reason, actor }) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const product = await getStockForUpdate(connection, productId);
        if (!product) throw stockError("Product was not found.", 404);
        const previousStock = Number(product.available_stock || 0);
        const currentStock = previousStock + quantityChange;
        if (currentStock < 0 && !await getNegativeStockSetting(connection)) {
          throw stockError(`Adjustment would result in negative stock. Available: ${previousStock}.`, 409);
        }
        const reference = `adjustment:${randomUUID()}`;
        const transactionId = await createTransaction(connection, {
          reference,
          type: "Stock Adjustment",
          referenceType: "product",
          referenceId: productId,
          referenceNumber: product.product_code,
          createdBy: actor,
          remarks: reason,
        });
        await updateAvailableStock(connection, productId, currentStock);
        await connection.execute(
          `INSERT INTO stock_adjustments (transaction_id, product_id, quantity_change, reason, created_by)
           VALUES (?, ?, ?, ?, ?)`,
          [transactionId, productId, quantityChange, reason, actor || null],
        );
        await insertMovement(connection, {
          transactionId,
          productId,
          key: reference,
          type: "Stock Adjustment",
          productName: product.name,
          productSku: product.product_code,
          previousStock,
          stockIn: Math.max(quantityChange, 0),
          stockOut: Math.max(-quantityChange, 0),
          currentStock,
          updatedBy: actor,
          remarks: reason,
        });
        await connection.commit();
        return { product_id: productId, previous_stock: previousStock, quantity_change: quantityChange, current_stock: currentStock };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async updateSettings({ allowNegativeStock }) {
      await pool.execute(
        `INSERT INTO stock_settings (id, allow_negative_stock) VALUES (1, ?)
         ON DUPLICATE KEY UPDATE allow_negative_stock = VALUES(allow_negative_stock)`,
        [allowNegativeStock ? 1 : 0],
      );
      return { allow_negative_stock: allowNegativeStock };
    },
  };
}

module.exports = { createStockService, getStockForUpdate, updateAvailableStock, createTransaction, insertMovement };
