const {
  createTransaction,
  getStockForUpdate,
  insertMovement,
  updateAvailableStock,
} = require("./stockService");

const REPORT_TYPES = new Set([
  "sales", "purchases", "products", "categories", "inventory", "customers",
  "suppliers", "payments", "gst", "expenses", "profit-loss", "sales-returns",
  "purchase-returns", "orders", "deliveries", "outstanding",
]);
const PAYMENT_METHODS = new Set(["Cash", "UPI", "Card", "Online", "Bank Transfer", "Cheque", "Credit"]);

function reportError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(filters = {}, now = new Date()) {
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const weekday = (today.getUTCDay() + 6) % 7;
  let from;
  let to = isoDate(today);

  switch (filters.period || "this-month") {
    case "today":
      from = to;
      break;
    case "yesterday":
      today.setUTCDate(today.getUTCDate() - 1);
      from = to = isoDate(today);
      break;
    case "this-week":
      today.setUTCDate(today.getUTCDate() - weekday);
      from = isoDate(today);
      break;
    case "this-month":
      today.setUTCDate(1);
      from = isoDate(today);
      break;
    case "last-month":
      today.setUTCDate(1);
      today.setUTCMonth(today.getUTCMonth() - 1);
      from = isoDate(today);
      today.setUTCMonth(today.getUTCMonth() + 1);
      today.setUTCDate(0);
      to = isoDate(today);
      break;
    case "this-year":
      today.setUTCMonth(0, 1);
      from = isoDate(today);
      break;
    case "custom":
      if (!filters.from || !filters.to || filters.from > filters.to) {
        throw reportError(400, "Choose a valid custom date range.");
      }
      from = readDate(filters.from, "Start date");
      to = readDate(filters.to, "End date");
      break;
    case "all":
      from = "1000-01-01";
      break;
    default:
      throw reportError(400, "Choose a valid report period.");
  }
  return { from, to };
}

function readText(value, field, { required = false, max = 191 } = {}) {
  if (typeof value !== "string") {
    if (required) throw reportError(400, `${field} is required.`);
    return "";
  }
  const text = value.trim();
  if (required && !text) throw reportError(400, `${field} is required.`);
  if (text.length > max) throw reportError(400, `${field} must be ${max} characters or fewer.`);
  return text;
}

function readAmount(value, field, { minimum = 0, maximum = 999999999999 } = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < minimum || amount > maximum) {
    throw reportError(400, `${field} must be between ${minimum} and ${maximum}.`);
  }
  return roundMoney(amount);
}

function readDate(value, field) {
  const parsed = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || isoDate(parsed) !== value) {
    throw reportError(400, `${field} must be a valid date.`);
  }
  return value;
}

