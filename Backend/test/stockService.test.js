const test = require("node:test");
const assert = require("node:assert/strict");
const { createStockService } = require("../modules/stockService");

function stockConnection(availableStock) {
  const statements = [];
  const connection = {
    async execute(sql, params = []) {
      statements.push({ sql, params });
      if (sql.includes("SELECT p.id, p.name, p.product_code")) {
        return [[{
          id: 4,
          name: "Oak Sofa",
          product_code: "QF-2026-00004",
          total_stock: availableStock,
          available_stock: availableStock,
          reserved_stock: 0,
          damaged_stock: 0,
          minimum_stock: 5,
          deduction_rule: "deduct",
        }]];
      }
      if (sql.includes("SELECT allow_negative_stock")) return [[{ allow_negative_stock: 0 }]];
      if (sql.startsWith("SELECT id FROM stock_movements")) return [[]];
      if (sql.startsWith("INSERT INTO stock_transactions")) return [{ insertId: 17 }];
      return [{ affectedRows: 1 }];
    },
  };
  return { connection, statements };
}

test("rejects invoice finalization before writing stock changes when quantity exceeds availability", async () => {
  const { connection, statements } = stockConnection(2);
  const stockService = createStockService({});

  await assert.rejects(
    () => stockService.deductInvoiceStock(connection, { id: 9, invoice_number: "QF-INV-2026-000009" }, [{
      id: 12,
      product_id: 4,
      product_name: "Oak Sofa",
      quantity: 3,
    }], 1),
    (error) => error.status === 409 && /Available: 2, requested: 3/.test(error.message),
  );
  assert.equal(statements.some(({ sql }) => sql.startsWith("INSERT INTO stock_transactions")), false);
  assert.equal(statements.some(({ sql }) => sql.startsWith("UPDATE product_stock")), false);
});

test("deducts finalized invoice quantity from both synchronized stock records and logs movement", async () => {
  const { connection, statements } = stockConnection(5);
  const stockService = createStockService({});

  await stockService.deductInvoiceStock(connection, { id: 9, invoice_number: "QF-INV-2026-000009" }, [{
    id: 12,
    product_id: 4,
    product_name: "Oak Sofa",
    sku: "QF-2026-00004",
    quantity: 2,
  }], 1);

  const stockUpdate = statements.find(({ sql }) => sql.startsWith("UPDATE product_stock"));
  const productUpdate = statements.find(({ sql }) => sql.startsWith("UPDATE products SET total_stock"));
  const movement = statements.find(({ sql }) => sql.startsWith("INSERT INTO stock_movements"));
  assert.equal(stockUpdate.params[0], 3);
  assert.equal(productUpdate.params[0], 3);
  assert.equal(movement.params[9], 0);
  assert.equal(movement.params[10], 2);
  assert.match(movement.params[4], /invoice:9:finalize:item:12/);
});

test("restores cancelled invoice quantity exactly once", async () => {
  const movementKeys = new Set(["invoice:9:finalize:item:12"]);
  const statements = [];
  let availableStock = 1;
  const connection = {
    async execute(sql, params = []) {
      statements.push({ sql, params });
      if (sql.includes("SELECT p.id, p.name, p.product_code")) {
        return [[{
          id: 4,
          name: "Oak Sofa",
          product_code: "QF-2026-00004",
          total_stock: availableStock,
          available_stock: availableStock,
          deduction_rule: "deduct",
        }]];
      }
      if (sql.includes("SELECT allow_negative_stock")) return [[{ allow_negative_stock: 0 }]];
      if (sql.startsWith("SELECT id FROM stock_movements")) {
        return [movementKeys.has(params[0]) ? [{ id: 1 }] : []];
      }
      if (sql.startsWith("INSERT INTO stock_transactions")) return [{ insertId: 17 }];
      if (sql.startsWith("UPDATE product_stock")) availableStock = params[0];
      if (sql.startsWith("INSERT INTO stock_movements")) movementKeys.add(params[4]);
      return [{ affectedRows: 1 }];
    },
  };
  const stockService = createStockService({});
  const invoice = { id: 9, invoice_number: "QF-INV-2026-000009" };
  const items = [{ id: 12, product_id: 4, product_name: "Oak Sofa", quantity: 2 }];

  await stockService.restoreInvoiceStock(connection, invoice, items, 1);
  await stockService.restoreInvoiceStock(connection, invoice, items, 1);

  assert.equal(availableStock, 3);
  assert.equal(statements.filter(({ sql }) => sql.startsWith("INSERT INTO stock_movements")).length, 1);
});
