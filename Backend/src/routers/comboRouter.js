const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function parseId(value) {
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    const error = new Error("Combo ID must be a positive integer.");
    error.status = 400;
    throw error;
  }
  return Number(value);
}

function createComboRouter(comboService) {
  const router = express.Router();

  router.get("/", async (request, response, next) => {
    try {
      const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 25));
      const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
      const status = typeof request.query.status === "string" ? request.query.status : "All";
      const legacyProductId = request.query.legacy_product_id
        ? parseId(String(request.query.legacy_product_id))
        : null;
      return response.json(await comboService.list({ page, limit, search, status, legacyProductId }));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/latest-code", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      return response.json({ latestCode: await comboService.generateCode() });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const combo = await comboService.getById(parseId(request.params.id));
      if (!combo) return response.status(404).json({ message: "Combo was not found." });
      return response.json(combo);
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.post("/", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const combo = await comboService.create(request.body || {}, request.auth.user_id);
      return response.status(201).json(combo);
    } catch (error) {
      if (error.status === 400 || error.status === 409) {
        return response.status(error.status).json({ message: error.message });
      }
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "A combo with this code already exists." });
      }
      return next(error);
    }
  });

  router.put("/:id", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const combo = await comboService.update(parseId(request.params.id), request.body || {}, request.auth.user_id);
      if (!combo) return response.status(404).json({ message: "Combo was not found." });
      return response.json(combo);
    } catch (error) {
      if (error.status === 400 || error.status === 404 || error.status === 409) {
        return response.status(error.status).json({ message: error.message });
      }
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "A combo with this code already exists." });
      }
      return next(error);
    }
  });

  router.delete("/:id", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const deleted = await comboService.delete(parseId(request.params.id));
      if (!deleted) return response.status(404).json({ message: "Combo was not found." });
      return response.json({ message: "Combo deleted successfully." });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createComboRouter;
