const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

const REVIEW_STATUSES = ["Pending", "Published", "Flagged"];

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function parseId(value) {
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1) {
    throw badRequest("Review ID must be a positive integer.");
  }
  return id;
}

function isSafeReviewImage(image) {
  if (!image) return true;
  if (/^https?:\/\//i.test(image)) {
    try {
      return Boolean(new URL(image).hostname);
    } catch {
      return false;
    }
  }
  return image.startsWith("/") && !image.startsWith("//") && !image.includes("\\");
}

function normalizeReview(body) {
  const productId = Number(body.product_id);
  const userName = typeof body.user_name === "string" ? body.user_name.trim() : "";
  const userEmail = typeof body.user_email === "string" ? body.user_email.trim() : "";
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const reviewImage = typeof body.review_image === "string" ? body.review_image.trim() : "";

  if (!Number.isSafeInteger(productId) || productId < 1) {
    throw badRequest("Select a valid product.");
  }
  if (!userName || userName.length > 191) {
    throw badRequest("Customer name is required and must be 191 characters or fewer.");
  }
  if (userEmail.length > 191 ||
      (userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail))) {
    throw badRequest("Enter a valid customer email address.");
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw badRequest("Rating must be between 1 and 5.");
  }
  if (!comment || comment.length > 5000) {
    throw badRequest("Review comment is required and must be 5,000 characters or fewer.");
  }
  if (reviewImage.length > 512 || !isSafeReviewImage(reviewImage)) {
    throw badRequest("Review image must be a relative path or an http(s) URL.");
  }

  return {
    product_id: productId,
    user_name: userName,
    user_email: userEmail || null,
    rating,
    comment,
    review_image: reviewImage || null,
  };
}

function normalizeCustomerReviewTarget(body, targetField, targetLabel, allowImage = false) {
  const targetId = Number(body[targetField]);
  const rating = Number(body.rating);
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const reviewImage = typeof body.review_image === "string" ? body.review_image.trim() : "";

  if (!Number.isSafeInteger(targetId) || targetId < 1) {
    throw badRequest(`Select a valid ${targetLabel}.`);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw badRequest("Rating must be between 1 and 5.");
  }
  if (!comment || comment.length > 5000) {
    throw badRequest("Review comment is required and must be 5,000 characters or fewer.");
  }
  if (allowImage && (reviewImage.length > 512 || !isSafeReviewImage(reviewImage))) {
    throw badRequest("Review image must be a relative path or an http(s) URL.");
  }

  return {
    [targetField]: targetId,
    rating,
    comment,
    ...(allowImage ? { review_image: reviewImage || null } : {}),
  };
}

function normalizeCustomerReview(body) {
  return normalizeCustomerReviewTarget(body, "product_id", "product", true);
}

function normalizeCustomerComboReview(body) {
  return normalizeCustomerReviewTarget(body, "combo_id", "combo", true);
}

function createReviewRouter(reviewService) {
  const router = express.Router();

  router.get("/product/:productId", async (request, response, next) => {
    try {
      const productId = parseId(request.params.productId);
      return response.json({ reviews: await reviewService.listPublishedForProduct(productId) });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/product/:productId/mine", requireAuthentication, async (request, response, next) => {
    try {
      const productId = parseId(request.params.productId);
      const userId = Number(request.auth?.id);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        return response.status(401).json({ message: "Sign in again to check your review." });
      }
      return response.json({ review: await reviewService.getCustomerReview(productId, userId) });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/combo/:comboId", async (request, response, next) => {
    try {
      const comboId = parseId(request.params.comboId);
      return response.json({ reviews: await reviewService.listPublishedForCombo(comboId) });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/combo/:comboId/mine", requireAuthentication, async (request, response, next) => {
    try {
      const comboId = parseId(request.params.comboId);
      const userId = Number(request.auth?.id);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        return response.status(401).json({ message: "Sign in again to check your review." });
      }
      return response.json({ review: await reviewService.getCustomerComboReview(comboId, userId) });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/published", async (request, response, next) => {
    try {
      return response.json({ reviews: await reviewService.listPublished() });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/admin/all", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const status = typeof request.query.status === "string" && request.query.status !== "All"
        ? request.query.status
        : "";
      if (status && !REVIEW_STATUSES.includes(status)) {
        return response.status(400).json({ message: "Review status is invalid." });
      }

      let rating;
      if (request.query.rating !== undefined) {
        rating = Number(request.query.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return response.status(400).json({ message: "Rating must be between 1 and 5." });
        }
      }
      const search = typeof request.query.search === "string" ? request.query.search.trim() : "";
      const result = await reviewService.list({ status, rating, search });
      return response.json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const review = await reviewService.create(normalizeReview(request.body || {}));
      return response.status(201).json({ review });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return response.status(400).json({ message: "Selected product was not found." });
      }
      return next(error);
    }
  });

  router.post("/customer", requireAuthentication, async (request, response, next) => {
    try {
      const userId = Number(request.auth?.id);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        return response.status(401).json({ message: "Sign in again to submit a review." });
      }
      const review = await reviewService.createCustomer(
        normalizeCustomerReview(request.body || {}),
        userId,
      );
      if (!review) return response.status(401).json({ message: "Your account could not be found. Sign in again." });
      return response.status(201).json({ review });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "You have already reviewed this product." });
      }
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return response.status(400).json({ message: "Selected product was not found." });
      }
      return next(error);
    }
  });

  router.post("/combo/customer", requireAuthentication, async (request, response, next) => {
    try {
      const userId = Number(request.auth?.id);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        return response.status(401).json({ message: "Sign in again to submit a review." });
      }
      const review = await reviewService.createCustomerCombo(
        normalizeCustomerComboReview(request.body || {}),
        userId,
      );
      if (!review) return response.status(401).json({ message: "Your account could not be found. Sign in again." });
      return response.status(201).json({ review });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      if (error.code === "ER_DUP_ENTRY") {
        return response.status(409).json({ message: "You have already reviewed this combo." });
      }
      if (error.code === "ER_NO_REFERENCED_ROW_2") {
        return response.status(400).json({ message: "Selected combo was not found." });
      }
      return next(error);
    }
  });

  router.put("/admin/:id/status", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      if (!REVIEW_STATUSES.includes(request.body?.status)) {
        return response.status(400).json({ message: "Review status is invalid." });
      }
      const review = await reviewService.updateStatus(id, request.body.status);
      if (!review) return response.status(404).json({ message: "Review was not found." });
      return response.json({ review });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.put("/admin/:id/reply", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const id = parseId(request.params.id);
      const adminReply = typeof request.body?.admin_reply === "string"
        ? request.body.admin_reply.trim()
        : "";
      if (!adminReply || adminReply.length > 5000) {
        return response.status(400).json({ message: "Reply is required and must be 5,000 characters or fewer." });
      }
      const review = await reviewService.updateReply(id, adminReply);
      if (!review) return response.status(404).json({ message: "Review was not found." });
      return response.json({ review });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.delete("/admin/:id", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      const review = await reviewService.delete(parseId(request.params.id));
      if (!review) return response.status(404).json({ message: "Review was not found." });
      return response.json({ message: "Review deleted successfully." });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createReviewRouter;
module.exports.normalizeReview = normalizeReview;
module.exports.normalizeCustomerReview = normalizeCustomerReview;
module.exports.normalizeCustomerComboReview = normalizeCustomerComboReview;
