const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createRazorpayService } = require("./razorpayService");
const { calculateCartTotals } = require("./orderService");

function createPaymentClient() {
  const capturedAmounts = [];
  return {
    capturedAmounts,
    orders: {
      async fetch() {
        return { amount: 11800, currency: "INR", notes: { gst_rate: "18", tax_mode: "Tax Inclusive" } };
      },
    },
    payments: {
      async fetch() {
        return { order_id: "order-1", amount: 11800, currency: "INR", status: "authorized" };
      },
      async capture(paymentId, amount) {
        capturedAmounts.push(amount);
        return { id: paymentId, order_id: "order-1", amount, currency: "INR", status: "captured" };
      },
    },
  };
}

function getSignature(orderId, paymentId, secret) {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

test("verifies and captures using the amount derived from the payment order snapshot", async () => {
  const secret = "razorpay-test-secret";
  const client = createPaymentClient();
  const service = createRazorpayService({ keyId: "test-key", keySecret: secret, client });
  const verified = await service.verifyPayment({
    orderId: "order-1",
    paymentId: "payment-1",
    signature: getSignature("order-1", "payment-1", secret),
    getExpectedAmount: (order) => {
      const totals = calculateCartTotals(
        [{ price: 118, quantity: 1 }],
        Number(order.notes.gst_rate),
        order.notes.tax_mode,
      );
      return Math.round(totals.totalAmount * 100);
    },
  });

  assert.equal(verified.payment.status, "captured");
  assert.deepEqual(client.capturedAmounts, [11800]);
});

test("does not capture when the payment amount differs from its stored snapshot", async () => {
  const secret = "razorpay-test-secret";
  const client = createPaymentClient();
  const service = createRazorpayService({ keyId: "test-key", keySecret: secret, client });

  await assert.rejects(
    service.verifyPayment({
      orderId: "order-1",
      paymentId: "payment-1",
      signature: getSignature("order-1", "payment-1", secret),
      getExpectedAmount: () => 11799,
    }),
    { status: 409 },
  );
  assert.deepEqual(client.capturedAmounts, []);
});
