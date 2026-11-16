const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function parseId(value) {
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    const error = new Error("Order ID must be a positive integer.");
    error.status = 400;
    throw error;
  }
  return Number(value);
}

function createOrderRouter(orderService, cartService) {
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

      const order = await orderService.create({
        ...request.body,
        user_id: request.auth.user_id,
        order_type: "Shop",
        status: "Order Placed",
        discount_type: "percentage",
        discount_value: 0,
        gst_rate: 3,
        items: cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          variant_color: item.colorName || item.variant_color || "",
          variant_size: item.size || item.variant_size || "",
        })),
      });
      return response.status(201).json(order);
    } catch (error) {
      if ([400, 404, 409].includes(error.status)) {
        return response.status(error.status).json({ message: error.message });
      }
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
