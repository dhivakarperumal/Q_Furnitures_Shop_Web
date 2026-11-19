const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

const couponScopes = new Set([
  "all",
  "first_order_only",
  "new_customers_only",
  "specific_products",
  "specific_categories",
]);

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseId(value) {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    throw badRequest("Coupon ID must be a positive integer.");
  }
  return id;
}

function parseNumber(value, field, fallback) {
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    throw badRequest(`${field} is required.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw badRequest(`${field} must be a valid number.`);
  return number;
}

function normalizeIdArray(value, field) {
  if (value == null) return [];
  let ids = value;
  if (typeof ids === "string") {
    try {
      ids = JSON.parse(ids);
    } catch {
      throw badRequest(`${field} must be a list of IDs.`);
    }
  }
  if (!Array.isArray(ids)) throw badRequest(`${field} must be a list of IDs.`);
  const normalized = ids.map(Number);
  if (normalized.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw badRequest(`${field} contains an invalid ID.`);
  }
  return [...new Set(normalized)];
}

function normalizeDateTime(value, field) {
  if (typeof value !== "string") throw badRequest(`${field} is required.`);
  const normalized = value.trim().replace("T", " ");
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})(?::(\d{2}))?$/);
  if (!match) throw badRequest(`${field} must be a valid date and time.`);
  const [datePart, timePart] = match[1].split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 ||
      (match[2] !== undefined && Number(match[2]) > 59)) {
    throw badRequest(`${field} must be a valid date and time.`);
  }
  return `${match[1]}:${match[2] || "00"}`;
}

function normalizeCoupon(body, existing = {}) {
  const input = { ...existing, ...body };
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const discountType = input.discount_type || "percentage";
  const status = input.status || "active";
  const couponScope = input.coupon_scope || "all";
  const discountValue = parseNumber(input.discount_value, "Discount value");
  const minOrderValue = parseNumber(input.min_order_value, "Minimum order value", 0);
  const usageLimitPerCustomer = parseNumber(input.usage_limit_per_customer, "Per-customer usage limit", 1);
  const usageLimitGlobal = input.usage_limit_global === "" || input.usage_limit_global == null
    ? null
    : parseNumber(input.usage_limit_global, "Global usage limit");
  const startDate = normalizeDateTime(input.start_date, "Start date");
  const expiryDate = normalizeDateTime(input.expiry_date, "Expiry date");
  const applicableProductIds = normalizeIdArray(input.applicable_product_ids, "Product IDs");
  const applicableCategoryIds = normalizeIdArray(input.applicable_category_ids, "Category IDs");
  const applicableSubcategoryIds = normalizeIdArray(input.applicable_subcategory_ids, "Subcategory IDs");

  if (!code || code.length > 64 || !/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) {
    throw badRequest("Coupon code may contain only letters, numbers, hyphens, and underscores.");
  }
  if (!name || name.length > 160) throw badRequest("Coupon name is required and must be 160 characters or fewer.");
  if (description.length > 5000) throw badRequest("Description must be 5,000 characters or fewer.");
  if (!["percentage", "fixed"].includes(discountType)) {
    throw badRequest("Discount type must be percentage or fixed.");
  }
  if (discountValue <= 0 || (discountType === "percentage" && discountValue > 100)) {
    throw badRequest("Discount value is outside the allowed range.");
  }
  if (minOrderValue < 0) throw badRequest("Minimum order value cannot be negative.");
  if (!Number.isInteger(usageLimitPerCustomer) || usageLimitPerCustomer < 1) {
    throw badRequest("Per-customer usage limit must be a positive whole number.");
  }
  if (usageLimitGlobal !== null && (!Number.isInteger(usageLimitGlobal) || usageLimitGlobal < 1)) {
    throw badRequest("Global usage limit must be a positive whole number or blank.");
  }
  if (new Date(startDate.replace(" ", "T")).getTime() >= new Date(expiryDate.replace(" ", "T")).getTime()) {
    throw badRequest("Expiry date must be after the start date.");
  }
  if (!["active", "inactive"].includes(status)) throw badRequest("Status must be active or inactive.");
  if (!couponScopes.has(couponScope)) throw badRequest("Choose a valid coupon scope.");
  if (couponScope === "specific_products" && !applicableProductIds.length) {
    throw badRequest("Select at least one product for this coupon.");
  }
  if (couponScope === "specific_categories" && !applicableCategoryIds.length) {
    throw badRequest("Select at least one category for this coupon.");
  }

  return {
    code,
    name,
    description,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_value: minOrderValue,
    start_date: startDate,
    expiry_date: expiryDate,
    usage_limit_global: usageLimitGlobal,
    usage_limit_per_customer: usageLimitPerCustomer,
    usage_count: Number(existing.usage_count || 0),
    status,
    coupon_scope: couponScope,
    applicable_product_ids: applicableProductIds,
    applicable_category_ids: applicableCategoryIds,
    applicable_subcategory_ids: applicableSubcategoryIds,
  };
}

function createCouponRouter(couponService) {
  const router = express.Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/", async (request, response, next) => {
    try {
      return response.json({ success: true, coupons: await couponService.list() });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const coupon = await couponService.create(normalizeCoupon(request.body || {}));
      return response.status(201).json({ success: true, coupon });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "A coupon with this code already exists." });
      }
      return next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const existing = await couponService.getById(id);
      if (!existing) return response.status(404).json({ message: "Coupon was not found." });
      const coupon = await couponService.update(id, normalizeCoupon(request.body || {}, existing));
      if (!coupon) return response.status(404).json({ message: "Coupon was not found." });
      return response.json({ success: true, coupon });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "A coupon with this code already exists." });
      }
      return next(error);
    }
  });

  router.delete("/:id", async (request, response, next) => {
    try {
      const deleted = await couponService.delete(parseId(request.params.id));
      if (!deleted) return response.status(404).json({ message: "Coupon was not found." });
      return response.json({ success: true, message: "Coupon deleted successfully." });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createCouponRouter;
module.exports.normalizeCoupon = normalizeCoupon;
