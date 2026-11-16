const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");
const { createInvoiceProductService } = require("../modules/invoiceProductService");

async function workbookBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products");
  worksheet.addRow([
    "Product SKU", "Product Name", "Category", "Quantity", "Unit Price", "Discount", "GST",
  ]);
  rows.forEach((row) => worksheet.addRow(row));
  return workbook.xlsx.writeBuffer();
}

function createPool(products = []) {
  const imports = new Map();
  const queries = [];
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params = []) {
      queries.push(sql);
      if (sql.includes("SELECT * FROM product_import_logs")) {
        const importLog = imports.get(params[0]);
        return [importLog ? [importLog] : []];
      }
      if (sql.startsWith("UPDATE product_import_logs")) {
        const importLog = [...imports.values()].find((item) => item.id === params[0]);
        importLog.status = "confirmed";
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const pool = {
    queries,
    imports,
    getConnection: async () => connection,
    async execute(sql, params = []) {
      queries.push(sql);
      if (sql.startsWith("SELECT id, product_code, name, category, status, product_data")) return [products];
      if (sql.startsWith("INSERT INTO product_import_logs")) {
        imports.set(params[0], {
          id: imports.size + 1,
          import_token: params[0],
          status: "preview",
          preview_data: params[6],
          created_by: params[1],
        });
        return [{ insertId: imports.size }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  return pool;
}

test("previews invoice product rows, flags duplicate catalog products, and never creates products", async () => {
  const pool = createPool([{
    id: 8,
    product_code: "QF-2026-00008",
    name: "Oak Sofa",
    category: "Sofas",
    status: "Active",
    product_data: { hsn_code: "9401", material_type: "Oak" },
  }]);
  const service = createInvoiceProductService(pool);
  const buffer = await workbookBuffer([
    ["QF-2026-00008", "Oak Sofa", "Sofas", 2, 250, 10, 18],
    ["QF-2026-00008", "Oak Sofa", "Sofas", 1, 250, 0, 18],
    ["MISSING", "Unknown Chair", "", 0, 0, 0, 101],
  ]);

  const result = await service.preview({ buffer, fileName: "items.xlsx", actor: 3 });

  assert.equal(result.row_count, 3);
  assert.equal(result.valid_count, 1);
  assert.equal(result.invalid_count, 2);
  assert.equal(result.rows[0].product_id, 8);
  assert.equal(result.rows[0].gst_rate, 18);
  assert.equal(result.rows[1].valid, false);
  assert.match(result.rows[1].errors.join(" "), /Duplicate product/);
  assert.match(result.rows[2].errors.join(" "), /was not found/);
  assert.equal(result.missing_products.length, 1);
  assert.equal(pool.queries.some((sql) => /INSERT\s+INTO\s+products/i.test(sql)), false);
});

test("confirms only the validated import rows once", async () => {
  const row = {
    product_id: 8,
    sku: "QF-2026-00008",
    product_name: "Oak Sofa",
    category: "Sofas",
    quantity: 2,
    unit_price: 250,
    discount_amount: 10,
    gst_rate: 18,
  };
  const pool = createPool();
  const token = "e9cfe43e-885a-4b2d-995d-0dc94c07d1e1";
  pool.imports.set(token, {
    id: 1,
    import_token: token,
    status: "preview",
    preview_data: JSON.stringify([row]),
  });
  const service = createInvoiceProductService(pool);

  const result = await service.confirm(token, 12);

  assert.equal(result.confirmed_count, 1);
  assert.equal(result.items[0].product_id, 8);
  assert.equal(pool.imports.get(token).status, "confirmed");
  await assert.rejects(() => service.confirm(token, 12), /already been confirmed/);
});

test("previews CSV invoice product files using SKU matching", async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products");
  worksheet.addRow(["Product SKU", "Product Name", "Quantity", "Unit Price", "GST"]);
  worksheet.addRow(["QF-2026-00008", "Oak Sofa", 1, 275, 18]);
  const buffer = await workbook.csv.writeBuffer();
  const pool = createPool([{
    id: 8,
    product_code: "QF-2026-00008",
    name: "Oak Sofa",
    category: "Sofas",
    status: "Active",
    product_data: {},
  }]);

  const result = await createInvoiceProductService(pool).preview({
    buffer,
    fileName: "items.csv",
    actor: 3,
  });

  assert.equal(result.valid_count, 1);
  assert.equal(result.rows[0].product_id, 8);
  assert.equal(result.rows[0].unit_price, 275);
});
