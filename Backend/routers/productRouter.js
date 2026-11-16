const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseNumber(value, field, fallback) {
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    throw badRequest(`${field} is required.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw badRequest(`${field} must be a valid number.`);
  }
  return number;
}

function normalizeProduct(body, existing = {}) {
  const input = { ...existing, ...body };
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const productCode = typeof input.product_code === "string" ? input.product_code.trim() : "";
  const subcategory = typeof input.subcategory === "string" ? input.subcategory.trim() : "";

  if (!name || name.length > 191) {
    throw badRequest("Product name is required and must be 191 characters or fewer.");
  }
  if (!category || category.length > 191) {
    throw badRequest("Product category is required and must be 191 characters or fewer.");
  }
  if (productCode.length > 128) {
    throw badRequest("Product SKU must be 128 characters or fewer.");
  }

  const mrp = parseNumber(input.mrp, "MRP");
  if (mrp <= 0) throw badRequest("MRP must be greater than zero.");

  const offerType = input.offer_type || "Percentage";
  if (!["Percentage", "Fixed Amount"].includes(offerType)) {
    throw badRequest("Offer type must be Percentage or Fixed Amount.");
  }
  const offer = parseNumber(input.offer, "Offer", 0);
  if (offer < 0 || (offerType === "Percentage" && offer > 100)) {
    throw badRequest("Offer value is outside the allowed range.");
  }

  const calculatedOfferPrice = Math.max(
    0,
    offerType === "Percentage" ? mrp * (1 - offer / 100) : mrp - offer,
  );
  const offerPrice = parseNumber(input.offer_price, "Offer price", calculatedOfferPrice);
  if (offerPrice < 0 || offerPrice > mrp) {
    throw badRequest("Offer price must be between zero and MRP.");
  }

  const sellingPrice = parseNumber(input.selling_price, "Selling price", offerPrice);
  if (sellingPrice < 0 || sellingPrice > mrp) {
    throw badRequest("Selling price must be between zero and MRP.");
  }

  const totalStock = parseNumber(input.total_stock ?? input.stock, "Available stock", 0);
  if (!Number.isInteger(totalStock) || totalStock < 0) {
    throw badRequest("Available stock must be a non-negative whole number.");
  }

  const rating = parseNumber(input.rating, "Product rating", 5);
  if (rating < 1 || rating > 5) {
    throw badRequest("Product rating must be between 1 and 5.");
  }

  const status = input.status || "Active";
  if (!["Active", "Inactive", "Draft"].includes(status)) {
    throw badRequest("Product status must be Active, Inactive, or Draft.");
  }

  const data = { ...input };
  delete data.id;
  delete data.inventory_status;
  delete data.created_at;
  delete data.updated_at;
  Object.assign(data, {
    name,
    product_code: productCode,
    category,
    subcategory,
    mrp,
    offer,
    offer_type: offerType,
    offer_price: offerPrice,
    selling_price: sellingPrice,
    total_stock: totalStock,
    rating,
    status,
  });

  return {
    id: existing.id,
    product_code: productCode,
    name,
    category,
    subcategory,
    mrp,
    offer,
    offer_type: offerType,
    offer_price: offerPrice,
    selling_price: sellingPrice,
    total_stock: totalStock,
    rating,
    status,
    data,
  };
}

function parseId(value) {
  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw badRequest("Product ID must be a positive integer.");
  }
  return Number(value);
}

function createProductRouter(productService) {
  const router = express.Router();

  router.get("/", async (request, response, next) => {
    try {
      const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 10));
      const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
      const status = typeof request.query.status === "string" ? request.query.status : "All";
      return response.json(await productService.list({ page, limit, search, status }));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/latest-code", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      return response.json({ latestCode: await productService.generateCode() });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const product = await productService.getById(parseId(request.params.id));
      if (!product) return response.status(404).json({ message: "Product was not found." });
      return response.json(product);
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.post("/", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const product = await productService.create(normalizeProduct(request.body || {}), request.auth.user_id);
      return response.status(201).json(product);
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "A product with this SKU already exists." });
      }
      return next(error);
    }
  });

  router.put("/:id", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const existing = await productService.getById(id);
      if (!existing) return response.status(404).json({ message: "Product was not found." });
      const product = await productService.update(id, normalizeProduct(request.body || {}, existing), request.auth.user_id);
      return response.json(product);
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "A product with this SKU already exists." });
      }
      return next(error);
    }
  });

  router.delete("/:id", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const deleted = await productService.delete(parseId(request.params.id));
      if (!deleted) return response.status(404).json({ message: "Product was not found." });
      return response.json({ message: "Product deleted successfully." });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createProductRouter;
