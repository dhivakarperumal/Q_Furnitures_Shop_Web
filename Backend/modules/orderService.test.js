const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createOrderService, normalizeOrder } = require("./orderService");

function validOrder(overrides = {}) {
  return {
    user_id: "",
    customer_name: "Customer One",
    customer_email: "customer@example.com",
    customer_phone: "+91 98765 43210",
    street_address: "10 Market Road",
    city: "Tirupattur",
    district: "Tirupattur",
    state: "Tamil Nadu",
    country: "India",
    zip_code: "635601",
    order_type: "Shop",
    payment_method: "Cash",
    status: "Order Placed",
    items: [{ product_id: 7, quantity: 2, variant_color: "Black", variant_size: "Standard" }],
    ...overrides,
  };
}

test("normalizes the showroom order and ignores client-supplied prices", () => {
  const order = normalizeOrder(validOrder());

  assert.equal(order.orderType, "Shop");
  assert.equal(order.userId, null);
  assert.deepEqual(order.items, [{
    productId: 7,
    quantity: 2,
    variantColor: "Black",
    variantSize: "Standard",
  }]);
});

test("rejects orders without valid customer details or items", () => {
  assert.throws(() => normalizeOrder(validOrder({ items: [] })), /Add between 1 and 100 order items/);
  assert.throws(() => normalizeOrder(validOrder({ customer_phone: "" })), /Customer phone is required/);
  assert.throws(() => normalizeOrder(validOrder({
    items: [{ product_id: 7, quantity: 0 }],
  })), /quantity must be a whole number/);
});

test("creates an order, derives price, and decrements product and variant stock transactionally", async () => {
  const product = {
    id: 7,
    name: "Dining Chair",
    selling_price: "120.00",
    offer_price: "125.00",
    total_stock: 5,
    status: "Active",
    product_data: JSON.stringify({
      variants: [{
        color: "Black",
        size: "Standard",
        selling_price: 110,
        stock: 5,
        images: ["/uploads/chair.webp"],
      }],
    }),
  };
  let updatedProduct;
  let insertedOrder;
  let committed = false;
  let rolledBack = false;
  const connection = {
    async beginTransaction() {},
    async execute(query, parameters) {
      if (query.includes("FROM products WHERE id = ? FOR UPDATE")) return [[product]];
      if (query.startsWith("UPDATE products")) {
        updatedProduct = { stock: parameters[0], data: JSON.parse(parameters[1]) };
        return [{ affectedRows: 1 }];
      }
      if (query.startsWith("INSERT INTO orders")) {
        insertedOrder = parameters;
        return [{ insertId: 21 }];
      }
      throw new Error(`Unexpected SQL in test: ${query}`);
    },
    async commit() { committed = true; },
    async rollback() { rolledBack = true; },
    release() {},
  };
  const service = createOrderService({ async getConnection() { return connection; } });

  const order = await service.create(validOrder());

  assert.equal(order.id, 21);
  assert.equal(order.total_amount, 220);
  assert.equal(order.items[0].product_name, "Dining Chair");
  assert.equal(order.items[0].image, "/uploads/chair.webp");
  assert.equal(updatedProduct.stock, 3);
  assert.equal(updatedProduct.data.variants[0].stock, 3);
  assert.equal(insertedOrder.at(-1), JSON.stringify(order.items));
  assert.equal(committed, true);
  assert.equal(rolledBack, false);
});

test("rolls back when requested quantity exceeds available stock", async () => {
  let rolledBack = false;
  const connection = {
    async beginTransaction() {},
    async execute() {
      return [[{
        id: 7,
        name: "Dining Chair",
        selling_price: "120.00",
        total_stock: 1,
        status: "Active",
        product_data: JSON.stringify({ variants: [{ color: "Black", size: "Standard", stock: 1 }] }),
      }]];
    },
    async commit() {},
    async rollback() { rolledBack = true; },
    release() {},
  };
  const service = createOrderService({ async getConnection() { return connection; } });

  await assert.rejects(service.create(validOrder()), { status: 409 });
  assert.equal(rolledBack, true);
});
