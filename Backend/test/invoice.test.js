const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeCreditNote, normalizeInvoice, normalizePayment } = require("../routers/invoiceRouter");
const { createInvoiceService, invoiceStatus, roundMoney } = require("../modules/invoiceService");
const { normalizeDealer } = require("../routers/dealerRouter");

const validInvoice = {
  dealer_id: 7,
  invoice_date: "2025-01-15",
  due_date: "2025-02-14",
  customer_name: "Furniture Dealer",
  seller_state: "Tamil Nadu",
  place_of_supply: "Tamil Nadu",
  items: [{ product_id: 3, quantity: 2 }],
};

test("normalizes valid invoice input and defaults optional values", () => {
  const invoice = normalizeInvoice(validInvoice);
  assert.equal(invoice.dealer_id, 7);
  assert.equal(invoice.items[0].discount_type, "none");
  assert.equal(invoice.additional_discount, 0);
  assert.equal(invoice.payment_method, "Cash");
});

test("rejects invalid invoice dates, empty items, and fractional quantities", () => {
  assert.throws(() => normalizeInvoice({ ...validInvoice, invoice_date: "2025-02-30" }), /valid date/);
  assert.throws(() => normalizeInvoice({ ...validInvoice, due_date: "2025-01-14" }), /before the invoice date/);
  assert.throws(() => normalizeInvoice({ ...validInvoice, items: [] }), /between 1 and 100 products/);
  assert.throws(() => normalizeInvoice({ ...validInvoice, items: [{ product_id: 3, quantity: 1.5 }] }), /positive whole number/);
});

test("validates payment method and amount", () => {
  const payment = normalizePayment({ paid_at: "2025-01-15", payment_method: "UPI", amount: "20.25" });
  assert.equal(payment.amount, 20.25);
  assert.throws(() => normalizePayment({ paid_at: "2025-01-15", payment_method: "Barter", amount: 1 }), /valid payment method/);
  assert.throws(() => normalizePayment({ paid_at: "2025-01-15", payment_method: "Cash", amount: 0 }), /greater than zero/);
  assert.throws(() => normalizePayment(null), /Payment details are required/);
});

test("validates credit note quantities and duplicate invoice items", () => {
  const creditNote = normalizeCreditNote({
    credit_date: "2025-01-20",
    reason: "Damaged product",
    items: [{ invoice_item_id: 12, quantity: 1 }],
  });
  assert.equal(creditNote.items[0].invoice_item_id, 12);
  assert.throws(() => normalizeCreditNote({
    credit_date: "2025-01-20",
    reason: "Return",
    items: [{ invoice_item_id: 12, quantity: 1 }, { invoice_item_id: 12, quantity: 1 }],
  }), /only appear once/);
  assert.throws(() => normalizeCreditNote({ credit_date: "2025-01-20", reason: "Return", items: [] }), /Select between/);
});

test("rounds amounts and calculates invoice payment statuses", () => {
  assert.equal(roundMoney(12.345), 12.35);
  assert.equal(invoiceStatus(0, 100, "2099-01-01"), "Unpaid");
  assert.equal(invoiceStatus(25, 100, "2099-01-01"), "Partially Paid");
  assert.equal(invoiceStatus(100, 100, "2020-01-01"), "Paid");
  assert.equal(invoiceStatus(0, 100, "2020-01-01"), "Overdue");
});

test("normalizes dealer fields and rejects invalid tax IDs", () => {
  const dealer = normalizeDealer({ name: "  Main Dealer ", mobile: " 9876543210 " });
  assert.equal(dealer.name, "Main Dealer");
  assert.equal(dealer.company_name, "Main Dealer");
  assert.equal(dealer.email, null);
  assert.equal(dealer.status, "Active");
  assert.throws(() => normalizeDealer({ name: "Dealer", mobile: "9876543210", gstin: "invalid" }), /GSTIN must contain/);
  assert.throws(() => normalizeDealer(null), /Dealer details are required/);
});

