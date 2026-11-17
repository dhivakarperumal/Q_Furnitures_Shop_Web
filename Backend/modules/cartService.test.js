const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createCartService } = require("./cartService");

function createComboCartPool({ availableStock = 4 } = {}) {
  const combo = {
    id: 3,
    combo_code: "QFC-2026-00003",
    name: "Living Room Combo",
    category: "Living Room",
    mrp: "120.00",
    offer: "10.00",
    offer_type: "Percentage",
    offer_price: "108.00",
    selling_price: "108.00",
    total_stock: 2,
    status: "Active",
    combo_data: JSON.stringify({
      images: ["/uploads/combo.webp"],
      combo_items: [{
        product_id: 7,
        quantity: 2,
        variant_index: 0,
        variant_color: "Black",
        variant_size: "Standard",
      }],
    }),
  };
  const product = {
    id: 7,
    name: "Dining Chair",
    status: "Active",
    total_stock: availableStock,
    available_stock: availableStock,
    product_data: JSON.stringify({
      variants: [{ color: "Black", size: "Standard", stock: availableStock }],
    }),
  };
  const inserted = [];
  let rolledBack = false;
  const connection = {
    async beginTransaction() {},
    async execute(query, parameters) {
      if (query.includes("FROM combos WHERE id = ?")) return [[combo]];
      if (query.includes("FROM products p")) return [[product]];
      if (query.includes("SELECT id, quantity FROM `cart`")) return [[]];
      if (query.startsWith("INSERT INTO `cart`")) {
        inserted.push({ query, parameters });
        return [{ insertId: 12 }];
      }
      throw new Error(`Unexpected SQL in test: ${query}`);
    },
    async commit() {},
    async rollback() { rolledBack = true; },
    release() {},
  };
  return {
    pool: { async getConnection() { return connection; } },
    inserted,
    wasRolledBack: () => rolledBack,
  };
}

test("adds a combo at its saved price and stores its component snapshot", async () => {
  const fixture = createComboCartPool();
  const result = await createCartService(fixture.pool).add("customer-1", {
    combo_id: 3,
    quantity: 1,
    price: 1,
  });

  assert.deepEqual(result, {
    id: 12,
    combo_id: 3,
    quantity: 1,
    price: 108,
    total_price: 108,
    available_stock: 2,
  });
  assert.equal(fixture.inserted.length, 1);
  const [query, values] = [fixture.inserted[0].query, fixture.inserted[0].parameters];
  assert.match(query, /product_id, combo_id, combo_snapshot/);
  assert.equal(values[1], null);
  assert.equal(values[2], 3);
  assert.deepEqual(JSON.parse(values[3]).combo_items, [{
    product_id: 7,
    quantity: 2,
    variant_index: 0,
    variant_color: "Black",
    variant_size: "Standard",
  }]);
  assert.deepEqual(values.slice(-5), [108, 1, 108, "customer-1", "customer-1"]);
  assert.equal(fixture.wasRolledBack(), false);
});

test("rejects a combo when component inventory cannot fulfill it", async () => {
  const fixture = createComboCartPool({ availableStock: 3 });

  await assert.rejects(
    createCartService(fixture.pool).add("customer-1", { combo_id: 3, quantity: 2 }),
    { status: 409, message: "Only 1 combo available." },
  );
  assert.equal(fixture.inserted.length, 0);
  assert.equal(fixture.wasRolledBack(), true);
});
