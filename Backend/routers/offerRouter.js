const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

const offerIcons = new Set([
  "Tag",
  "Sparkles",
  "ShoppingBag",
  "Gift",
  "Zap",
  "Percent",
  "Heart",
  "Star",
  "ShoppingCart",
]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseId(value) {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    throw badRequest("Offer ID must be a positive integer.");
  }
  return id;
}

function normalizeBoolean(value, field) {
  if ([true, 1, "1", "true"].includes(value)) return true;
  if ([false, 0, "0", "false"].includes(value)) return false;
  throw badRequest(`${field} must be true or false.`);
}

function normalizeOffer(input) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const icon = input.icon || "Tag";
  const status = input.status || "active";
  const percentage = Number(input.offer_percentage);

  if (!title || title.length > 160) {
    throw badRequest("Offer title is required and must be 160 characters or fewer.");
  }
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw badRequest("Offer percentage must be between 0 and 100.");
  }
  if (description.length > 5000) {
    throw badRequest("Description must be 5,000 characters or fewer.");
  }
  if (!offerIcons.has(icon)) throw badRequest("Choose a valid offer icon.");
  if (!["active", "inactive"].includes(status)) throw badRequest("Status must be active or inactive.");

  return {
    title,
    offer_percentage: percentage,
    description,
    icon,
    status,
    show_in_header: normalizeBoolean(input.show_in_header ?? false, "Header visibility"),
  };
}

function createOfferRouter(offerService) {
  const router = express.Router();

  router.get("/header", async (request, response, next) => {
    try {
      return response.json({ offers: await offerService.listHeaderOffers() });
    } catch (error) {
      return next(error);
    }
  });

  router.use(requireAuthentication, requireAdmin);

  router.get("/", async (request, response, next) => {
    try {
      return response.json({ offers: await offerService.list() });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const offer = await offerService.create(normalizeOffer(request.body || {}));
      return response.status(201).json({ offer });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.patch("/:id/header", async (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const showInHeader = normalizeBoolean(request.body?.show_in_header, "Header visibility");
      const offer = await offerService.updateHeaderVisibility(id, showInHeader);
      if (!offer) return response.status(404).json({ message: "Offer was not found." });
      return response.json({ offer });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const offer = await offerService.update(id, normalizeOffer(request.body || {}));
      if (!offer) return response.status(404).json({ message: "Offer was not found." });
      return response.json({ offer });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const deleted = await offerService.delete(parseId(request.params.id));
      if (!deleted) return response.status(404).json({ message: "Offer was not found." });
      return response.json({ message: "Offer deleted successfully." });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createOfferRouter;
module.exports.normalizeOffer = normalizeOffer;
