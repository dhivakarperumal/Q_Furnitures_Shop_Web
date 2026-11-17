const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { test } = require("node:test");
const { createRazorpayService } = require("./razorpayService");

test("creates Razorpay orders with INR amount and checkout notes", async () => {
  let orderInput;
  const service = createRazorpayService({
    keyId: "rzp_test_public",
    keySecret: "test-secret",
    client: {
      orders: {
        async create(input) {
          orderInput = input;
          return { id: "order_1", ...input };
        },
      },
    },
  });

  const order = await service.createOrder(22660, "receipt-1", {
    user_id: "customer-1",
    cart_hash: "cart-hash",
  });

  assert.equal(order.id, "order_1");
  assert.deepEqual(orderInput, {
    amount: 22660,
    currency: "INR",
    receipt: "receipt-1",
    notes: { user_id: "customer-1", cart_hash: "cart-hash" },
  });
});

test("verifies Razorpay signature and captures the matching authorized payment", async () => {
  const orderId = "order_1";
  const paymentId = "payment_1";
  const secret = "test-secret";
  const signature = crypto.createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const service = createRazorpayService({
    keyId: "rzp_test_public",
    keySecret: secret,
    client: {
      payments: {
        async fetch() {
          return {
            id: paymentId,
            order_id: orderId,
            status: "authorized",
            amount: 22660,
            currency: "INR",
            method: "upi",
          };
        },
        async capture(id, amount, currency) {
          assert.equal(id, paymentId);
          assert.equal(amount, 22660);
          assert.equal(currency, "INR");
          return {
            id: paymentId,
            order_id: orderId,
            status: "captured",
            amount,
            currency,
            method: "upi",
          };
        },
      },
      orders: {
        async fetch() {
          return { id: orderId, amount: 22660, currency: "INR" };
        },
      },
    },
  });

  const result = await service.verifyPayment({
    orderId,
    paymentId,
    signature,
    amount: 22660,
  });

  assert.equal(result.payment.id, paymentId);
  assert.equal(result.order.id, orderId);
});

test("rejects invalid payment signatures before contacting Razorpay", async () => {
  let called = false;
  const service = createRazorpayService({
    keyId: "rzp_test_public",
    keySecret: "test-secret",
    client: {
      payments: { async fetch() { called = true; } },
      orders: { async fetch() { called = true; } },
    },
  });

  await assert.rejects(
    service.verifyPayment({
      orderId: "order_1",
      paymentId: "payment_1",
      signature: "invalid",
      amount: 22660,
    }),
    { status: 400, message: "Razorpay payment signature is invalid." },
  );
  assert.equal(called, false);
});

test("reports missing gateway credentials explicitly", async () => {
  const service = createRazorpayService({ keyId: "", keySecret: "" });

  assert.throws(() => service.getKeyId(), { status: 503 });
  await assert.rejects(service.createOrder(100, "receipt", {}), { status: 503 });
});

test("reports mismatched Razorpay credentials without exposing gateway details", async () => {
  const originalConsoleError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  const service = createRazorpayService({
    keyId: "rzp_test_public",
    keySecret: "configured-secret",
    client: {
      orders: {
        async create() {
          const error = new Error("Authentication failed");
          error.statusCode = 401;
          error.error = {
            code: "BAD_REQUEST_ERROR",
            description: "Authentication failed",
            metadata: { key_secret: "must-not-be-logged" },
          };
          throw error;
        },
      },
    },
  });

  try {
    await assert.rejects(
      service.createOrder(100, "receipt", {}),
      {
        status: 502,
        message: "Razorpay authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are a matching pair from the same Test or Live mode, then restart the backend.",
      },
    );
    assert.deepEqual(logged, [[
      "Razorpay create a payment order failed",
      {
        statusCode: 401,
        code: "BAD_REQUEST_ERROR",
        description: "Authentication failed",
      },
    ]]);
    assert.doesNotMatch(JSON.stringify(logged), /must-not-be-logged|configured-secret/);
  } finally {
    console.error = originalConsoleError;
  }
});
