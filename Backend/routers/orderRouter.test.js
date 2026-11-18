const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const createOrderRouter = require("./orderRouter");

test("checkout orders and Razorpay totals use server-side tax settings", async (t) => {
  const secret = "order-router-tax-test-secret";
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  const createdOrders = [];
  let gatewayOrderInput;
  const app = express();
  app.use(express.json());
  app.use("/api/orders", createOrderRouter(
    {
      async create(order) {
        createdOrders.push(order);
        return { order_id: "ORD0001" };
      },
    },
    {
      async list() {
        return [{ id: 1, product_id: 7, quantity: 1, price: 118 }];
      },
    },
    {
      async createOrder(amount, receipt, notes) {
        gatewayOrderInput = { amount, receipt, notes };
        return { id: "razorpay-order-1", amount, currency: "INR" };
      },
      getKeyId() {
        return "razorpay-test-key";
      },
    },
    {
      async getSettings() {
        return { gst_enabled: true, gst_rate: 18, tax_mode: "Tax Inclusive" };
      },
    },
  ));
  app.use((error, request, response, next) => {
    response.status(error.status || 500).json({ message: error.message });
  });
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  await new Promise((resolve) => server.once("listening", resolve));

  const token = jwt.sign({ role: "customer", user_id: "customer-1" }, secret);
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  const body = {
    customer_name: "Customer",
    customer_phone: "1234567890",
    street_address: "1 Main Street",
    city: "Chennai",
    state: "Tamil Nadu",
    zip_code: "600001",
    payment_method: "Cash",
    gst_rate: 3,
    tax_mode: "Tax Exclusive",
  };
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/orders/checkout`;

  const cashOrder = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  assert.equal(cashOrder.status, 201);
  assert.equal(createdOrders[0].gst_rate, 18);
  assert.equal(createdOrders[0].tax_mode, "Tax Inclusive");

  const paymentOrder = await fetch(`${baseUrl}/payment-order`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  assert.equal(paymentOrder.status, 201);
  assert.equal(gatewayOrderInput.amount, 11800);
  assert.equal(gatewayOrderInput.notes.user_id, "customer-1");
  assert.match(gatewayOrderInput.notes.cart_hash, /^[a-f0-9]{64}$/);
  assert.equal(gatewayOrderInput.notes.gst_rate, "18");
  assert.equal(gatewayOrderInput.notes.tax_mode, "Tax Inclusive");
});
