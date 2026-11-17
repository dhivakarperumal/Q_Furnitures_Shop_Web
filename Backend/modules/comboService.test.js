const test = require("node:test");
const assert = require("node:assert/strict");
const { createComboService, validateCombo } = require("./comboService");

function validCombo(overrides = {}) {
  return {
    name: "Living room set",
    category: "Living Room Furniture",
    status: "Active",
    offer_type: "Percentage",
    offer: 10,
    offer_price_mode: "auto",
    combo_items: [
      { product_id: 1, quantity: 1, variant_index: 0 },
      { product_id: 2, quantity: 2, variant_index: 0 },
    ],
    ...overrides,
  };
}

test("rejects duplicate products in a combo", () => {
  assert.throws(
    () => validateCombo(validCombo({
      combo_items: [
        { product_id: 1, quantity: 1 },
        { product_id: 1, quantity: 2 },
      ],
    })),
    { status: 400, message: "A product cannot be added to a combo more than once." },
  );
});

test("validates combo specification names and values", () => {
  assert.throws(
    () => validateCombo(validCombo({ specifications: [{ name: "Material", value: "" }] })),
    { status: 400, message: "Combo specification 1 must include a name and a value." },
  );
});

test("lists the current available stock from combo component inventory", async () => {
  const comboRow = {
    id: 32,
    legacy_product_id: null,
    combo_code: "QFC-2026-00032",
    name: "Living room set",
    category: "Living Room Furniture",
    mrp: 500,
    offer: 10,
    offer_type: "Percentage",
    offer_price: 450,
    selling_price: 450,
    total_stock: 10,
    rating: 5,
    status: "Active",
    combo_data: JSON.stringify({
      combo_items: [
        { product_id: 1, quantity: 1, variant_index: 0 },
        { product_id: 2, quantity: 2, variant_index: 0 },
      ],
    }),
  };
  const pool = {
    async execute(sql) {
      if (sql.startsWith("SELECT * FROM combos")) return [[comboRow]];
      if (sql.includes("FROM products p")) {
        return [[
          { id: 1, status: "Active", total_stock: 10, available_stock: 5, product_data: "{}" },
          { id: 2, status: "Active", total_stock: 8, available_stock: 6, product_data: "{}" },
        ]];
      }
      if (sql.startsWith("SELECT COUNT(*) AS total FROM combos")) return [[{ total: 1 }]];
      if (sql.includes("SUM(status = 'Active')")) {
        return [[{ total: 1, active: 1, inactive: 0, lowStock: 0 }]];
      }
      throw new Error(`Unexpected combo query: ${sql}`);
    },
  };

  const result = await createComboService(pool).list({ page: 1, limit: 10, status: "Active" });

  assert.equal(result.combos[0].total_stock, 3);
});

test("creates a combo in the separate combos table using catalog prices and stock", async () => {
  let insertedValues;
  const comboRow = {
    id: 30,
    legacy_product_id: null,
    combo_code: "QFC-2026-00001",
    name: "Living room set",
    category: "Living Room Furniture",
    subcategory: null,
    mrp: 500,
    offer: 10,
    offer_type: "Percentage",
    offer_price: 450,
    selling_price: 450,
    total_stock: 2,
    rating: 5,
    status: "Active",
    combo_data: null,
  };
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params = []) {
      if (sql.startsWith("SELECT p.id, p.name")) {
        return [[
          { id: 1, name: "Sofa", product_data: JSON.stringify({ status: "Active", variants: [] }), selling_price: 200, offer_price: 200, mrp: 200, available_stock: 2 },
          { id: 2, name: "Table", product_data: JSON.stringify({ status: "Active", variants: [] }), selling_price: 150, offer_price: 150, mrp: 150, available_stock: 4 },
        ]];
      }
      if (sql.startsWith("SELECT COALESCE(MAX")) return [[{ lastSequence: 0 }]];
      if (sql.startsWith("SELECT id FROM combos")) return [[]];
      if (sql.startsWith("INSERT INTO combos")) {
        insertedValues = params;
        comboRow.combo_data = params[12];
        return [{ insertId: 30 }];
      }
      if (sql.startsWith("SELECT * FROM combos")) return [[comboRow]];
      throw new Error(`Unexpected combo query: ${sql}`);
    },
  };
  const pool = {
    getConnection: async () => connection,
    async execute(sql) {
      if (sql.startsWith("SELECT * FROM combos")) return [[comboRow]];
      throw new Error(`Unexpected pool query: ${sql}`);
    },
  };

  const created = await createComboService(pool).create(validCombo({
    combo_code: "QFC-2026-00099",
    specifications: [{ name: "Material", value: "Solid wood" }],
  }), "admin-1");

  assert.equal(insertedValues.length, 13);
  assert.equal(insertedValues[0], "QFC-2026-00001");
  assert.equal(created.id, 30);
  assert.equal(created.product_type, "Combo Product");
  assert.equal(created.mrp, 500);
  assert.equal(created.offer_price, 450);
  assert.equal(created.total_stock, 2);
  assert.equal(created.combo_items.length, 2);
  assert.deepEqual(created.specifications, [{ name: "Material", value: "Solid wood" }]);
});

test("saves manually entered combo MRP and offer price", async () => {
  let insertedValues;
  const comboRow = { id: 31, legacy_product_id: null };
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params = []) {
      if (sql.startsWith("SELECT p.id, p.name")) {
        return [[
          { id: 1, name: "Sofa", product_data: JSON.stringify({ status: "Active", variants: [] }), selling_price: 200, offer_price: 200, mrp: 200, available_stock: 2 },
          { id: 2, name: "Table", product_data: JSON.stringify({ status: "Active", variants: [] }), selling_price: 150, offer_price: 150, mrp: 150, available_stock: 4 },
        ]];
      }
      if (sql.startsWith("SELECT COALESCE(MAX")) return [[{ lastSequence: 0 }]];
      if (sql.startsWith("SELECT id FROM combos")) return [[]];
      if (sql.startsWith("INSERT INTO combos")) {
        insertedValues = params;
        [
          "combo_code", "name", "category", "subcategory", "mrp", "offer",
          "offer_type", "offer_price", "selling_price", "total_stock", "rating",
          "status", "combo_data",
        ].forEach((key, index) => { comboRow[key] = params[index]; });
        return [{ insertId: 31 }];
      }
      if (sql.startsWith("SELECT * FROM combos")) return [[comboRow]];
      throw new Error(`Unexpected combo query: ${sql}`);
    },
  };
  const pool = {
    getConnection: async () => connection,
    async execute(sql) {
      throw new Error(`Unexpected pool query: ${sql}`);
    },
  };

  const created = await createComboService(pool).create(validCombo({
    price_mode: "manual",
    mrp: 700,
    offer_price: 620,
  }), "admin-1");

  assert.equal(insertedValues[4], 700);
  assert.equal(insertedValues[7], 620);
  assert.equal(created.mrp, 700);
  assert.equal(created.offer_price, 620);
});
