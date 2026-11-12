const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function createUserRouter(authService) {
  const router = express.Router();

  router.get("/", requireAuthentication, requireAdmin, async (request, response, next) => {
    try {
      return response.json(await authService.listUsers());
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = createUserRouter;
