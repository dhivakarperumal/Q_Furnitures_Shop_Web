const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

const DEALER_TYPES = new Set([
  "Retail Dealer",
  "Wholesale Dealer",
  "Distributor",
  "Furniture Reseller",
  "Corporate Dealer",
  "Franchise Dealer",
]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function text(value, maxLength = 255) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function money(value, field, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 999999999999) {
    throw badRequest(`${field} must be a non-negative amount.`);
  }
  return Math.round(number * 100) / 100;
}

function normalizeDealer(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw badRequest("Dealer details are required.");
  }
  const name = text(input.name || input.company_name, 191);
  const companyName = text(input.company_name || name, 191);
  const mobile = text(input.mobile || input.phone, 32);
  const email = text(input.email, 191).toLowerCase();
  const status = text(input.status || "Active", 16);
  const dealerType = text(input.dealer_type || "Retail Dealer", 48);
  const gstin = text(input.gstin, 15).toUpperCase();
  const pan = text(input.pan, 10).toUpperCase();

  if (!name) throw badRequest("Dealer name is required.");
  if (!mobile) throw badRequest("Mobile number is required.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest("Enter a valid email address.");
  if (gstin && !/^[0-9A-Z]{15}$/.test(gstin)) throw badRequest("GSTIN must contain 15 letters or numbers.");
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) throw badRequest("Enter a valid PAN number.");
  if (!DEALER_TYPES.has(dealerType)) throw badRequest("Choose a valid dealer type.");
  if (!["Active", "Inactive"].includes(status)) throw badRequest("Dealer status must be Active or Inactive.");

  return {
    name,
    company_name: companyName,
    contact_person: text(input.contact_person || input.contact, 191),
    mobile,
    whatsapp: text(input.whatsapp, 32),
    email: email || null,
    gstin: gstin || null,
    pan: pan || null,
    dealer_type: dealerType,
    dealer_category: text(input.dealer_category, 100),
    billing_address: text(input.billing_address || input.location, 2000),
    shipping_address: text(input.shipping_address || input.location, 2000),
    city: text(input.city, 100),
    district: text(input.district, 100),
    state: text(input.state, 100),
    pincode: text(input.pincode, 12),
    opening_balance: money(input.opening_balance, "Opening balance"),
    credit_limit: money(input.credit_limit, "Credit limit"),
    payment_terms: text(input.payment_terms, 100),
    status,
    notes: text(input.notes, 5000),
  };
}

function parseId(value) {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    throw badRequest("Dealer ID must be a positive integer.");
  }
  return id;
}

function createDealerRouter(dealerService) {
  const router = express.Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/", async (request, response, next) => {
    try {
      const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 100));
      const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
      const status = typeof request.query.status === "string" ? request.query.status : "All";
      const dealerType = typeof request.query.dealer_type === "string" ? request.query.dealer_type : "All";
      return response.json(await dealerService.list({ page, limit, search, status, dealerType }));
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const dealer = await dealerService.create(normalizeDealer(request.body));
      return response.status(201).json({ dealer });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") return response.status(409).json({ message: "Dealer email, mobile, GSTIN, or PAN already exists." });
      return next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const dealer = await dealerService.getProfile(parseId(request.params.id));
      if (!dealer) return response.status(404).json({ message: "Dealer was not found." });
      return response.json({ dealer });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    try {
      const dealer = await dealerService.update(parseId(request.params.id), normalizeDealer(request.body));
      if (!dealer) return response.status(404).json({ message: "Dealer was not found." });
      return response.json({ dealer });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") return response.status(409).json({ message: "Dealer email, mobile, GSTIN, or PAN already exists." });
      return next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const deleted = await dealerService.delete(parseId(request.params.id));
      if (!deleted) return response.status(404).json({ message: "Dealer was not found." });
      return response.json({ message: "Dealer deleted successfully." });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createDealerRouter;
module.exports.normalizeDealer = normalizeDealer;
