const express = require("express");
const multer = require("multer");
const path = require("node:path");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function positiveId(value, field) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw badRequest(`${field} must be a positive whole number.`);
  }
  return Number(value);
}

function dateOnly(value, field) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`${field} must use YYYY-MM-DD format.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw badRequest(`${field} must be a valid date.`);
  }
  return value;
}

function createInvoiceProductRouter(service) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(request, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      if (![".xlsx", ".csv"].includes(extension)) {
        return callback(badRequest("Upload an Excel (.xlsx) or CSV (.csv) file."));
      }
      return callback(null, true);
    },
  });
  router.use(requireAuthentication, requireAdmin);

  router.get("/import/template", async (request, response, next) => {
    try {
      const buffer = await service.template();
      response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      response.setHeader("Content-Disposition", 'attachment; filename="invoice-products-template.xlsx"');
      return response.send(Buffer.from(buffer));
    } catch (error) {
      return next(error);
    }
  });

  router.post("/import/preview", (request, response, next) => {
    upload.single("file")(request, response, async (uploadError) => {
      if (uploadError) {
        const status = uploadError.status || (uploadError.code === "LIMIT_FILE_SIZE" ? 413 : 400);
        return response.status(status).json({ message: uploadError.message || "The import file could not be uploaded." });
      }
      if (!request.file) return response.status(400).json({ message: "Choose an Excel or CSV file to import." });
      try {
        return response.json(await service.preview({
          buffer: request.file.buffer,
          fileName: path.basename(request.file.originalname),
          actor: request.auth.user_id,
        }));
      } catch (error) {
        if (error.status) return response.status(error.status).json({ message: error.message });
        return next(error);
      }
    });
  });

  router.post("/import/confirm", async (request, response, next) => {
    try {
      const importToken = request.body?.import_token;
      if (typeof importToken !== "string" || !/^[0-9a-f-]{36}$/i.test(importToken)) {
        throw badRequest("A valid import token is required.");
      }
      return response.json(await service.confirm(importToken, request.auth.user_id));
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  function getExportOptions(request) {
    const scope = typeof request.query.scope === "string" ? request.query.scope : "all";
    const options = { scope };
    if (request.query.invoice_id) options.invoiceId = positiveId(request.query.invoice_id, "Invoice ID");
    if (request.query.dealer_id) options.dealerId = positiveId(request.query.dealer_id, "Dealer ID");
    if (scope === "date") {
      options.from = dateOnly(request.query.from, "Start date");
      options.to = dateOnly(request.query.to, "End date");
      if (options.from > options.to) throw badRequest("Start date cannot be after end date.");
    }
    if (scope === "selected") {
      const rawIds = typeof request.query.item_ids === "string" ? request.query.item_ids.split(",") : [];
      if (!rawIds.length || rawIds.length > 500) throw badRequest("Select between 1 and 500 invoice product rows.");
      options.itemIds = rawIds.map((id) => positiveId(id, "Invoice product ID"));
      if (new Set(options.itemIds).size !== options.itemIds.length) throw badRequest("Selected invoice product IDs must be unique.");
    }
    return options;
  }

  router.get("/export/data", async (request, response, next) => {
    try {
      return response.json({ rows: await service.exportRows(getExportOptions(request)) });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  for (const format of ["excel", "csv"]) {
    router.get(`/export/${format}`, async (request, response, next) => {
      try {
        const options = getExportOptions(request);
        const rows = await service.exportRows(options);
        const buffer = await service.makeExport(rows, format);
        const extension = format === "excel" ? "xlsx" : "csv";
        const contentType = format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv; charset=utf-8";
        response.setHeader("Content-Type", contentType);
        response.setHeader("Content-Disposition", `attachment; filename="invoice-products-${options.scope}.${extension}"`);
        return response.send(Buffer.from(buffer));
      } catch (error) {
        if (error.status) return response.status(error.status).json({ message: error.message });
        return next(error);
      }
    });
  }

  return router;
}

module.exports = createInvoiceProductRouter;
