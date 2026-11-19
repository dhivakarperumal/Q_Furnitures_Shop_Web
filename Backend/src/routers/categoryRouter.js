const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function normalizeStringArray(value, fieldName) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    throw badRequest(`${fieldName} must be an array of strings.`);
  }
  return value.map((entry) => entry.trim()).filter(Boolean);
}

function normalizeCategory(body, includeCatId) {
  const catId = typeof body.catId === "string" ? body.catId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = body.description == null
    ? ""
    : typeof body.description === "string"
      ? body.description.trim()
      : null;

  if (includeCatId && (!catId || catId.length > 64)) {
    throw badRequest("Category ID is required and must be 64 characters or fewer.");
  }
  if (!name || name.length > 191) {
    throw badRequest("Category name is required and must be 191 characters or fewer.");
  }
  if (description === null || description.length > 10000) {
    throw badRequest("Category description must be a string of 10,000 characters or fewer.");
  }

  return {
    catId,
    name,
    description,
    subcategory: normalizeStringArray(body.subcategory, "Subcategories"),
    images: normalizeStringArray(body.images, "Images"),
  };
}

function createCategoryRouter(categoryService) {
  const router = express.Router();

  router.get("/", async (request, response, next) => {
    try {
      return response.json(await categoryService.list());
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const category = normalizeCategory(request.body || {}, true);
      const id = await categoryService.create({
        ...category,
        userId: request.auth.user_id || null,
      });
      return response.status(201).json({ id });
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "A category with this ID already exists." });
      }
      if (error.status === 400) {
        return response.status(400).json({ message: error.message });
      }
      return next(error);
    }
  });

  router.put("/:catId", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const catId = request.params.catId.trim();
      const category = normalizeCategory(request.body || {}, false);
      const updated = await categoryService.update(catId, category);
      if (!updated) {
        return response.status(404).json({ message: "Category was not found." });
      }
      return response.json({ message: "Category updated successfully." });
    } catch (error) {
      if (error.status === 400) {
        return response.status(400).json({ message: error.message });
      }
      return next(error);
    }
  });

  router.delete("/:catId", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const deleted = await categoryService.delete(request.params.catId.trim());
      if (!deleted) {
        return response.status(404).json({ message: "Category was not found." });
      }
      return response.json({ message: "Category deleted successfully." });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createCategoryRouter;
