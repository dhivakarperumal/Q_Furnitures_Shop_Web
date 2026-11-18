const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function createStoreTaxSettingsRouter(settingsService) {
  const router = express.Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/gst", async (request, response, next) => {
    try {
      return response.json(await settingsService.getSettings());
    } catch (error) {
      return next(error);
    }
  });

  router.put("/gst", async (request, response, next) => {
    try {
      const enabled = request.body?.gst_enabled;
      if (typeof enabled !== "boolean") {
        throw badRequest("gst_enabled must be true or false.");
      }

      const rawRate = request.body?.gst_rate;
      if ((typeof rawRate !== "number" && typeof rawRate !== "string") ||
          (typeof rawRate === "string" && rawRate.trim() === "")) {
        throw badRequest("gst_rate must be between 0 and 100.");
      }
      const parsedRate = Number(rawRate);
      if (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100) {
        throw badRequest("gst_rate must be between 0 and 100.");
      }
      const rate = Math.round((parsedRate + Number.EPSILON) * 100) / 100;

      return response.json(await settingsService.updateSettings({
        gstEnabled: enabled,
        gstRate: rate,
      }));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createStoreTaxSettingsRouter;
