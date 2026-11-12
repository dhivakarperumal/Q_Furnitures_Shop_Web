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
  let insertedOrderSql;
  let insertedAddress;
  const insertedItems = [];
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
        insertedOrderSql = query;
        insertedOrder = parameters;
        return [{ insertId: 21 }];
      }
      if (query.startsWith("INSERT INTO order_addresses")) {
        insertedAddress = parameters;
        return [{ affectedRows: 1 }];
      }
      if (query.startsWith("INSERT INTO order_items")) {
        insertedItems.push(parameters);
        return [{ affectedRows: 1 }];
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
  assert.match(insertedOrderSql, /\(user_id, customer_name, customer_email, customer_phone, order_type, payment_method/);
  assert.doesNotMatch(insertedOrderSql, /\b(address|street_address|items)\b/);
  assert.equal(insertedOrder.length, 8);
  assert.deepEqual(insertedAddress, [
    21,
    "10 Market Road",
    "10 Market Road",
    "Tirupattur",
    "Tirupattur",
    "Tamil Nadu",
    "India",
    "635601",
  ]);
  assert.deepEqual(insertedItems, [[
    21,
    7,
    "Dining Chair",
    110,
    2,
    220,
    "Black",
    "Standard",
    "/uploads/chair.webp",
  ]]);
  assert.equal(committed, true);
  assert.equal(rolledBack, false);
});

test("loads normalized address and item rows in the existing order response shape", async () => {
  const pool = {
    async execute(query) {
      if (query.startsWith("SELECT * FROM orders")) {
        return [[{
          id: 21,
          customer_name: "Customer One",
          total_amount: "220.00",
          status: "Order Placed",
        }]];
      }
      if (query.startsWith("SELECT * FROM order_addresses")) {
        return [[{
          order_id: 21,
          address: "10 Market Road",
          street_address: "10 Market Road",
          city: "Tirupattur",
          district: "Tirupattur",
          state: "Tamil Nadu",
          country: "India",
          zip_code: "635601",
        }]];
      }
      if (query.startsWith("SELECT * FROM order_items")) {
        return [[{
          id: 3,
          order_id: 21,
          product_id: 7,
          product_name: "Dining Chair",
          price: "110.00",
          quantity: 2,
          total: "220.00",
          variant_color: "Black",
          variant_size: "Standard",
          image: "/uploads/chair.webp",
        }]];
      }
      throw new Error(`Unexpected SQL in test: ${query}`);
    },
  };
  const order = await createOrderService(pool).getById(21);

  assert.equal(order.street_address, "10 Market Road");
  assert.equal(order.city, "Tirupattur");
  assert.deepEqual(order.shipping_address, {
    address: "10 Market Road",
    street_address: "10 Market Road",
    city: "Tirupattur",
    district: "Tirupattur",
    state: "Tamil Nadu",
    country: "India",
    zip_code: "635601",
  });
  assert.equal(order.items[0].name, "Dining Chair");
  assert.equal(order.items[0].price, 110);
  assert.equal(order.items[0].total, 220);
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
