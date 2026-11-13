const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function createDashboardRouter(dashboardService) {
  const router = express.Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/", async (request, response, next) => {
    try {
      return response.json(await dashboardService.getDashboard(request.query.range || "week"));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createDashboardRouter;
