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
    comboId: null,
    quantity: 2,
    variantColor: "Black",
    variantSize: "Standard",
    comboItems: null,
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
    null,
    null,
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

test("hydrates combo order items with their included product details", async () => {
  const comboItems = [
    { product_id: 7, quantity: 1, variant_index: 0, variant_color: "Cream", variant_size: "3 Seater" },
    { product_id: 8, quantity: 2, variant_index: 0, variant_color: "Walnut", variant_size: "Standard" },
  ];
  const pool = {
    async execute(query, parameters) {
      if (query.startsWith("SELECT * FROM orders")) {
        return [[{ id: 16, order_id: "ORD0016", total_amount: "500.00" }]];
      }
      if (query.includes("FROM `address`")) return [[]];
      if (query.includes("FROM order_items")) {
        return [[{
          id: 5,
          order_id: 16,
          product_id: null,
          combo_id: 3,
          combo_snapshot: JSON.stringify({ combo_items: comboItems }),
          product_name: "Living Room Combo",
          price: "500.00",
          quantity: 2,
          total: "1000.00",
          image: "/uploads/combo.webp",
        }]];
      }
      if (query.startsWith("SELECT id, name, product_data FROM products")) {
        assert.deepEqual(parameters, [7, 8]);
        return [[
          {
            id: 7,
            name: "Three-Seater Sofa",
            product_data: JSON.stringify({ variants: [{ images: ["/uploads/sofa.webp"] }] }),
          },
          {
            id: 8,
            name: "Coffee Table",
            product_data: JSON.stringify({ images: ["/uploads/table.webp"] }),
          },
        ]];
      }
      throw new Error(`Unexpected SQL in test: ${query}`);
    },
  };

  const order = await createOrderService(pool).getById(16);

  assert.equal(order.items[0].item_type, "combo");
  assert.deepEqual(order.items[0].combo_items.map((item) => ({
    product_name: item.product_name,
    image: item.image,
    quantity: item.quantity,
  })), [
    { product_name: "Three-Seater Sofa", image: "/uploads/sofa.webp", quantity: 1 },
    { product_name: "Coffee Table", image: "/uploads/table.webp", quantity: 2 },
  ]);
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

test("creates a combo order at its cart price and deducts component inventory transactionally", async () => {
  const component = {
    id: 7,
    name: "Dining Chair",
    product_code: "CHAIR-7",
    status: "Active",
    total_stock: 5,
    available_stock: 5,
    product_data: JSON.stringify({
      variants: [{ color: "Black", size: "Standard", stock: 5 }],
    }),
  };
  const combo = {
    id: 3,
    name: "Living Room Combo",
    offer_price: "90.00",
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
  const productUpdates = [];
  const stockUpdates = [];
  const insertedItems = [];
  let committed = false;
  const connection = {
    async beginTransaction() {},
    async execute(query, parameters) {
      if (query.includes("FROM combos WHERE id = ?")) return [[combo]];
      if (query.includes("FROM products p")) return [[component]];
      if (query.startsWith("UPDATE products")) {
        productUpdates.push(parameters);
        component.total_stock = parameters[0];
        component.product_data = parameters[1];
        return [{ affectedRows: 1 }];
      }
      if (query.startsWith("INSERT INTO product_stock")) {
        stockUpdates.push(parameters);
        return [{ affectedRows: 1 }];
      }
      if (query.startsWith("INSERT INTO orders")) return [{ insertId: 44 }];
      if (query.startsWith("UPDATE orders SET order_id")) return [{ affectedRows: 1 }];
      if (query.startsWith("INSERT INTO `address`")) return [{ affectedRows: 1 }];
      if (query.startsWith("INSERT INTO order_items")) {
        insertedItems.push(parameters);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL in test: ${query}`);
    },
    async commit() { committed = true; },
    async rollback() {},
    release() {},
  };
  const service = createOrderService({ async getConnection() { return connection; } });

  const order = await service.create(validOrder({
    items: [{
      combo_id: 3,
      product_id: null,
      combo_items: combo.combo_data && JSON.parse(combo.combo_data).combo_items,
      quantity: 2,
      price: 85,
    }],
  }), { useCartPrices: true });

  assert.equal(order.subtotal, 170);
  assert.equal(order.items[0].combo_id, 3);
  assert.equal(order.items[0].product_id, null);
  assert.equal(order.items[0].price, 85);
  assert.equal(order.items[0].image, "/uploads/combo.webp");
  assert.equal(productUpdates.length, 1);
  assert.equal(productUpdates[0][0], 1);
  assert.equal(JSON.parse(productUpdates[0][1]).variants[0].stock, 1);
  assert.deepEqual(stockUpdates, [[7, 1]]);
  assert.equal(insertedItems[0][1], null);
  assert.equal(insertedItems[0][2], 3);
  assert.equal(JSON.parse(insertedItems[0][3]).combo_items[0].product_id, 7);
  assert.equal(insertedItems[0][5], 85);
  assert.equal(committed, true);
});

test("rolls back combo checkout when a component has insufficient stock", async () => {
  const comboItems = [{
    product_id: 7,
    quantity: 2,
    variant_index: 0,
    variant_color: "Black",
    variant_size: "Standard",
  }];
  const connection = {
    async beginTransaction() {},
    async execute(query) {
      if (query.includes("FROM combos WHERE id = ?")) {
        return [[{
          id: 3,
          name: "Living Room Combo",
          offer_price: "90.00",
          status: "Active",
          combo_data: JSON.stringify({ combo_items: comboItems }),
        }]];
      }
      if (query.includes("FROM products p")) {
        return [[{
          id: 7,
          name: "Dining Chair",
          status: "Active",
          total_stock: 3,
          available_stock: 3,
          product_data: JSON.stringify({ variants: [{ stock: 3 }] }),
        }]];
      }
      assert.fail(`Unexpected SQL in test: ${query}`);
    },
    async commit() { assert.fail("Insufficient stock must not commit."); },
    async rollback() { rolledBack = true; },
    release() {},
  };
  let rolledBack = false;
  const service = createOrderService({ async getConnection() { return connection; } });

  await assert.rejects(
    service.create(validOrder({
      items: [{ combo_id: 3, product_id: null, combo_items: comboItems, quantity: 2, price: 85 }],
    }), { useCartPrices: true }),
    { status: 409, message: "There is not enough stock for Dining Chair." },
  );
  assert.equal(rolledBack, true);
});