test("creates a tax invoice, allocates invoice discount, and writes matching ledger entries", async () => {
  const statements = [];
  const ledger = [{ balance: 20 }];
  const invoiceItems = [];
  const payments = [];
  const invoiceRow = {
    id: 42,
    invoice_number: "QF-INV-2025-000042",
    subtotal: 200,
    item_discount: 0,
    additional_discount: 10,
    taxable_amount: 190,
    cgst_amount: 17.1,
    sgst_amount: 17.1,
    igst_amount: 0,
    grand_total: 229,
    amount_paid: 50,
    balance_due: 179,
  };
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params = []) {
      statements.push(sql);
      if (sql.includes("FROM dealers WHERE id")) {
        return [[{ id: 9, name: "Dealer", mobile: "9876543210", gstin: null, billing_address: "", shipping_address: "", state: "Tamil Nadu", opening_balance: 20, status: "Active" }]];
      }
      if (sql.includes("FROM invoices i LEFT JOIN dealers")) return [[invoiceRow]];
      if (sql.startsWith("SELECT * FROM invoice_items")) {
        return [[{
          id: 1, product_id: 3, quantity: 2, unit_price: 100, discount_amount: 10,
          taxable_amount: 190, cgst_amount: 17.1, sgst_amount: 17.1, gst_amount: 34.2, line_total: 224.2,
        }]];
      }
      if (sql.startsWith("SELECT * FROM invoice_payments")) return [[{ amount: 50, payment_method: "UPI" }]];
      if (sql.startsWith("SELECT * FROM credit_notes")) return [[]];
      if (sql.includes("FROM credit_note_items cni") && sql.includes("SUM(cni.quantity)")) return [[]];
      if (sql.includes("FROM credit_note_items cni")) return [[]];
      if (sql.includes("FROM products WHERE id")) {
        return [[{ id: 3, product_code: "QF-001", name: "Oak Table", category: "Tables", offer_price: 100, selling_price: 100, status: "Active", product_data: { gst_percentage: 18 } }]];
      }
      if (sql.includes("COALESCE(SUM(balance_due)")) return [[{ balance: 20 }]];
      if (sql.startsWith("INSERT INTO invoices")) return [{ insertId: 42 }];
      if (sql.startsWith("INSERT INTO invoice_items")) {
        invoiceItems.push(params);
        return [{ insertId: invoiceItems.length }];
      }
      if (sql.includes("SELECT balance FROM dealer_ledger")) return [ledger.slice(-1)];
      if (sql.startsWith("INSERT INTO dealer_ledger")) {
        const balance = Number(params[8]);
        ledger.push({ balance });
        return [{ insertId: ledger.length }];
      }
      if (sql.startsWith("INSERT INTO invoice_payments")) {
        payments.push(params);
        return [{ insertId: payments.length }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const pool = {
    getConnection: async () => connection,
    async execute(sql) {
      if (sql.includes("FROM invoices i LEFT JOIN dealers")) return [[invoiceRow]];
      if (sql.includes("FROM invoice_items")) {
        return [[{
          product_id: 3,
          quantity: 2,
          unit_price: 100,
          discount_amount: 10,
          taxable_amount: 190,
          cgst_amount: 17.1,
          sgst_amount: 17.1,
          gst_amount: 34.2,
          line_total: 224.2,
        }]];
      }
      if (sql.includes("FROM invoice_payments")) return [[{ amount: 50, payment_method: "UPI" }]];
      return [[]];
    },
  };
  const input = normalizeInvoice({
    ...validInvoice,
    amount_received: 50,
    payment_method: "UPI",
    seller_state: "Tamil Nadu",
    place_of_supply: "Tamil Nadu",
    additional_discount: 10,
    delivery_charges: 5,
    items: [{ product_id: 3, quantity: 2 }],
  });

  const stockDeductionCalls = [];
  const created = await createInvoiceService(pool, {
    async deductInvoiceStock(...args) { stockDeductionCalls.push(args); },
  }).create(input);
  assert.ok(statements.some((sql) => sql.startsWith("INSERT INTO invoices")));
  assert.equal(stockDeductionCalls.length, 1);
  assert.equal(stockDeductionCalls[0][1].invoice_number, "QF-INV-2025-000042");
  assert.equal(created.invoice_number, "QF-INV-2025-000042");
  assert.equal(created.items[0].taxable_amount, 190);
  assert.equal(created.items[0].gst_amount, 34.2);
  assert.equal(created.items[0].line_total, 224.2);
  assert.equal(created.payments[0].amount, 50);
  assert.deepEqual(ledger.map((entry) => entry.balance), [20, 249, 199]);
  assert.equal(invoiceItems.length, 1);
  assert.equal(payments.length, 1);
});

test("issues a credit note within the unpaid balance and reduces the dealer ledger", async () => {
  const statements = [];
  const ledger = [{ balance: 199 }];
  const creditedLines = [];
  const paymentRows = [];
  let invoice = {
    id: 42,
    invoice_number: "QF-INV-2025-000042",
    dealer_id: 9,
    invoice_date: "2025-01-15",
    grand_total: 229,
    amount_paid: 50,
    credited_amount: 0,
    balance_due: 179,
    due_date: "2025-02-14",
    status: "Partially Paid",
  };
  const line = {
    id: 5,
    invoice_id: 42,
    product_name: "Oak Table",
    hsn_code: "9403",
    quantity: 2,
    taxable_amount: 190,
    cgst_amount: 17.1,
    sgst_amount: 17.1,
    igst_amount: 0,
    line_total: 224.2,
  };
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() {},
    release() {},
    async execute(sql, params = []) {
      statements.push(sql);
      if (sql.includes("SELECT * FROM invoices WHERE id")) return [[invoice]];
      if (sql.includes("SELECT * FROM invoice_items WHERE invoice_id")) return [[line]];
      if (sql.startsWith("SELECT * FROM invoice_payments")) return [paymentRows];
      if (sql.includes("SUM(cni.quantity)")) {
        return statements.some((statement) => statement.startsWith("INSERT INTO credit_note_items"))
          ? [[{ invoice_item_id: 5, quantity: 1 }]]
          : [[]];
      }
      if (sql.includes("FROM credit_note_items cni")) {
        return statements.some((statement) => statement.startsWith("INSERT INTO credit_note_items"))
          ? [[{ credit_note_id: 7, invoice_item_id: 5, quantity: 1, amount: 112.1 }]]
          : [[]];
      }
      if (sql.includes("FROM invoices i LEFT JOIN dealers")) return [[invoice]];
      if (sql.startsWith("SELECT * FROM invoice_items")) return [[line]];
      if (sql.startsWith("SELECT * FROM invoice_payments")) return [paymentRows];
      if (sql.startsWith("SELECT * FROM credit_notes")) return [[{ id: 7, credit_note_number: "QF-CN-2025-000007", amount: 112.1 }]];
      if (sql.startsWith("INSERT INTO credit_notes")) return [{ insertId: 7 }];
      if (sql.startsWith("INSERT INTO credit_note_items")) {
        creditedLines.push(params);
        return [{ insertId: creditedLines.length }];
      }
      if (sql.startsWith("INSERT INTO invoice_payments")) {
        paymentRows.push({ amount: params[6], payment_method: params[3] });
        return [{ insertId: paymentRows.length }];
      }
      if (sql.includes("SELECT balance FROM dealer_ledger")) return [ledger.slice(-1)];
      if (sql.startsWith("INSERT INTO dealer_ledger")) {
        ledger.push({ balance: Number(params[8]) });
        return [{ insertId: ledger.length }];
      }
      if (sql.startsWith("UPDATE invoices SET credited_amount")) {
        invoice = { ...invoice, credited_amount: params[0], balance_due: params[1], status: params[2] };
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith("UPDATE invoices SET amount_paid")) {
        invoice = { ...invoice, amount_paid: params[0], balance_due: params[1], status: params[2] };
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 1 }];
    },
  };
  const pool = {
    getConnection: async () => connection,
    async execute(sql) {
      if (sql.includes("FROM invoices i LEFT JOIN dealers")) return [[invoice]];
      if (sql.includes("FROM invoice_items")) return [[line]];
      if (sql.includes("FROM invoice_payments")) return [[]];
      if (sql.includes("FROM credit_notes WHERE")) return [[{ id: 7, credit_note_number: "QF-CN-2025-000007", amount: 112.1 }]];
      if (sql.includes("SUM(cni.quantity)")) return [[{ invoice_item_id: 5, quantity: 1 }]];
      if (sql.includes("FROM credit_note_items cni")) return [[{
        credit_note_id: 7, invoice_item_id: 5, quantity: 1, amount: 112.1,
      }]];
      return [[]];
    },
  };

  const result = await createInvoiceService(pool).createCreditNote(42, {
    credit_date: "2025-01-20",
    reason: "Damaged product",
    notes: "",
    items: [{ invoice_item_id: 5, quantity: 1 }],
  });
  assert.ok(statements.some((sql) => sql.startsWith("INSERT INTO credit_notes")));
  assert.equal(creditedLines.length, 1);
  assert.equal(creditedLines[0][9], 112.1);
  assert.equal(invoice.credited_amount, 112.1);
  assert.equal(invoice.balance_due, 66.9);
  assert.equal(invoice.status, "Partially Paid");
  assert.equal(ledger.at(-1).balance, 86.9);
  assert.equal(result.credit_notes[0].credit_note_number, "QF-CN-2025-000007");

  const settled = await createInvoiceService(pool).recordPayment(42, {
    paid_at: "2025-01-21",
    payment_method: "UPI",
    amount: 66.9,
    transaction_id: null,
    reference_number: null,
    notes: "",
  });
  assert.equal(invoice.balance_due, 0);
  assert.equal(invoice.status, "Paid");
  assert.equal(ledger.at(-1).balance, 20);
  assert.equal(settled.amount_paid, 116.9);
});
