const express = require("express");
const { requireAuthentication, requireAdmin } = require("../middleware/auth");

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function text(value, field, maxLength = 5000, required = false) {
  if (value === undefined || value === null) value = "";
  if (typeof value !== "string") throw badRequest(`${field} must be text.`);
  const result = value.trim();
  if (required && !result) throw badRequest(`${field} is required.`);
  if (result.length > maxLength) throw badRequest(`${field} is too long.`);
  return result;
}

function date(value, field, required = false) {
  if ((value === undefined || value === null || value === "") && !required) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`${field} must be a valid date.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw badRequest(`${field} must be a valid date.`);
  }
  return value;
}

function amount(value, field, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 999999999999) {
    throw badRequest(`${field} must be a non-negative amount.`);
  }
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function positiveId(value, field) {
  const id = Number(value);
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(id) || id < 1) {
    throw badRequest(`${field} must be a positive integer.`);
  }
  return id;
}

function normalizeInvoice(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw badRequest("Invoice details are required.");
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) {
    throw badRequest("Add between 1 and 100 products to the invoice.");
  }
  const items = input.items.map((item, index) => {
    if (!item || typeof item !== "object") throw badRequest(`Product ${index + 1} is invalid.`);
    const discountType = item.discount_type || "none";
    if (!["none", "percentage", "fixed"].includes(discountType)) {
      throw badRequest(`Product ${index + 1} has an invalid discount type.`);
    }
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) {
      throw badRequest(`Product ${index + 1} quantity must be a positive whole number.`);
    }
    const discountValue = amount(item.discount_value, `Product ${index + 1} discount`);
    if (discountType === "percentage" && discountValue > 100) {
      throw badRequest(`Product ${index + 1} discount cannot exceed 100%.`);
    }
    return {
      product_id: positiveId(item.product_id, `Product ${index + 1} ID`),
      quantity,
      unit: text(item.unit || "pcs", `Product ${index + 1} unit`, 32, true),
      discount_type: discountType,
      discount_value: discountValue,
    };
  });
  const dealerId = input.dealer_id ? positiveId(input.dealer_id, "Dealer ID") : null;
  const invoiceDate = date(input.invoice_date, "Invoice date", true);
  const dueDate = date(input.due_date, "Due date");
  if (dueDate && dueDate < invoiceDate) throw badRequest("Due date cannot be before the invoice date.");
  const paymentMethod = text(input.payment_method || "Cash", "Payment method", 32, true);
  if (!["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].includes(paymentMethod)) {
    throw badRequest("Choose a valid payment method.");
  }
  return {
    dealer_id: dealerId,
    invoice_date: invoiceDate,
    due_date: dueDate,
    customer_name: text(input.customer_name, "Customer name", 191, true),
    mobile: text(input.mobile, "Mobile", 32),
    gstin: text(input.gstin, "GSTIN", 15).toUpperCase(),
    billing_address: text(input.billing_address, "Billing address", 5000),
    shipping_address: text(input.shipping_address, "Shipping address", 5000),
    sales_person: text(input.sales_person, "Sales person", 191),
    payment_terms: text(input.payment_terms, "Payment terms", 100),
    seller_state: text(input.seller_state, "Seller state", 100, true),
    place_of_supply: text(input.place_of_supply, "Place of supply", 100, true),
    additional_discount: amount(input.additional_discount, "Additional discount"),
    delivery_charges: amount(input.delivery_charges, "Delivery charges"),
    installation_charges: amount(input.installation_charges, "Installation charges"),
    amount_received: amount(input.amount_received, "Amount received"),
    payment_method: paymentMethod,
    transaction_id: text(input.transaction_id, "Transaction ID", 100) || null,
    reference_number: text(input.reference_number, "Payment reference", 100) || null,
    notes: text(input.notes, "Notes"),
    items,
  };
}

function normalizePayment(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw badRequest("Payment details are required.");
  }
  const paymentMethod = text(input.payment_method, "Payment method", 32, true);
  if (!["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"].includes(paymentMethod)) {
    throw badRequest("Choose a valid payment method.");
  }
  const paidAt = date(input.paid_at, "Payment date", true);
  const amountValue = amount(input.amount, "Payment amount");
  if (amountValue <= 0) throw badRequest("Payment amount must be greater than zero.");
  return {
    paid_at: paidAt,
    payment_method: paymentMethod,
    amount: amountValue,
    transaction_id: text(input.transaction_id, "Transaction ID", 100) || null,
    reference_number: text(input.reference_number, "Payment reference", 100) || null,
    notes: text(input.notes, "Notes"),
  };
}

function normalizeCreditNote(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw badRequest("Credit note details are required.");
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 100) {
    throw badRequest("Select between 1 and 100 invoice items to return.");
  }
  const seenItemIds = new Set();
  const items = input.items.map((item, index) => {
    const invoiceItemId = positiveId(item?.invoice_item_id, `Credit item ${index + 1} ID`);
    if (seenItemIds.has(invoiceItemId)) throw badRequest("Each invoice item can only appear once per credit note.");
    seenItemIds.add(invoiceItemId);
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw badRequest(`Credit item ${index + 1} quantity must be a positive whole number.`);
    }
    return { invoice_item_id: invoiceItemId, quantity };
  });
  return {
    credit_date: date(input.credit_date, "Credit date", true),
    reason: text(input.reason, "Credit note reason", 191, true),
    notes: text(input.notes, "Notes"),
    items,
  };
}

function createInvoiceRouter(invoiceService) {
  const router = express.Router();
  router.use(requireAuthentication, requireAdmin);

  router.get("/payments", async (request, response, next) => {
    try {
      const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 25));
      return response.json(await invoiceService.listPayments({ page, limit }));
    } catch (error) {
      return next(error);
    }
  });

  router.get("/", async (request, response, next) => {
    try {
      const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 25));
      const search = typeof request.query.search === "string" ? request.query.search.trim().slice(0, 191) : "";
      const status = typeof request.query.status === "string" ? request.query.status : "All";
      if (!["All", "Paid", "Partially Paid", "Unpaid", "Overdue", "Cancelled", "Credited"].includes(status)) {
        throw badRequest("Choose a valid invoice status.");
      }
      return response.json(await invoiceService.list({ page, limit, search, status }));
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const invoice = await invoiceService.create(normalizeInvoice(request.body));
      return response.status(201).json({ invoice });
    } catch (error) {
      if (error.status === 400 || error.status === 404) {
        return response.status(error.status).json({ message: error.message });
      }
      return next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const invoice = await invoiceService.getById(positiveId(request.params.id, "Invoice ID"));
      if (!invoice) return response.status(404).json({ message: "Invoice was not found." });
      return response.json({ invoice });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.post("/:id/payments", async (request, response, next) => {
    try {
      const id = positiveId(request.params.id, "Invoice ID");
      const invoice = await invoiceService.recordPayment(id, normalizePayment(request.body));
      return response.status(201).json({ invoice });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.get("/:id/credit-notes", async (request, response, next) => {
    try {
      const invoice = await invoiceService.getById(positiveId(request.params.id, "Invoice ID"));
      if (!invoice) return response.status(404).json({ message: "Invoice was not found." });
      return response.json({ credit_notes: invoice.credit_notes });
    } catch (error) {
      if (error.status === 400) return response.status(400).json({ message: error.message });
      return next(error);
    }
  });

  router.post("/:id/credit-notes", async (request, response, next) => {
    try {
      const id = positiveId(request.params.id, "Invoice ID");
      const invoice = await invoiceService.createCreditNote(id, normalizeCreditNote(request.body));
      return response.status(201).json({ invoice });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  router.post("/:id/cancel", async (request, response, next) => {
    try {
      const invoice = await invoiceService.cancel(positiveId(request.params.id, "Invoice ID"));
      return response.json({ invoice });
    } catch (error) {
      if (error.status) return response.status(error.status).json({ message: error.message });
      return next(error);
    }
  });

  return router;
}

module.exports = createInvoiceRouter;
module.exports.normalizeInvoice = normalizeInvoice;
module.exports.normalizePayment = normalizePayment;
module.exports.normalizeCreditNote = normalizeCreditNote;