function createReportsService(pool) {
  async function getFifoCost({ from, to }) {
    const [purchases] = await pool.execute(
      `SELECT pri.id AS purchase_item_id, pri.product_id, pri.quantity, pri.unit_cost,
              DATE_FORMAT(pr.purchase_date, '%Y-%m-%d') AS event_date
       FROM purchase_receipt_items pri
       JOIN purchase_receipts pr ON pr.id = pri.purchase_id
       WHERE pr.purchase_date <= ?
       ORDER BY pr.purchase_date, pr.id, pri.id`,
      [to],
    );
    const [orders] = await pool.execute(
      `SELECT oi.id AS line_id, oi.product_id, oi.quantity,
              DATE_FORMAT(o.created_at, '%Y-%m-%d') AS event_date
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status <> 'Cancelled' AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)
       ORDER BY o.created_at, o.id, oi.id`,
      [to],
    );
    const [invoices] = await pool.execute(
      `SELECT ii.id AS line_id, ii.product_id, ii.quantity,
              DATE_FORMAT(i.invoice_date, '%Y-%m-%d') AS event_date
       FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
       WHERE i.status NOT IN ('Cancelled', 'Draft') AND i.invoice_date <= ?
       ORDER BY i.invoice_date, i.id, ii.id`,
      [to],
    );
    const [purchaseReturns] = await pool.execute(
      `SELECT pri.purchase_item_id, pri.product_id, pri.quantity,
              DATE_FORMAT(pr.return_date, '%Y-%m-%d') AS event_date
       FROM purchase_return_items pri JOIN purchase_returns pr ON pr.id = pri.return_id
       WHERE pr.return_date <= ? ORDER BY pr.return_date, pr.id, pri.id`,
      [to],
    );
    const [salesReturns] = await pool.execute(
      `SELECT cni.invoice_item_id AS line_id, ii.product_id, cni.quantity,
              DATE_FORMAT(cn.credit_date, '%Y-%m-%d') AS event_date
       FROM credit_note_items cni JOIN credit_notes cn ON cn.id = cni.credit_note_id
       JOIN invoice_items ii ON ii.id = cni.invoice_item_id
       WHERE cni.stock_disposition = 'sellable' AND ii.product_id IS NOT NULL AND cn.credit_date <= ?
       ORDER BY cn.credit_date, cn.id, cni.id`,
      [to],
    );

    const events = [
      ...purchases.map((row) => ({ ...row, type: "purchase", priority: 0 })),
      ...orders.map((row) => ({ ...row, type: "sale", source: "order", priority: 1 })),
      ...invoices.map((row) => ({ ...row, type: "sale", source: "invoice", priority: 1 })),
      ...purchaseReturns.map((row) => ({ ...row, type: "purchase-return", priority: 2 })),
      ...salesReturns.map((row) => ({ ...row, type: "sales-return", priority: 3 })),
    ].map((event) => ({
      ...event,
      sortDate: event.event_date instanceof Date ? isoDate(event.event_date) : String(event.event_date).slice(0, 10),
    })).sort((a, b) => a.sortDate.localeCompare(b.sortDate) ||
      a.priority - b.priority || Number(a.line_id || a.purchase_item_id) - Number(b.line_id || b.purchase_item_id));

    const layersByProduct = new Map();
    const saleCosts = new Map();
    const dateOf = (value) => String(value instanceof Date ? isoDate(value) : value).slice(0, 10);
    let cogs = 0;
    let uncostedQuantity = 0;
    for (const event of events) {
      const productId = Number(event.product_id);
      if (!productId) {
        if (event.type === "sale" && dateOf(event.event_date) >= from) uncostedQuantity += Number(event.quantity || 0);
        continue;
      }
      const layers = layersByProduct.get(productId) || [];
      layersByProduct.set(productId, layers);
      const quantity = Number(event.quantity || 0);
      const eventDate = dateOf(event.event_date);

      if (event.type === "purchase") {
        layers.push({
          purchaseItemId: Number(event.purchase_item_id),
          quantity,
          unitCost: Number(event.unit_cost),
        });
      } else if (event.type === "sale") {
        let remaining = quantity;
        let saleCost = 0;
        for (const layer of layers) {
          if (remaining <= 0) break;
          const used = Math.min(remaining, layer.quantity);
          layer.quantity -= used;
          remaining -= used;
          saleCost += used * layer.unitCost;
        }
        saleCosts.set(`${event.source}:${event.line_id}`, quantity > 0 && remaining === 0
          ? saleCost / quantity
          : null);
        if (eventDate >= from) {
          cogs += saleCost;
          uncostedQuantity += remaining;
        }
      } else if (event.type === "purchase-return") {
        let remaining = quantity;
        const layer = layers.find((item) => item.purchaseItemId === Number(event.purchase_item_id));
        if (layer) {
          const removed = Math.min(remaining, layer.quantity);
          layer.quantity -= removed;
          remaining -= removed;
        }
        if (remaining > 0) uncostedQuantity += remaining;
      } else if (event.type === "sales-return") {
        const unitCost = saleCosts.get(`invoice:${event.line_id}`);
        if (unitCost === null || unitCost === undefined) {
          if (eventDate >= from) uncostedQuantity += quantity;
          continue;
        }
        layers.push({
          purchaseItemId: null,
          quantity,
          unitCost,
        });
        if (eventDate >= from) cogs -= quantity * unitCost;
      }
    }

    return { cogs: roundMoney(cogs), uncostedQuantity };
  }

  async function getSummary(filters) {
    const range = getDateRange(filters);
    const [
      [orderRows],
      [invoiceRows],
      [salesReturnRows],
      [purchaseRows],
      [purchaseReturnRows],
      [expenseRows],
      [stockRows],
    ] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total,
                COALESCE(SUM(total_amount - gst_amount), 0) AS revenue,
                COALESCE(SUM(gst_amount), 0) AS gst,
                COALESCE(SUM(CASE WHEN payment_status <> 'Paid' THEN total_amount ELSE 0 END), 0) AS pending
         FROM orders WHERE status <> 'Cancelled' AND DATE(created_at) BETWEEN ? AND ?`,
        [range.from, range.to],
      ),
      pool.execute(
        `SELECT COUNT(*) AS count, COALESCE(SUM(grand_total), 0) AS total,
                COALESCE(SUM(taxable_amount + delivery_charges + installation_charges + round_off), 0) AS revenue,
                COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) AS gst,
                COALESCE(SUM(balance_due), 0) AS pending
         FROM invoices WHERE status NOT IN ('Cancelled', 'Draft') AND invoice_date BETWEEN ? AND ?`,
        [range.from, range.to],
      ),
      pool.execute(
        `SELECT COALESCE(SUM(cn.amount), 0) AS total,
                COALESCE(SUM(items.taxable), 0) AS taxable,
                COALESCE(SUM(items.gst), 0) AS gst
         FROM credit_notes cn JOIN (
           SELECT credit_note_id, SUM(taxable_amount) AS taxable,
                  SUM(cgst_amount + sgst_amount + igst_amount) AS gst
           FROM credit_note_items GROUP BY credit_note_id
         ) items ON items.credit_note_id = cn.id
         WHERE cn.credit_date BETWEEN ? AND ?`,
        [range.from, range.to],
      ),
      pool.execute(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total,
                COALESCE(SUM(gst_amount), 0) AS gst, COALESCE(SUM(balance_due), 0) AS pending
         FROM purchase_receipts WHERE is_opening_stock = 0 AND purchase_date BETWEEN ? AND ?`,
        [range.from, range.to],
      ),
      pool.execute(
        `SELECT COALESCE(SUM(total_amount), 0) AS total, COALESCE(SUM(gst_amount), 0) AS gst
         FROM purchase_returns WHERE return_date BETWEEN ? AND ?`,
        [range.from, range.to],
      ),
      pool.execute(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE expense_date BETWEEN ? AND ?",
        [range.from, range.to],
      ),
      pool.execute("SELECT COALESCE(SUM(available_stock), 0) AS total FROM product_stock"),
    ]);

    const order = orderRows[0] || {};
    const invoice = invoiceRows[0] || {};
    const salesReturn = salesReturnRows[0] || {};
    const purchase = purchaseRows[0] || {};
    const purchaseReturn = purchaseReturnRows[0] || {};
    const revenue = roundMoney(Number(order.revenue) + Number(invoice.revenue) - Number(salesReturn.taxable));
    const totalSales = roundMoney(Number(order.total) + Number(invoice.total) - Number(salesReturn.total));
    const totalPurchase = roundMoney(Number(purchase.total) - Number(purchaseReturn.total));
    const gst = roundMoney(Number(order.gst) + Number(invoice.gst) - Number(salesReturn.gst) -
      Number(purchase.gst) + Number(purchaseReturn.gst));
    const expenses = Number(expenseRows[0]?.total || 0);
    const fifo = await getFifoCost(range);
    const grossProfit = fifo.uncostedQuantity ? null : roundMoney(revenue - fifo.cogs);
    return {
      range,
      totalSales,
      totalOrders: Number(order.count) + Number(invoice.count),
      totalPurchase,
      totalRevenue: revenue,
      costOfGoodsSold: fifo.cogs,
      uncostedQuantity: fifo.uncostedQuantity,
      grossProfit,
      totalExpenses: roundMoney(expenses),
      netProfit: grossProfit === null ? null : roundMoney(grossProfit - expenses),
      pendingPayments: roundMoney(Number(order.pending) + Number(invoice.pending)),
      totalGst: gst,
      availableStock: Number(stockRows[0]?.total || 0),
    };
  }

  async function getOptions() {
    const [[products], [categories], [customers], [suppliers], [purchaseItems], [openPurchases]] = await Promise.all([
      pool.execute("SELECT id, name, product_code FROM products WHERE status = 'Active' ORDER BY name"),
      pool.execute("SELECT DISTINCT name FROM categories ORDER BY name"),
      pool.execute(
        `SELECT DISTINCT customer_name AS name FROM orders WHERE customer_name IS NOT NULL AND customer_name <> ''
         UNION SELECT DISTINCT customer_name AS name FROM invoices WHERE customer_name IS NOT NULL AND customer_name <> ''
         ORDER BY name`,
      ),
      pool.execute("SELECT id, name FROM suppliers WHERE status = 'Active' ORDER BY name"),
      pool.execute(
        `SELECT pri.id AS purchase_item_id, pri.purchase_id, pr.purchase_number, pri.product_id,
                pri.product_name, pri.quantity - COALESCE(returned.quantity, 0) AS remaining_quantity
         FROM purchase_receipt_items pri
         JOIN purchase_receipts pr ON pr.id = pri.purchase_id
         LEFT JOIN (
           SELECT purchase_item_id, SUM(quantity) AS quantity
           FROM purchase_return_items GROUP BY purchase_item_id
         ) returned ON returned.purchase_item_id = pri.id
         WHERE pr.is_opening_stock = 0 AND pri.quantity > COALESCE(returned.quantity, 0)
         ORDER BY pr.purchase_date DESC, pri.product_name`,
      ),
      pool.execute(
        `SELECT pr.id AS purchase_id, pr.purchase_number, pr.purchase_date, pr.balance_due,
                s.name AS supplier
         FROM purchase_receipts pr LEFT JOIN suppliers s ON s.id = pr.supplier_id
         WHERE pr.is_opening_stock = 0 AND pr.balance_due > 0
         ORDER BY pr.purchase_date DESC, pr.id DESC`,
      ),
    ]);
    return {
      products,
      categories: categories.map((row) => row.name),
      customers: customers.map((row) => row.name),
      suppliers,
      purchaseItems,
      openPurchases,
      paymentMethods: [...PAYMENT_METHODS],
    };
  }

  async function getReport(type, filters) {
    if (!REPORT_TYPES.has(type)) throw reportError(400, "Choose a valid report type.");
    const range = getDateRange(filters);
    if (type === "profit-loss") return { rows: [await getSummary(filters)], range };
    const queries = {
      sales: [
        `SELECT 'Order' AS type, o.id, COALESCE(o.order_id, CONCAT('ORD', LPAD(o.id, 4, '0'))) AS reference,
                o.customer_name AS customer, o.order_type AS channel, o.payment_method,
                o.status, DATE(o.created_at) AS report_date, o.subtotal, o.discount_amount,
                o.gst_amount, o.total_amount, o.total_amount - o.gst_amount AS revenue_ex_gst,
                (SELECT GROUP_CONCAT(DISTINCT oi.product_id)
                 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id IS NOT NULL) AS product_ids,
                (SELECT GROUP_CONCAT(DISTINCT p.category)
                 FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id) AS categories
         FROM orders o WHERE o.status <> 'Cancelled' AND DATE(o.created_at) BETWEEN ? AND ?
         UNION ALL
         SELECT 'Invoice', i.id, i.invoice_number, i.customer_name, 'Dealer Invoice', NULL,
                i.status, i.invoice_date, i.subtotal, i.item_discount + i.additional_discount,
                i.cgst_amount + i.sgst_amount + i.igst_amount, i.grand_total,
                i.taxable_amount + i.delivery_charges + i.installation_charges + i.round_off,
                (SELECT GROUP_CONCAT(DISTINCT ii.product_id)
                 FROM invoice_items ii WHERE ii.invoice_id = i.id AND ii.product_id IS NOT NULL),
                (SELECT GROUP_CONCAT(DISTINCT ii.category)
                 FROM invoice_items ii WHERE ii.invoice_id = i.id AND ii.category IS NOT NULL)
         FROM invoices i WHERE i.status NOT IN ('Cancelled', 'Draft') AND i.invoice_date BETWEEN ? AND ?
         ORDER BY report_date DESC`,
        [range.from, range.to, range.from, range.to],
      ],
      purchases: [
        `SELECT pr.id, pr.purchase_number AS reference, pr.supplier_bill_number, s.id AS supplier_id,
                s.name AS supplier, pr.purchase_date AS report_date, pr.is_opening_stock,
                pri.product_id, pri.product_name AS product, pri.category, pri.quantity, pri.unit_cost,
                pri.taxable_amount, pri.gst_amount, pri.total_amount, pr.payment_method,
                COALESCE(pr.amount_paid * pri.total_amount / NULLIF(t.purchase_total, 0), 0) AS amount_paid,
                COALESCE(pr.balance_due * pri.total_amount / NULLIF(t.purchase_total, 0), 0) AS balance_due
         FROM purchase_receipts pr
         JOIN purchase_receipt_items pri ON pri.purchase_id = pr.id
         JOIN (
           SELECT purchase_id, SUM(total_amount) AS purchase_total
           FROM purchase_receipt_items GROUP BY purchase_id
         ) t ON t.purchase_id = pr.id
         LEFT JOIN suppliers s ON s.id = pr.supplier_id
         WHERE pr.purchase_date BETWEEN ? AND ? ORDER BY pr.purchase_date DESC, pr.id DESC`,
        [range.from, range.to],
      ],
      products: [
        `SELECT p.id AS product_id, p.name AS product, p.product_code AS sku, p.category,
                COALESCE(SUM(x.quantity), 0) AS quantity_sold,
                COALESCE(SUM(x.revenue), 0) AS revenue_ex_gst,
                COALESCE(SUM(x.gst), 0) AS gst_amount,
                COALESCE(SUM(x.total), 0) AS total_amount
         FROM products p LEFT JOIN (
           SELECT oi.product_id, oi.quantity,
                  oi.total - COALESCE(o.discount_amount * oi.total / NULLIF(o.subtotal, 0), 0) AS revenue,
                  COALESCE(o.gst_amount * oi.total / NULLIF(o.subtotal, 0), 0) AS gst,
                  oi.total - COALESCE(o.discount_amount * oi.total / NULLIF(o.subtotal, 0), 0) +
                    COALESCE(o.gst_amount * oi.total / NULLIF(o.subtotal, 0), 0) AS total
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           WHERE o.status <> 'Cancelled' AND DATE(o.created_at) BETWEEN ? AND ?
           UNION ALL
           SELECT ii.product_id, ii.quantity, ii.taxable_amount, ii.gst_amount, ii.line_total
           FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
           WHERE i.status NOT IN ('Cancelled', 'Draft') AND i.invoice_date BETWEEN ? AND ?
           UNION ALL
           SELECT ii.product_id, -cni.quantity, -cni.taxable_amount,
                  -(cni.cgst_amount + cni.sgst_amount + cni.igst_amount), -cni.amount
           FROM credit_note_items cni JOIN credit_notes cn ON cn.id = cni.credit_note_id
           JOIN invoice_items ii ON ii.id = cni.invoice_item_id
           WHERE cn.credit_date BETWEEN ? AND ?
         ) x ON x.product_id = p.id GROUP BY p.id ORDER BY revenue_ex_gst DESC`,
        [range.from, range.to, range.from, range.to, range.from, range.to],
      ],
      categories: [
        `SELECT x.category, GROUP_CONCAT(DISTINCT x.product_id) AS product_ids,
                SUM(x.quantity) AS quantity_sold, SUM(x.revenue) AS revenue_ex_gst,
                SUM(x.gst) AS gst_amount, SUM(x.total) AS total_amount
         FROM (
           SELECT COALESCE(p.category, 'Uncategorized') AS category, oi.product_id, oi.quantity,
                  oi.total - COALESCE(o.discount_amount * oi.total / NULLIF(o.subtotal, 0), 0) AS revenue,
                  COALESCE(o.gst_amount * oi.total / NULLIF(o.subtotal, 0), 0) AS gst,
                  oi.total - COALESCE(o.discount_amount * oi.total / NULLIF(o.subtotal, 0), 0) +
                    COALESCE(o.gst_amount * oi.total / NULLIF(o.subtotal, 0), 0) AS total
           FROM order_items oi JOIN orders o ON o.id = oi.order_id
           LEFT JOIN products p ON p.id = oi.product_id
           WHERE o.status <> 'Cancelled' AND DATE(o.created_at) BETWEEN ? AND ?
           UNION ALL
           SELECT COALESCE(ii.category, 'Uncategorized'), ii.product_id, ii.quantity, ii.taxable_amount, ii.gst_amount, ii.line_total
           FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
           WHERE i.status NOT IN ('Cancelled', 'Draft') AND i.invoice_date BETWEEN ? AND ?
           UNION ALL
           SELECT COALESCE(ii.category, 'Uncategorized'), ii.product_id, -cni.quantity, -cni.taxable_amount,
                  -(cni.cgst_amount + cni.sgst_amount + cni.igst_amount), -cni.amount
           FROM credit_note_items cni JOIN credit_notes cn ON cn.id = cni.credit_note_id
           JOIN invoice_items ii ON ii.id = cni.invoice_item_id
           WHERE cn.credit_date BETWEEN ? AND ?
         ) x GROUP BY x.category ORDER BY revenue_ex_gst DESC`,
        [range.from, range.to, range.from, range.to, range.from, range.to],
      ],
      inventory: [
        `SELECT p.id AS product_id, p.product_code AS sku, p.name AS product, p.category,
                ps.available_stock, ps.reserved_stock, ps.damaged_stock, ps.minimum_stock,
                CASE WHEN ps.available_stock <= ps.minimum_stock THEN 'Low stock' ELSE 'In stock' END AS stock_status
         FROM products p JOIN product_stock ps ON ps.product_id = p.id ORDER BY p.name`,
        [],
      ],
      customers: [
        `SELECT customer, phone, SUM(transactions) AS transactions, SUM(total) AS total_spend,
                SUM(revenue) AS revenue_ex_gst, SUM(outstanding) AS outstanding
         FROM (
           SELECT o.customer_name AS customer, o.customer_phone AS phone, 1 AS transactions, o.total_amount AS total,
                  o.total_amount - o.gst_amount AS revenue,
                  CASE WHEN o.payment_status = 'Paid' THEN 0 ELSE o.total_amount END AS outstanding
           FROM orders o WHERE o.status <> 'Cancelled' AND DATE(o.created_at) BETWEEN ? AND ?
           UNION ALL
           SELECT i.customer_name, i.mobile, 1, i.grand_total,
                  i.taxable_amount + i.delivery_charges + i.installation_charges + i.round_off,
                  i.balance_due
           FROM invoices i WHERE i.status NOT IN ('Cancelled', 'Draft') AND i.invoice_date BETWEEN ? AND ?
           UNION ALL
           SELECT i.customer_name, i.mobile, 0, -cn.amount, -returned.taxable, 0
           FROM credit_notes cn JOIN invoices i ON i.id = cn.invoice_id
           JOIN (
             SELECT credit_note_id, SUM(taxable_amount) AS taxable
             FROM credit_note_items GROUP BY credit_note_id
           ) returned ON returned.credit_note_id = cn.id
           WHERE cn.credit_date BETWEEN ? AND ?
         ) sales GROUP BY customer, phone ORDER BY total_spend DESC`,
        [range.from, range.to, range.from, range.to, range.from, range.to],
      ],
      suppliers: [
        `SELECT s.id AS supplier_id, s.name AS supplier, s.contact_person, s.phone, s.email, s.gstin,
                COALESCE(p.purchase_count, 0) AS purchases,
                COALESCE(p.purchase_total, 0) - COALESCE(r.return_total, 0) AS total_purchases,
                COALESCE(p.supplier_outstanding, 0) AS outstanding
         FROM suppliers s
         LEFT JOIN (
           SELECT supplier_id, COUNT(*) AS purchase_count, SUM(total_amount) AS purchase_total,
                  SUM(balance_due) AS supplier_outstanding
           FROM purchase_receipts WHERE is_opening_stock = 0 AND purchase_date BETWEEN ? AND ?
           GROUP BY supplier_id
         ) p ON p.supplier_id = s.id
         LEFT JOIN (
           SELECT supplier_id, SUM(total_amount) AS return_total
           FROM purchase_returns WHERE return_date BETWEEN ? AND ? GROUP BY supplier_id
         ) r ON r.supplier_id = s.id
         ORDER BY s.name`,
        [range.from, range.to, range.from, range.to],
      ],
      payments: [
        `SELECT 'Order' AS source, COALESCE(o.order_id, CONCAT('ORD', LPAD(o.id, 4, '0'))) AS reference,
                o.customer_name AS party, o.payment_method, o.payment_status AS status,
                DATE(o.created_at) AS report_date, o.total_amount AS amount
         FROM orders o WHERE o.status <> 'Cancelled' AND o.payment_status = 'Paid'
              AND DATE(o.created_at) BETWEEN ? AND ?
         UNION ALL
         SELECT 'Sales invoice', i.invoice_number, i.customer_name, ip.payment_method, 'Paid', ip.paid_at, ip.amount
         FROM invoice_payments ip JOIN invoices i ON i.id = ip.invoice_id
         WHERE i.status NOT IN ('Cancelled', 'Draft') AND ip.paid_at BETWEEN ? AND ?
         UNION ALL
         SELECT 'Purchase', pr.purchase_number, s.name, pp.payment_method, 'Paid', pp.paid_at, pp.amount
         FROM purchase_receipt_payments pp JOIN purchase_receipts pr ON pr.id = pp.purchase_id
              LEFT JOIN suppliers s ON s.id = pr.supplier_id WHERE pp.paid_at BETWEEN ? AND ?
         ORDER BY report_date DESC`,
        [range.from, range.to, range.from, range.to, range.from, range.to],
      ],
      gst: [
        `        SELECT 'Order' AS source, COALESCE(o.order_id, CONCAT('ORD', LPAD(o.id, 4, '0'))) AS reference,
               DATE(o.created_at) AS report_date,
                o.subtotal AS taxable_amount, o.discount_amount,
                o.gst_amount, o.total_amount
         FROM orders o WHERE o.status <> 'Cancelled' AND DATE(o.created_at) BETWEEN ? AND ?
         UNION ALL
         SELECT 'Sales invoice', i.invoice_number, i.invoice_date, i.taxable_amount,
                i.item_discount + i.additional_discount, i.cgst_amount + i.sgst_amount + i.igst_amount, i.grand_total
         FROM invoices i WHERE i.status NOT IN ('Cancelled', 'Draft') AND i.invoice_date BETWEEN ? AND ?
         UNION ALL
         SELECT 'Sales return', cn.credit_note_number, cn.credit_date,
                -SUM(cni.taxable_amount), 0, -SUM(cni.cgst_amount + cni.sgst_amount + cni.igst_amount), -cn.amount
         FROM credit_notes cn JOIN credit_note_items cni ON cni.credit_note_id = cn.id
         WHERE cn.credit_date BETWEEN ? AND ? GROUP BY cn.id
         UNION ALL
         SELECT 'Purchase', pr.purchase_number, pr.purchase_date, pr.taxable_amount,
                pr.discount_amount, pr.gst_amount, pr.total_amount
         FROM purchase_receipts pr WHERE pr.is_opening_stock = 0 AND pr.purchase_date BETWEEN ? AND ?
         UNION ALL
         SELECT 'Purchase return', r.return_number, r.return_date, -r.taxable_amount, 0, -r.gst_amount, -r.total_amount
         FROM purchase_returns r WHERE r.return_date BETWEEN ? AND ?
         ORDER BY report_date DESC`,
        [range.from, range.to, range.from, range.to, range.from, range.to, range.from, range.to, range.from, range.to],
      ],
      expenses: [
        "SELECT id, expense_date AS report_date, category, description, payment_method, reference_number, amount FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC, id DESC",
        [range.from, range.to],
      ],
      "sales-returns": [
        `SELECT cn.id, cn.credit_note_number AS reference, i.invoice_number, i.customer_name AS customer,
                cn.credit_date AS report_date, cn.reason, cni.product_name AS product, ii.product_id,
                ii.category, cni.quantity, cni.taxable_amount,
                cni.cgst_amount + cni.sgst_amount + cni.igst_amount AS gst_amount, cni.amount AS total_amount
         FROM credit_notes cn JOIN invoices i ON i.id = cn.invoice_id
         JOIN credit_note_items cni ON cni.credit_note_id = cn.id
         LEFT JOIN invoice_items ii ON ii.id = cni.invoice_item_id
         WHERE cn.credit_date BETWEEN ? AND ? ORDER BY cn.credit_date DESC, cn.id DESC`,
        [range.from, range.to],
      ],
      "purchase-returns": [
        `SELECT r.id, r.return_number AS reference, pr.purchase_number, s.id AS supplier_id, s.name AS supplier,
                r.return_date AS report_date, r.reason, pri.product_id, pri.product_name AS product,
                pri.quantity, pri.taxable_amount, pri.gst_amount, pri.total_amount
         FROM purchase_returns r JOIN purchase_receipts pr ON pr.id = r.purchase_id
         JOIN purchase_return_items pri ON pri.return_id = r.id
         LEFT JOIN suppliers s ON s.id = r.supplier_id
         WHERE r.return_date BETWEEN ? AND ? ORDER BY r.return_date DESC`,
        [range.from, range.to],
      ],
      orders: [
        `SELECT o.id, o.order_id AS reference, o.customer_name AS customer, o.customer_phone AS phone,
                o.order_type, o.payment_method, o.payment_status, o.status, DATE(o.created_at) AS report_date,
                o.subtotal, o.discount_amount, o.gst_amount, o.total_amount,
                (SELECT GROUP_CONCAT(DISTINCT oi.product_id)
                 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id IS NOT NULL) AS product_ids,
                (SELECT GROUP_CONCAT(DISTINCT p.category)
                 FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id) AS categories
         FROM orders o WHERE DATE(o.created_at) BETWEEN ? AND ? ORDER BY o.created_at DESC`,
        [range.from, range.to],
      ],
      deliveries: [
        `SELECT o.id, o.order_id AS reference, o.customer_name AS customer, o.customer_phone AS phone,
                o.status, o.courier_name, o.tracking_number, o.shipped_at, DATE(o.created_at) AS report_date,
                o.total_amount,
                (SELECT GROUP_CONCAT(DISTINCT oi.product_id)
                 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id IS NOT NULL) AS product_ids,
                (SELECT GROUP_CONCAT(DISTINCT p.category)
                 FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id) AS categories
         FROM orders o WHERE o.status IN ('Shipping', 'Out for Delivery', 'Delivered')
              AND DATE(o.created_at) BETWEEN ? AND ? ORDER BY o.created_at DESC`,
        [range.from, range.to],
      ],
      outstanding: [
        `SELECT 'Order' AS source, COALESCE(o.order_id, CONCAT('ORD', LPAD(o.id, 4, '0'))) AS reference,
                o.customer_name AS party, NULL AS due_date, DATE(o.created_at) AS report_date,
                o.total_amount AS total_amount, 0 AS amount_paid, 0 AS credited_amount,
                o.total_amount AS outstanding,
                (SELECT GROUP_CONCAT(DISTINCT oi.product_id)
                 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id IS NOT NULL) AS product_ids,
                (SELECT GROUP_CONCAT(DISTINCT p.category)
                 FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id) AS categories
         FROM orders o WHERE o.status <> 'Cancelled' AND o.payment_status <> 'Paid'
              AND DATE(o.created_at) BETWEEN ? AND ?
         UNION ALL
         SELECT 'Sales invoice', i.invoice_number, i.customer_name,
                i.due_date, i.invoice_date AS report_date, i.grand_total AS total_amount,
                i.amount_paid, i.credited_amount, i.balance_due AS outstanding,
                (SELECT GROUP_CONCAT(DISTINCT ii.product_id)
                 FROM invoice_items ii WHERE ii.invoice_id = i.id AND ii.product_id IS NOT NULL),
                (SELECT GROUP_CONCAT(DISTINCT ii.category)
                 FROM invoice_items ii WHERE ii.invoice_id = i.id AND ii.category IS NOT NULL)
         FROM invoices i WHERE i.status NOT IN ('Cancelled', 'Draft') AND i.balance_due > 0
              AND i.invoice_date BETWEEN ? AND ?
         UNION ALL
         SELECT 'Purchase', pr.purchase_number, COALESCE(s.name, 'Opening stock'), NULL,
                pr.purchase_date, pr.total_amount, pr.amount_paid, 0, pr.balance_due,
                (SELECT GROUP_CONCAT(DISTINCT pri.product_id)
                 FROM purchase_receipt_items pri WHERE pri.purchase_id = pr.id),
                (SELECT GROUP_CONCAT(DISTINCT pri.category)
                 FROM purchase_receipt_items pri WHERE pri.purchase_id = pr.id)
         FROM purchase_receipts pr LEFT JOIN suppliers s ON s.id = pr.supplier_id
         WHERE pr.is_opening_stock = 0 AND pr.balance_due > 0 AND pr.purchase_date BETWEEN ? AND ?
         ORDER BY report_date DESC`,
        [range.from, range.to, range.from, range.to, range.from, range.to],
      ],
    };

    const [sql, parameters] = queries[type];
    const [rows] = await pool.execute(sql, parameters);
    if (type === "profit-loss") return { rows: [await getSummary(filters)], range };
    return { rows, range };
  }

  async function createSupplier(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw reportError(400, "Supplier details are required.");
    }
    const name = readText(input?.name, "Supplier name", { required: true });
    const phone = readText(input?.phone, "Supplier phone", { required: true, max: 32 });
    const email = readText(input?.email, "Supplier email", { max: 191 });
    const gstin = readText(input.gstin, "Supplier GSTIN", { max: 15 }).toUpperCase();
    const contactPerson = readText(input?.contact_person, "Contact person");
    const address = readText(input?.address, "Supplier address", { max: 5000 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw reportError(400, "Enter a valid supplier email.");
    const [result] = await pool.execute(
      `INSERT INTO suppliers (name, contact_person, phone, email, gstin, address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, contactPerson || null, phone, email || null, gstin || null, address || null],
    );
    return { id: result.insertId, name, phone, email, gstin };
  }

  async function createPurchase(input, actor = null) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw reportError(400, "Purchase details are required.");
    }
    if (!Array.isArray(input?.items) || input.items.length === 0 || input.items.length > 200) {
      throw reportError(400, "Add at least one purchase item.");
    }
    const isOpeningStock = input.is_opening_stock === true || input.is_opening_stock === 1;
    const purchaseDate = readDate(input.purchase_date, "Purchase date");
    const amountPaid = readAmount(input.amount_paid ?? 0, "Amount paid");
    const paymentMethod = input.payment_method || "Credit";
    if (!PAYMENT_METHODS.has(paymentMethod)) throw reportError(400, "Choose a valid payment method.");
    if (amountPaid > 0 && paymentMethod === "Credit") {
      throw reportError(400, "Choose an actual payment method when recording an amount paid.");
    }
    const supplierId = input.supplier_id ? Number(input.supplier_id) : null;
    if (supplierId !== null && (!Number.isSafeInteger(supplierId) || supplierId < 1)) {
      throw reportError(400, "Choose a valid supplier.");
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (supplierId) {
        const [suppliers] = await connection.execute("SELECT id FROM suppliers WHERE id = ? AND status = 'Active' FOR UPDATE", [supplierId]);
        if (!suppliers.length) throw reportError(404, "Supplier was not found or is inactive.");
      } else if (!isOpeningStock) {
        throw reportError(400, "Select a supplier for a purchase.");
      }

      const items = [];
      for (const item of input.items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity);
        if (!Number.isSafeInteger(productId) || productId < 1 ||
            !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) {
          throw reportError(400, "Each purchase item needs a product and positive whole-number quantity.");
        }
        const unitCost = readAmount(item.unit_cost, "Unit cost");
        const gstRate = readAmount(item.gst_rate ?? 0, "GST rate", { maximum: 100 });
        const [products] = await connection.execute(
          "SELECT id, product_code, name, category FROM products WHERE id = ? FOR UPDATE",
          [productId],
        );
        const product = products[0];
        if (!product) throw reportError(404, `Product ${productId} was not found.`);
        const taxable = roundMoney(unitCost * quantity);
        const gst = roundMoney(taxable * gstRate / 100);
        items.push({
          product,
          quantity,
          unitCost,
          gstRate,
          taxable,
          gst,
          total: roundMoney(taxable + gst),
        });
      }
      const subtotal = roundMoney(items.reduce((sum, item) => sum + item.taxable, 0));
      const gstAmount = roundMoney(items.reduce((sum, item) => sum + item.gst, 0));
      const total = roundMoney(subtotal + gstAmount);
      if (amountPaid > total) throw reportError(400, "Amount paid cannot exceed the purchase total.");
      const balanceDue = roundMoney(total - amountPaid);
      const [purchaseResult] = await connection.execute(
        `INSERT INTO purchase_receipts
          (supplier_id, supplier_bill_number, purchase_date, is_opening_stock, subtotal,
           taxable_amount, gst_amount, total_amount, amount_paid, balance_due, payment_method, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplierId, readText(input.supplier_bill_number, "Supplier bill number", { max: 100 }) || null,
          purchaseDate, isOpeningStock ? 1 : 0, subtotal, subtotal, gstAmount, total,
          amountPaid, balanceDue, paymentMethod, readText(input.notes, "Notes", { max: 5000 }) || null,
          actor || null,
        ],
      );
      const purchaseId = purchaseResult.insertId;
      const purchaseNumber = `${isOpeningStock ? "OPEN" : "PUR"}-${String(purchaseId).padStart(6, "0")}`;
      await connection.execute("UPDATE purchase_receipts SET purchase_number = ? WHERE id = ?", [purchaseNumber, purchaseId]);

      const transactionRef = `report-purchase:${purchaseId}`;
      const transactionId = isOpeningStock ? null : await createTransaction(connection, {
        reference: transactionRef,
        type: "Purchase Receipt",
        referenceType: "purchase",
        referenceId: purchaseId,
        referenceNumber: purchaseNumber,
        createdBy: actor,
        remarks: `Stock received for ${purchaseNumber}`,
      });
      for (const item of items) {
        const [itemResult] = await connection.execute(
          `INSERT INTO purchase_receipt_items
            (purchase_id, product_id, product_name, sku, category, quantity, unit_cost,
             taxable_amount, gst_rate, gst_amount, total_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            purchaseId, item.product.id, item.product.name, item.product.product_code,
            item.product.category, item.quantity, item.unitCost, item.taxable, item.gstRate,
            item.gst, item.total,
          ],
        );
        if (!isOpeningStock) {
          const stock = await getStockForUpdate(connection, item.product.id);
          const previousStock = Number(stock.available_stock || 0);
          const currentStock = previousStock + item.quantity;
          await updateAvailableStock(connection, item.product.id, currentStock);
          await insertMovement(connection, {
            transactionId,
            productId: item.product.id,
            key: `${transactionRef}:item:${itemResult.insertId}`,
            type: "Purchase Receipt",
            productName: item.product.name,
            productSku: item.product.product_code,
            previousStock,
            stockIn: item.quantity,
            currentStock,
            updatedBy: actor,
            remarks: `Received ${item.quantity} unit(s)`,
          });
        }
      }
      if (amountPaid > 0) {
        await connection.execute(
          `INSERT INTO purchase_receipt_payments
            (purchase_id, paid_at, payment_method, reference_number, amount)
           VALUES (?, ?, ?, ?, ?)`,
          [
            purchaseId, purchaseDate, paymentMethod,
            readText(input.reference_number, "Reference number", { max: 100 }) || null,
            amountPaid,
          ],
        );
      }
      await connection.commit();
      return { id: purchaseId, purchase_number: purchaseNumber, total_amount: total, balance_due: balanceDue };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function createExpense(input, actor = null) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw reportError(400, "Expense details are required.");
    }
    const expenseDate = readDate(input?.expense_date, "Expense date");
    const category = readText(input?.category, "Expense category", { required: true, max: 100 });
    const description = readText(input?.description, "Expense description", { required: true, max: 500 });
    const amount = readAmount(input?.amount, "Expense amount", { minimum: 0.01 });
    const paymentMethod = input.payment_method || "Cash";
    if (!PAYMENT_METHODS.has(paymentMethod) || paymentMethod === "Credit") {
      throw reportError(400, "Choose an actual payment method.");
    }
    const [result] = await pool.execute(
      `INSERT INTO expenses (expense_date, category, description, amount, payment_method, reference_number, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseDate, category, description, amount, paymentMethod,
        readText(input.reference_number, "Reference number", { max: 100 }) || null, actor || null,
      ],
    );
    return { id: result.insertId, expense_date: expenseDate, category, amount };
  }

  async function createPurchasePayment(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw reportError(400, "Supplier payment details are required.");
    }
    const purchaseId = Number(input.purchase_id);
    if (!Number.isSafeInteger(purchaseId) || purchaseId < 1) {
      throw reportError(400, "Choose a valid purchase.");
    }
    const paidAt = readDate(input.paid_at, "Payment date");
    const amount = readAmount(input.amount, "Payment amount", { minimum: 0.01 });
    const paymentMethod = input.payment_method || "Cash";
    if (!PAYMENT_METHODS.has(paymentMethod) || paymentMethod === "Credit") {
      throw reportError(400, "Choose an actual payment method.");
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [purchaseRows] = await connection.execute(
        "SELECT id, is_opening_stock, amount_paid, balance_due, purchase_date FROM purchase_receipts WHERE id = ? FOR UPDATE",
        [purchaseId],
      );
      const purchase = purchaseRows[0];
      if (!purchase) throw reportError(404, "Purchase receipt was not found.");
      if (purchase.is_opening_stock) throw reportError(400, "Opening stock valuation is not a supplier purchase.");
      if (paidAt < String(purchase.purchase_date).slice(0, 10)) {
        throw reportError(400, "Payment date cannot be before the purchase date.");
      }
      const balanceDue = Number(purchase.balance_due);
      if (amount > balanceDue) {
        throw reportError(409, `Payment cannot exceed the remaining balance of ${balanceDue.toFixed(2)}.`);
      }
      const nextPaid = roundMoney(Number(purchase.amount_paid) + amount);
      const nextBalance = roundMoney(balanceDue - amount);
      await connection.execute(
        `INSERT INTO purchase_receipt_payments
          (purchase_id, paid_at, payment_method, reference_number, amount)
         VALUES (?, ?, ?, ?, ?)`,
        [
          purchaseId, paidAt, paymentMethod,
          readText(input.reference_number, "Reference number", { max: 100 }) || null,
          amount,
        ],
      );
      await connection.execute(
        "UPDATE purchase_receipts SET amount_paid = ?, balance_due = ?, payment_method = ? WHERE id = ?",
        [nextPaid, nextBalance, paymentMethod, purchaseId],
      );
      await connection.commit();
      return { purchase_id: purchaseId, amount_paid: nextPaid, balance_due: nextBalance };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function createPurchaseReturn(input, actor = null) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw reportError(400, "Purchase return details are required.");
    }
    const purchaseId = Number(input?.purchase_id);
    const returnDate = readDate(input?.return_date, "Return date");
    const reason = readText(input?.reason, "Return reason", { required: true });
    if (!Number.isSafeInteger(purchaseId) || purchaseId < 1 ||
        !Array.isArray(input.items) || input.items.length === 0) {
      throw reportError(400, "Select a purchase and at least one item to return.");
    }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [purchases] = await connection.execute("SELECT * FROM purchase_receipts WHERE id = ? FOR UPDATE", [purchaseId]);
      if (!purchases[0]) throw reportError(404, "Purchase receipt was not found.");
      const purchase = purchases[0];
      if (returnDate < String(purchase.purchase_date).slice(0, 10)) {
        throw reportError(400, "Return date cannot be before the purchase date.");
      }
      const returnedItems = [];
      const requestedItemIds = new Set();
      for (const requested of input.items) {
        const itemId = Number(requested.purchase_item_id);
        const quantity = Number(requested.quantity);
        if (!Number.isSafeInteger(itemId) || itemId < 1 ||
            !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000000) {
          throw reportError(400, "Return quantities must be positive whole numbers.");
        }
        if (requestedItemIds.has(itemId)) {
          throw reportError(400, "Each purchase item can only appear once in a return.");
        }
        requestedItemIds.add(itemId);
        const [itemRows] = await connection.execute(
          `SELECT pri.*, p.total_stock FROM purchase_receipt_items pri
           JOIN products p ON p.id = pri.product_id
           WHERE pri.id = ? AND pri.purchase_id = ? FOR UPDATE`,
          [itemId, purchaseId],
        );
        const item = itemRows[0];
        if (!item) throw reportError(400, "A return item does not belong to this purchase.");
        const [returnedRows] = await connection.execute(
          "SELECT COALESCE(SUM(quantity), 0) AS quantity FROM purchase_return_items WHERE purchase_item_id = ?",
          [itemId],
        );
        if (quantity > Number(item.quantity) - Number(returnedRows[0]?.quantity || 0)) {
          throw reportError(400, `Return quantity for ${item.product_name} exceeds the remaining purchased quantity.`);
        }
        const unitTaxable = Number(item.taxable_amount) / Number(item.quantity);
        const unitGst = Number(item.gst_amount) / Number(item.quantity);
        returnedItems.push({
          ...item,
          quantity,
          taxable: roundMoney(unitTaxable * quantity),
          gst: roundMoney(unitGst * quantity),
          total: roundMoney((unitTaxable + unitGst) * quantity),
        });
      }
      const taxableAmount = roundMoney(returnedItems.reduce((sum, item) => sum + item.taxable, 0));
      const gstAmount = roundMoney(returnedItems.reduce((sum, item) => sum + item.gst, 0));
      const totalAmount = roundMoney(taxableAmount + gstAmount);
      const [returnResult] = await connection.execute(
        `INSERT INTO purchase_returns
          (purchase_id, supplier_id, return_date, reason, taxable_amount, gst_amount, total_amount, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [purchaseId, purchase.supplier_id, returnDate, reason, taxableAmount, gstAmount, totalAmount, actor || null],
      );
      const returnId = returnResult.insertId;
      const returnNumber = `PRT-${returnDate.slice(0, 4)}-${String(returnId).padStart(6, "0")}`;
      await connection.execute("UPDATE purchase_returns SET return_number = ? WHERE id = ?", [returnNumber, returnId]);
      const transactionRef = `purchase-return:${returnId}`;
      const transactionId = await createTransaction(connection, {
        reference: transactionRef,
        type: "Purchase Return",
        referenceType: "purchase-return",
        referenceId: returnId,
        referenceNumber: returnNumber,
        createdBy: actor,
        remarks: reason,
      });
      for (const item of returnedItems) {
        await connection.execute(
          `INSERT INTO purchase_return_items
            (return_id, purchase_item_id, product_id, product_name, quantity, taxable_amount, gst_amount, total_amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [returnId, item.id, item.product_id, item.product_name, item.quantity, item.taxable, item.gst, item.total],
        );
        const stock = await getStockForUpdate(connection, item.product_id);
        const previousStock = Number(stock.available_stock || 0);
        if (previousStock < item.quantity) {
          throw reportError(409, `Cannot return ${item.product_name}; only ${previousStock} unit(s) are available in stock.`);
        }
        const currentStock = previousStock - item.quantity;
        await updateAvailableStock(connection, item.product_id, currentStock);
        await insertMovement(connection, {
          transactionId,
          productId: item.product_id,
          key: `${transactionRef}:item:${item.id}`,
          type: "Purchase Return",
          productName: item.product_name,
          productSku: item.sku,
          previousStock,
          stockOut: item.quantity,
          currentStock,
          updatedBy: actor,
          remarks: reason,
        });
      }
      const [returns] = await connection.execute(
        "SELECT COALESCE(SUM(total_amount), 0) AS total FROM purchase_returns WHERE purchase_id = ?",
        [purchaseId],
      );
      const balanceDue = roundMoney(Number(purchase.total_amount) - Number(purchase.amount_paid) - Number(returns[0]?.total || 0));
      await connection.execute("UPDATE purchase_receipts SET balance_due = ? WHERE id = ?", [balanceDue, purchaseId]);
      await connection.commit();
      return { id: returnId, return_number: returnNumber, total_amount: totalAmount };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  return {
    getDateRange,
    getOptions,
    getReport,
    getSummary,
    createSupplier,
    createPurchase,
    createPurchasePayment,
    createExpense,
    createPurchaseReturn,
  };
}

module.exports = { createReportsService, getDateRange, REPORT_TYPES };
