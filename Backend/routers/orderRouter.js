const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");
const crypto = require("node:crypto");
const { calculateCartTotals, normalizeOrder } = require("../modules/orderService");

function checkoutItems(cartItems) {
  return cartItems.map((item) => ({
    product_id: item.product_id,
    ...(item.combo_id == null ? {} : {
      combo_id: item.combo_id,
      combo_items: item.combo_items,
    }),
    quantity: item.quantity,
    variant_color: item.colorName || item.variant_color || "",
    variant_size: item.size || item.variant_size || "",
    price: Number(item.price),
  }));
}

function checkoutPayload(body, userId, cartItems, paymentMethod) {
  return {
    ...body,
    user_id: userId,
    order_type: "Shop",
    status: "Order Placed",
    discount_type: "percentage",
    discount_value: 0,
    gst_rate: 3,
    payment_method: paymentMethod,
    items: checkoutItems(cartItems),
  };
}

function getCartFingerprint(cartItems) {
  const contents = cartItems
    .map((item) => {
      const parts = [item.id, item.product_id];
      if (item.combo_id != null) parts.push(item.combo_id);
      parts.push(
        item.quantity,
        item.price,
        item.colorName || item.variant_color || "",
        item.size || item.variant_size || "",
      );
      return parts.join(":");
    })
    .sort()
    .join("|");
  return crypto.createHash("sha256").update(contents).digest("hex");
}

function parseId(value) {
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    const error = new Error("Order ID must be a positive integer.");
    error.status = 400;
    throw error;
  }
  return Number(value);
}

function createOrderRouter(orderService, cartService, razorpayService) {
  const router = express.Router();
  const requireAdminAccess = [requireAuthentication, requireAdmin];

  router.post("/checkout", requireAuthentication, async (request, response, next) => {
    try {
      if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
        return response.status(400).json({ message: "Order data must be an object." });
      }
      if (!request.auth?.user_id) {
        return response.status(401).json({ message: "Sign in with a valid user account to check out." });
      }

      const cartItems = await cartService.list(request.auth.user_id);
      if (!cartItems.length) {
        return response.status(400).json({ message: "Your cart is empty." });
      }

      const orderData = checkoutPayload(request.body, request.auth.user_id, cartItems, request.body.payment_method);
      normalizeOrder(orderData);
      const order = await orderService.create(orderData, { useCartPrices: true });
      return response.status(201).json(order);
    } catch (error) {
      if ([400, 404, 409, 502, 503].includes(error.status)) {
        return response.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  });

  router.post("/checkout/payment-order", requireAuthentication, async (request, response, next) => {
    try {
      if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
        return response.status(400).json({ message: "Order data must be an object." });
      }
      if (!request.auth?.user_id) {
        return response.status(401).json({ message: "Sign in with a valid user account to check out." });
      }

      const cartItems = await cartService.list(request.auth.user_id);
      const orderData = checkoutPayload(request.body, request.auth.user_id, cartItems, "Online");
      normalizeOrder(orderData);
      const totals = calculateCartTotals(cartItems);
      const amount = Math.round(totals.totalAmount * 100);
      if (amount < 100) {
        return response.status(400).json({ message: "Online payment must be at least ₹1." });
      }
      const cartHash = getCartFingerprint(cartItems);
      const gatewayOrder = await razorpayService.createOrder(amount, crypto.randomUUID().replace(/-/g, ""), {
        user_id: String(request.auth.user_id),
        cart_hash: cartHash,
      });

      return response.status(201).json({
        key_id: razorpayService.getKeyId(),
        order_id: gatewayOrder.id,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
      });
    } catch (error) {
      if ([400, 404, 409, 502, 503].includes(error.status)) {
        return response.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  });

  router.post("/checkout/verify-payment", requireAuthentication, async (request, response, next) => {
    try {
      if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
        return response.status(400).json({ message: "Payment data must be an object." });
      }
      const userId = request.auth?.user_id;
      if (!userId) {
        return response.status(401).json({ message: "Sign in with a valid user account to check out." });
      }

      const paymentId = request.body.razorpay_payment_id;
      if (typeof request.body.razorpay_order_id !== "string" ||
          typeof paymentId !== "string" ||
          typeof request.body.razorpay_signature !== "string") {
        return response.status(400).json({ message: "Razorpay payment details are incomplete." });
      }
      const existingOrder = await orderService.getByRazorpayPaymentId(paymentId);
      if (existingOrder) {
        if (String(existingOrder.user_id) !== String(userId)) {
          return response.status(409).json({ message: "This payment is already linked to another order." });
        }
        return response.json(existingOrder);
      }

      const cartItems = await cartService.list(userId);
      const orderData = checkoutPayload(request.body, userId, cartItems, "Online");
      normalizeOrder(orderData);
      const totals = calculateCartTotals(cartItems);
      const amount = Math.round(totals.totalAmount * 100);
      const { payment, order: gatewayOrder } = await razorpayService.verifyPayment({
        orderId: request.body.razorpay_order_id,
        paymentId,
        signature: request.body.razorpay_signature,
        amount,
      });

      if (gatewayOrder.notes?.user_id !== String(userId) ||
          gatewayOrder.notes?.cart_hash !== getCartFingerprint(cartItems)) {
        return response.status(409).json({ message: "The cart changed after payment was started. Please contact support." });
      }

      const paymentMethod = ["upi", "card"].includes(String(payment.method).toLowerCase())
        ? String(payment.method).toLowerCase() === "upi" ? "UPI" : "Card"
        : "Online";
      let order;
      try {
        order = await orderService.create(
          { ...orderData, payment_method: paymentMethod },
          {
            useCartPrices: true,
            paymentStatus: "Paid",
            razorpayOrderId: gatewayOrder.id,
            razorpayPaymentId: payment.id,
          },
        );
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;
        order = await orderService.getByRazorpayPaymentId(payment.id);
        if (!order || String(order.user_id) !== String(userId)) throw error;
      }
      return response.status(201).json(order);
    } catch (error) {
      if ([400, 404, 409, 502, 503].includes(error.status)) {
        return response.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  });

  router.get("/mine", requireAuthentication, async (request, response, next) => {
    try {
      if (!request.auth?.user_id) {
        return response.status(401).json({ message: "Sign in with a valid user account to view your orders." });
      }
      return response.json(await orderService.listForUser(request.auth.user_id));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/", ...requireAdminAccess, async (request, response, next) => {
    try {
      return response.json(await orderService.list(request.query.status));
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", ...requireAdminAccess, async (request, response, next) => {
    try {
      const order = await orderService.create(request.body);
      return response.status(201).json(order);
    } catch (error) {
      if (error.status === 400 || error.status === 404 || error.status === 409) {
        return response.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  });

  router.put("/:id/status", ...requireAdminAccess, async (request, response, next) => {
    try {
      const order = await orderService.updateStatus(parseId(request.params.id), request.body);
      return response.json(order);
    } catch (error) {
      if ([400, 404, 409].includes(error.status)) {
        return response.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  });

  router.get("/:id", ...requireAdminAccess, async (request, response, next) => {
    try {
      const order = await orderService.getById(parseId(request.params.id));
      if (!order) return response.status(404).json({ message: "Order was not found." });
      return response.json(order);
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createOrderRouter;
