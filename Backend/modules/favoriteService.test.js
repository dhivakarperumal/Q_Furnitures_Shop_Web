const test = require("node:test");
const assert = require("node:assert/strict");
const { createFavoriteService } = require("./favoriteService");

test("lists active favorites belonging only to the requested user", async () => {
  const row = {
    id: 8,
    name: "Oak desk",
    category: "Desks",
    product_data: JSON.stringify({ images: ["/uploads/desk.webp"] }),
    offer_price: "1200.00",
    total_stock: 4,
    status: "Active",
  };
  let call;
  const service = createFavoriteService({
    async execute(sql, parameters) {
      call = { sql, parameters };
      return [[row]];
    },
  });

  const favorites = await service.listByUser("customer-a");
  assert.deepEqual(call.parameters, ["customer-a"]);
  assert.match(call.sql, /favorites\.user_id = \?/);
  assert.deepEqual(favorites[0], {
    id: 8,
    product_id: 8,
    product_code: "",
    name: "Oak desk",
    category: "Desks",
    subcategory: "",
    mrp: undefined,
    offer: undefined,
    offer_type: undefined,
    offer_price: "1200.00",
    selling_price: undefined,
    total_stock: 4,
    available_stock: 4,
    reserved_stock: 0,
    damaged_stock: 0,
    minimum_stock: 5,
    stock_type: "Ready-Made Furniture",
    deduction_rule: "deduct",
    rating: undefined,
    status: "Active",
    inventory_status: "Low Stock",
    created_at: undefined,
    updated_at: undefined,
    images: ["/uploads/desk.webp"],
    price: 1200,
    image: "/uploads/desk.webp",
  });
});

test("adds active products idempotently and removes only the requested user's favorite", async () => {
  const calls = [];
  const service = createFavoriteService({
    async execute(sql, parameters) {
      calls.push({ sql, parameters });
      return sql.startsWith("SELECT") ? [[{ id: 8 }]] : [{ affectedRows: 1 }];
    },
  });

  assert.equal(await service.add("customer-a", 8), true);
  assert.equal(await service.remove("customer-a", 8), true);
  assert.deepEqual(calls.map((call) => call.parameters), [[8], ["customer-a", 8], ["customer-a", 8]]);
  assert.match(calls[1].sql, /INSERT INTO user_favorites/);
  assert.match(calls[2].sql, /WHERE user_id = \? AND product_id = \?/);
});

test("does not add missing or inactive products", async () => {
  const service = createFavoriteService({
    async execute() {
      return [[]];
    },
  });

  assert.equal(await service.add("customer-a", 8), false);
});

test("treats an existing user/product favorite as an idempotent add", async () => {
  let insertAttempted = false;
  const service = createFavoriteService({
    async execute(sql) {
      if (sql.startsWith("SELECT")) return [[{ id: 8 }]];
      insertAttempted = true;
      const error = new Error("Duplicate favorite");
      error.code = "ER_DUP_ENTRY";
      throw error;
    },
  });

  assert.equal(await service.add("customer-a", 8), true);
  assert.equal(insertAttempted, true);
});
