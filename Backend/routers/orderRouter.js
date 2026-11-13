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

function createOrderRouter(orderService) {
  const router = express.Router();
  const requireAdminAccess = [requireAuthentication, requireAdmin];

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
