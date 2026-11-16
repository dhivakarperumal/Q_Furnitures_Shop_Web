const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function positiveInteger(value, field, fallback) {
  if ((value === undefined || value === null || value === "") && fallback !== undefined) return fallback;
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw badRequest(`${field} must be a positive whole number.`);
  }
  return Number(value);
}

function validDate(value, field) {
  if (!value) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`${field} must be a valid date.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw badRequest(`${field} must be a valid date.`);
  }
  return value;
}

function createStockRouter(stockService) {
  const router = express.Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/", async (request, response, next) => {
    try {
      const page = positiveInteger(request.query.page, "Page", 1);
      const limit = Math.min(100, positiveInteger(request.query.limit, "Limit", 25));
      const search = typeof request.query.search === "string" ? request.query.search.trim().slice(0, 191) : "";
      return response.json(await stockService.list({ page, limit, search }));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/low-stock", async (request, response, next) => {
    try {
      const page = positiveInteger(request.query.page, "Page", 1);
      const limit = Math.min(100, positiveInteger(request.query.limit, "Limit", 25));
      return response.json(await stockService.list({ page, limit, lowStock: true }));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/movements", async (request, response, next) => {
    try {
      const page = positiveInteger(request.query.page, "Page", 1);
      const limit = Math.min(100, positiveInteger(request.query.limit, "Limit", 25));
      const productId = request.query.product_id ? positiveInteger(request.query.product_id, "Product ID") : null;
      const invoiceId = request.query.invoice_id ? positiveInteger(request.query.invoice_id, "Invoice ID") : null;
      const from = validDate(request.query.from, "Start date");
      const to = validDate(request.query.to, "End date");
      if (from && to && from > to) throw badRequest("Start date cannot be after end date.");
      const type = typeof request.query.type === "string" ? request.query.type : "";
      const types = ["Opening Stock", "Purchase Stock", "Sales Invoice", "Invoice Cancellation", "Sales Return", "Stock Adjustment", "Damaged Stock", "Stock Transfer"];
      if (type && !types.includes(type)) throw badRequest("Choose a valid stock transaction type.");
      return response.json(await stockService.listMovements({ page, limit, productId, invoiceId, from, to, type }));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.post("/adjustment", async (request, response, next) => {
    try {
      const productId = positiveInteger(request.body?.product_id, "Product ID");
      const quantityChange = Number(request.body?.quantity_change);
      const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
      if (!Number.isSafeInteger(quantityChange) || quantityChange === 0) {
        throw badRequest("Stock adjustment must be a non-zero whole number.");
      }
      if (!reason || reason.length > 191) throw badRequest("A reason up to 191 characters is required.");
      const result = await stockService.adjust({
        productId,
        quantityChange,
        reason,
        actor: request.auth.user_id,
      });
      return response.status(201).json({ adjustment: result });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/settings", async (request, response, next) => {
    try {
      return response.json({ allow_negative_stock: await stockService.getNegativeStockSetting() });
    } catch (error) {
      return next(error);
    }
  });

  router.put("/settings", async (request, response, next) => {
    try {
      if (typeof request.body?.allow_negative_stock !== "boolean") {
        throw badRequest("allow_negative_stock must be true or false.");
      }
      return response.json(await stockService.updateSettings({
        allowNegativeStock: request.body.allow_negative_stock,
      }));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createStockRouter;
