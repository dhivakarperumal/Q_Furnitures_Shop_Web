const assert = require("node:assert/strict");
const { test } = require("node:test");
const { calculateCartTotals, calculateOrderAmounts, createOrderService, normalizeOrder } = require("./orderService");

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
  assert.equal(order.discountType, "percentage");
  assert.equal(order.discountValue, 0);
  assert.equal(order.gstRate, 3);
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
  assert.throws(() => normalizeOrder(validOrder({
    discount_type: "percentage",
    discount_value: 100.01,
  })), /Discount value must be between 0 and 100/);
  assert.throws(() => normalizeOrder(validOrder({ gst_rate: 100.01 })), /GST rate must be between 0 and 100/);
});

test("calculates GST before percentage or fixed discounts", () => {
  assert.deepEqual(calculateOrderAmounts(220, "percentage", 10, 3), {
    discountAmount: 22,
    gstAmount: 6.6,
    totalAmount: 204.6,
  });
  assert.deepEqual(calculateOrderAmounts(220, "fixed", 50, 3), {
    discountAmount: 50,
    gstAmount: 6.6,
    totalAmount: 176.6,
  });
  assert.throws(() => calculateOrderAmounts(220, "fixed", 221, 3), { status: 400 });
});

test("calculates checkout totals from saved cart prices", () => {
  assert.deepEqual(calculateCartTotals([
    { price: "110.00", quantity: 2 },
    { price: "19.95", quantity: 1 },
  ]), {
    subtotal: 239.95,
    discountAmount: 0,
    gstAmount: 7.2,
    totalAmount: 247.15,
  });
  assert.throws(() => calculateCartTotals([{ price: -1, quantity: 1 }]), { status: 409 });
});

test("lists customer orders using the authenticated customer's ID", async () => {
  let query;
  let parameters;
  const service = createOrderService({
    async execute(sql, values) {
      query = sql;
      parameters = values;
      return [[]];
    },
  });

  assert.deepEqual(await service.listForUser("customer-1"), []);
  assert.match(query, /WHERE user_id = \?/);
  assert.deepEqual(parameters, ["customer-1"]);
});

test("updates order status and stores validated shipping details", async () => {
  const orderRow = { id: 21, status: "Order Placed", total_amount: "226.60" };
  let updateQuery;
  let updateValues;
  const pool = {
    async execute(query, values) {
      if (query.startsWith("UPDATE orders SET")) {
        updateQuery = query;
        updateValues = values;
        orderRow.status = values[0];
        return [{ affectedRows: 1 }];
      }
      if (query.startsWith("SELECT * FROM orders")) return [[orderRow]];
      if (query.includes("FROM `address`")) return [[]];
      if (query.includes("FROM order_items")) return [[]];
      throw new Error(`Unexpected SQL in test: ${query}`);
    },
  };

  const order = await createOrderService(pool).updateStatus(21, {
    status: "Shipping",
    tracking_number: "AWB-21",
    courier_name: "Q Express",
    shipped_at: "2026-11-16T10:00:00.000Z",
  });

  assert.match(updateQuery, /status = \?, tracking_number = \?, courier_name = \?, shipped_at = \?/);
  assert.deepEqual(updateValues, ["Shipping", "AWB-21", "Q Express", "2026-11-16 10:00:00", 21]);
  assert.equal(order.status, "Shipping");
});

