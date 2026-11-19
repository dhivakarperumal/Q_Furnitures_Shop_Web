const crypto = require("node:crypto");
const Razorpay = require("razorpay");

function paymentError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function reportGatewayError(action, error) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : null;
  const code = typeof error?.error?.code === "string"
    ? error.error.code
    : typeof error?.code === "string" ? error.code : null;
  const description = typeof error?.error?.description === "string"
    ? error.error.description.slice(0, 300)
    : typeof error?.description === "string" ? error.description.slice(0, 300) : null;

  console.error(`Razorpay ${action} failed`, { statusCode, code, description });
  return statusCode === 401 || statusCode === 403
    ? paymentError(
      502,
      "Razorpay authentication failed. Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are a matching pair from the same Test or Live mode, then restart the backend.",
    )
    : paymentError(502, `Could not ${action} with Razorpay. Check the backend log for the gateway error.`);
}

function createRazorpayService({
  keyId = process.env.RAZORPAY_KEY_ID,
  keySecret = process.env.RAZORPAY_KEY_SECRET,
  client,
} = {}) {
  let razorpayClient = client;

  function getClient() {
    if (!keyId || !keySecret) {
      throw paymentError(503, "Razorpay is not configured. Set the key ID and matching key secret in Backend/.env.");
    }
    if (!razorpayClient) {
      razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return razorpayClient;
  }

  return {
    getKeyId() {
      if (!keyId) {
        throw paymentError(503, "Razorpay is not configured. Set RAZORPAY_KEY_ID in Backend/.env.");
      }
      return keyId;
    },

    async createOrder(amount, receipt, notes) {
      const razorpay = getClient();
      try {
        return await razorpay.orders.create({
          amount,
          currency: "INR",
          receipt,
          notes,
        });
      } catch (error) {
        throw reportGatewayError("create a payment order", error);
      }
    },

    async verifyPayment({ orderId, paymentId, signature, amount, getExpectedAmount }) {
      if (typeof orderId !== "string" || !orderId ||
          typeof paymentId !== "string" || !paymentId ||
          typeof signature !== "string" || !signature) {
        throw paymentError(400, "Razorpay payment details are incomplete.");
      }

      const razorpay = getClient();
      const expectedSignature = crypto
        .createHmac("sha256", keySecret || "")
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
      const receivedSignature = Buffer.from(signature, "hex");
      const expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");
      if (receivedSignature.length !== expectedSignatureBuffer.length ||
          !crypto.timingSafeEqual(receivedSignature, expectedSignatureBuffer)) {
        throw paymentError(400, "Razorpay payment signature is invalid.");
      }

      let payment;
      let order;
      try {
        [payment, order] = await Promise.all([
          razorpay.payments.fetch(paymentId),
          razorpay.orders.fetch(orderId),
        ]);
      } catch (error) {
        throw reportGatewayError("verify the payment", error);
      }

      const expectedAmount = getExpectedAmount ? getExpectedAmount(order) : amount;
      if (!Number.isSafeInteger(expectedAmount) || expectedAmount < 0 ||
          payment.order_id !== orderId ||
          Number(payment.amount) !== expectedAmount || payment.currency !== "INR" ||
          Number(order.amount) !== expectedAmount || order.currency !== "INR") {
        throw paymentError(409, "Razorpay payment does not match this order or is not captured.");
      }
      if (payment.status === "authorized") {
        try {
          payment = await razorpay.payments.capture(paymentId, expectedAmount, "INR");
        } catch (error) {
          throw reportGatewayError("capture the payment", error);
        }
      }
      if (payment.status !== "captured") {
        throw paymentError(409, "Razorpay payment is not captured.");
      }

      return { payment, order };
    },
  };
}

module.exports = { createRazorpayService };
