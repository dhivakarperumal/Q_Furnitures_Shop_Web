const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function readFilters(query) {
  const stringValue = (value) => typeof value === "string" ? value.trim() : "";
  return {
    period: stringValue(query.period) || "this-month",
    from: stringValue(query.from),
    to: stringValue(query.to),
  };
}

function createReportsRouter(reportsService) {
  const router = express.Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/options", async (request, response, next) => {
    try {
      return response.json(await reportsService.getOptions());
    } catch (error) {
      return next(error);
    }
  });

  router.get("/summary", async (request, response, next) => {
    try {
      return response.json(await reportsService.getSummary(readFilters(request.query)));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/:type", async (request, response, next) => {
    try {
      const report = await reportsService.getReport(request.params.type, readFilters(request.query));
      return response.json(report);
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  const writeRecord = (createRecord, responseStatus = 201) => async (request, response, next) => {
    try {
      const actor = request.auth?.user_id || null;
      const record = await createRecord(request.body, actor);
      return response.status(responseStatus).json({ record });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  };

  router.post("/suppliers", writeRecord((body) => reportsService.createSupplier(body)));
  router.post("/purchases", writeRecord((body, actor) => reportsService.createPurchase(body, actor)));
  router.post("/purchase-payments", writeRecord((body) => reportsService.createPurchasePayment(body)));
  router.post("/expenses", writeRecord((body, actor) => reportsService.createExpense(body, actor)));
  router.post("/purchase-returns", writeRecord((body, actor) => reportsService.createPurchaseReturn(body, actor)));

  return router;
}

module.exports = createReportsRouter;