test("rejects invalid order status details", async () => {
  const service = createOrderService({ async execute() { assert.fail("Invalid updates must not reach the database."); } });

  await assert.rejects(
    service.updateStatus(21, { status: "Shipping", tracking_number: "AWB-21" }),
    { status: 400, message: "Courier name is required." },
  );
  await assert.rejects(
    service.updateStatus(21, { status: "Cancelled" }),
    { status: 400, message: "Cancellation reason is required." },
  );
  await assert.rejects(
    service.updateStatus(21, { status: "Unknown" }),
    { status: 400, message: "Order status is invalid." },
  );
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
  let persistedOrderId;
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
      if (query.startsWith("UPDATE orders SET order_id")) {
        persistedOrderId = parameters;
        return [{ affectedRows: 1 }];
      }
      if (query.startsWith("INSERT INTO `address`")) {
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

  const order = await service.create(validOrder({
    user_id: "customer-123",
    discount_type: "percentage",
    discount_value: 10,
    gst_rate: 3,
  }));

  assert.equal(order.id, 21);
  assert.equal(order.order_id, "ORD0021");
  assert.deepEqual(persistedOrderId, ["ORD0021", 21]);
  assert.equal(order.subtotal, 220);
  assert.equal(order.discount_amount, 22);
  assert.equal(order.gst_amount, 6.6);
  assert.equal(order.total_amount, 204.6);
  assert.equal(order.items[0].product_name, "Dining Chair");
  assert.equal(order.items[0].image, "/uploads/chair.webp");
  assert.equal(updatedProduct.stock, 3);
  assert.equal(updatedProduct.data.variants[0].stock, 3);
  assert.match(insertedOrderSql, /\(user_id, customer_name, customer_email, customer_phone, order_type, payment_method/);
  assert.doesNotMatch(insertedOrderSql, /\b(address|street_address|items)\b/);
  assert.match(insertedOrderSql, /subtotal, discount_type, discount_value, discount_amount/);
  assert.match(insertedOrderSql, /gst_rate, gst_amount, total_amount/);
  assert.equal(insertedOrder.length, 17);
  assert.equal(insertedOrder[6], "Pending");
  assert.deepEqual(insertedOrder.slice(8), [220, "percentage", 10, 22, 3, 6.6, 204.6, null, null]);
  assert.deepEqual(insertedAddress, [
    21,
    "customer-123",
    "Customer One",
    "customer@example.com",
    "+91 98765 43210",
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

test("creates paid checkout orders using saved cart price and unique Razorpay IDs", async () => {
  const product = {
    id: 7,
    name: "Dining Chair",
    selling_price: "120.00",
    offer_price: "125.00",
    total_stock: 5,
    status: "Active",
    product_data: JSON.stringify({
      variants: [{ color: "Black", size: "Standard", stock: 5 }],
    }),
  };
  let insertedOrder;
  const connection = {
    async beginTransaction() {},
    async execute(query, parameters) {
      if (query.includes("FROM products WHERE id = ? FOR UPDATE")) return [[product]];
      if (query.startsWith("UPDATE products")) return [{ affectedRows: 1 }];
      if (query.startsWith("INSERT INTO orders")) {
        insertedOrder = parameters;
        return [{ insertId: 31 }];
      }
      if (query.startsWith("UPDATE orders SET order_id")) return [{ affectedRows: 1 }];
      if (query.startsWith("INSERT INTO `address`")) return [{ affectedRows: 1 }];
      if (query.startsWith("INSERT INTO order_items")) return [{ affectedRows: 1 }];
      throw new Error(`Unexpected SQL in test: ${query}`);
    },
    async commit() {},
    async rollback() {},
    release() {},
  };
  const service = createOrderService({ async getConnection() { return connection; } });

  const order = await service.create(validOrder({
    payment_method: "Online",
    items: [{
      product_id: 7,
      quantity: 2,
      variant_color: "Black",
      variant_size: "Standard",
      price: 123,
    }],
  }), {
    useCartPrices: true,
    paymentStatus: "Paid",
    razorpayOrderId: "order_gateway_31",
    razorpayPaymentId: "payment_gateway_31",
  });

  assert.equal(order.subtotal, 246);
  assert.equal(order.total_amount, 253.38);
  assert.equal(order.payment_status, "Paid");
  assert.equal(order.razorpay_payment_id, "payment_gateway_31");
  assert.equal(insertedOrder[6], "Paid");
  assert.deepEqual(insertedOrder.slice(-2), ["order_gateway_31", "payment_gateway_31"]);
});

test("loads normalized address and item rows in the existing order response shape", async () => {
  const pool = {
    async execute(query) {
      if (query.startsWith("SELECT * FROM orders")) {
        return [[{
          id: 21,
          order_id: "ORD0021",
          customer_name: "Customer One",
          subtotal: "220.00",
          discount_type: "percentage",
          discount_value: "10.00",
          discount_amount: "22.00",
          gst_rate: "3.00",
          gst_amount: "6.60",
          total_amount: "204.60",
          status: "Order Placed",
        }]];
      }
      if (query.startsWith("SELECT * FROM `address`")) {
        return [[{
          order_id: 21,
          user_id: "customer-123",
          customer_name: "Customer One",
          customer_email: "customer@example.com",
          customer_phone: "+91 98765 43210",
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

  assert.equal(order.order_id, "ORD0021");
  assert.equal(order.street_address, "10 Market Road");
  assert.equal(order.shipping_address.user_id, "customer-123");
  assert.equal(order.shipping_address.customer_name, "Customer One");
  assert.equal(order.shipping_address.customer_email, "customer@example.com");
  assert.equal(order.shipping_address.customer_phone, "+91 98765 43210");
  assert.equal(order.city, "Tirupattur");
  assert.deepEqual(order.shipping_address, {
    user_id: "customer-123",
    customer_name: "Customer One",
    customer_email: "customer@example.com",
    customer_phone: "+91 98765 43210",
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
  assert.equal(order.subtotal, 220);
  assert.equal(order.discount_amount, 22);
  assert.equal(order.gst_rate, 3);
  assert.equal(order.gst_amount, 6.6);
  assert.equal(order.total_amount, 204.6);
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
