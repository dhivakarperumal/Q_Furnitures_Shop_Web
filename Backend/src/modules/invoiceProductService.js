const { randomUUID } = require("node:crypto");
const { Readable } = require("node:stream");
const ExcelJS = require("exceljs");

const EXPORT_COLUMNS = [
  ["product_name", "Product Name"],
  ["sku", "Product SKU"],
  ["category", "Category"],
  ["quantity", "Quantity"],
  ["unit_price", "Unit Price"],
  ["gst_rate", "GST %"],
  ["discount_amount", "Discount"],
  ["line_total", "Total Amount"],
  ["invoice_number", "Invoice Number"],
  ["invoice_date", "Invoice Date"],
  ["dealer_name", "Dealer"],
];

function cellValue(value) {
  if (value && typeof value === "object") {
    if (value.text) return value.text;
    if (value.result !== undefined) return value.result;
    if (Array.isArray(value.richText)) return value.richText.map((item) => item.text).join("");
  }
  return value == null ? "" : value;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function numericValue(value) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value || "").trim().replace(/,/g, "").replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function sanitizeCsvCell(value) {
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return `'${value}`;
  return value;
}

function createInvoiceProductService(pool) {
  async function parseWorkbook(buffer, fileName) {
    const workbook = new ExcelJS.Workbook();
    if (fileName.toLowerCase().endsWith(".csv")) {
      await workbook.csv.read(Readable.from([buffer]));
    } else {
      await workbook.xlsx.load(buffer);
    }
    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      const error = new Error("The uploaded file must include a header row and at least one product.");
      error.status = 400;
      throw error;
    }
    if (worksheet.rowCount > 1001) {
      const error = new Error("Import files can contain no more than 1,000 product rows.");
      error.status = 400;
      throw error;
    }
    const headers = Array.from(worksheet.getRow(1).values, (value) => normalizeHeader(cellValue(value)));
    const headerIndexes = new Map(headers.map((header, index) => [header, index]));
    const aliases = {
      sku: ["productsku", "sku", "productcode"],
      id: ["productid", "id"],
      name: ["productname", "name"],
      category: ["category"],
      hsn: ["hsncode", "hsn"],
      material: ["material"],
      size: ["size", "dimensions"],
      quantity: ["quantity", "invoicequantity", "qty"],
      unitPrice: ["unitprice", "sellingprice", "price"],
      discount: ["discount", "discountamount"],
      gst: ["gst", "gstpercentage", "gstrate"],
      unit: ["unit"],
    };
    const columnIndexes = {};
    for (const [field, names] of Object.entries(aliases)) {
      columnIndexes[field] = names.map((name) => headerIndexes.get(name)).find((index) => index !== undefined);
    }

    const missingColumns = ["name", "quantity", "unitPrice", "gst"].filter((field) => columnIndexes[field] === undefined);
    if (columnIndexes.sku === undefined && columnIndexes.id === undefined) missingColumns.push("sku or product id");
    if (missingColumns.length) {
      const error = new Error(`Missing required template columns: ${missingColumns.join(", ")}.`);
      error.status = 400;
      throw error;
    }

    const [products] = await pool.execute(
      `SELECT id, product_code, name, category, status, product_data
       FROM products`,
    );
    const byId = new Map(products.map((product) => [String(product.id), product]));
    const bySku = new Map(products.filter((product) => product.product_code).map((product) => [product.product_code.toLowerCase(), product]));
    const usedProductIds = new Set();
    const previewRows = [];
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const values = row.values.map(cellValue);
      if (values.every((value) => String(value).trim() === "")) continue;
      const get = (field) => columnIndexes[field] === undefined ? "" : values[columnIndexes[field]];
      const sku = String(get("sku") || "").trim();
      const productId = String(get("id") || "").trim();
      const productName = String(get("name") || "").trim();
      const quantity = numericValue(get("quantity"));
      const unitPrice = numericValue(get("unitPrice"));
      const discount = columnIndexes.discount === undefined || get("discount") === ""
        ? 0
        : numericValue(get("discount"));
      const gstRate = numericValue(get("gst"));
      const errors = [];
      let product = productId ? byId.get(productId) : null;
      if (productId && !product) errors.push(`Product ID ${productId} was not found.`);
      if (sku) {
        const skuProduct = bySku.get(sku.toLowerCase());
        if (!skuProduct) errors.push(`Product SKU ${sku} was not found.`);
        else if (product && Number(skuProduct.id) !== Number(product.id)) errors.push("Product ID and SKU refer to different products.");
        else product = skuProduct;
      }
      if (!sku && !productId) errors.push("Product SKU or Product ID is required.");
      if (!product && !errors.some((error) => error.includes("was not found"))) {
        errors.push("Product was not found in the product catalog.");
      }
      if (!productName) errors.push("Product Name is required.");
      if (productName && product && productName.toLowerCase() !== product.name.trim().toLowerCase()) {
        errors.push(`Product Name must match the catalog name: ${product.name}.`);
      }
      if (product && product.status !== "Active") errors.push(`Product ${product.name} is not active.`);
      if (!Number.isSafeInteger(quantity) || quantity <= 0) errors.push("Quantity must be a positive whole number.");
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) errors.push("Unit Price must be greater than zero.");
      if (!Number.isFinite(discount) || discount < 0 || (Number.isFinite(unitPrice) && Number.isSafeInteger(quantity) && discount > unitPrice * quantity)) {
        errors.push("Discount must be non-negative and cannot exceed the line amount.");
      }
      if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) errors.push("GST Percentage must be between 0 and 100.");
      if (product && usedProductIds.has(Number(product.id))) errors.push(`Duplicate product ${product.name} appears more than once.`);
      if (product) usedProductIds.add(Number(product.id));
      const data = product ? (typeof product.product_data === "object" ? product.product_data : JSON.parse(product.product_data || "{}")) : {};
      previewRows.push({
        row_number: rowNumber,
        product_id: product ? Number(product.id) : null,
        sku: product?.product_code || sku,
        product_name: productName,
        category: String(get("category") || product?.category || ""),
        hsn_code: String(get("hsn") || data.hsn_code || data.hsn || ""),
        material: String(get("material") || data.material_type || data.material || ""),
        dimensions: String(get("size") || data.dimensions || data.size || ""),
        quantity: Number.isSafeInteger(quantity) ? quantity : null,
        unit: String(get("unit") || "pcs").trim() || "pcs",
        unit_price: Number.isFinite(unitPrice) ? Math.round(unitPrice * 100) / 100 : null,
        discount_amount: Number.isFinite(discount) ? Math.round(discount * 100) / 100 : null,
        gst_rate: Number.isFinite(gstRate) ? gstRate : null,
        errors,
        valid: errors.length === 0,
      });
    }
    return previewRows;
  }

  async function preview({ buffer, fileName, actor }) {
    const rows = await parseWorkbook(buffer, fileName);
    const validRows = rows.filter((row) => row.valid).map(({ errors, valid, row_number, ...item }) => item);
    const errors = rows.filter((row) => !row.valid).map((row) => ({
      row_number: row.row_number,
      product_name: row.product_name,
      sku: row.sku,
      errors: row.errors,
    }));
    const importToken = randomUUID();
    await pool.execute(
      `INSERT INTO product_import_logs
        (import_token, created_by, file_name, status, row_count, valid_count, errors, preview_data)
       VALUES (?, ?, ?, 'preview', ?, ?, ?, ?)`,
      [importToken, actor || null, fileName.slice(0, 255), rows.length, validRows.length, JSON.stringify(errors), JSON.stringify(validRows)],
    );
    return {
      import_token: importToken,
      row_count: rows.length,
      valid_count: validRows.length,
      invalid_count: errors.length,
      missing_products: errors.filter((row) => row.errors.some((message) => message.includes("was not found"))),
      errors,
      rows,
    };
  }

  async function confirm(importToken, actor) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute(
        `SELECT * FROM product_import_logs
         WHERE import_token = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
         FOR UPDATE`,
        [importToken],
      );
      const importLog = rows[0];
      if (!importLog) {
        const error = new Error("Import preview was not found or has expired.");
        error.status = 404;
        throw error;
      }
      if (importLog.status !== "preview") {
        const error = new Error("This import has already been confirmed.");
        error.status = 409;
        throw error;
      }
      const items = typeof importLog.preview_data === "string"
        ? JSON.parse(importLog.preview_data)
        : importLog.preview_data || [];
      await connection.execute(
        "UPDATE product_import_logs SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP WHERE id = ?",
        [importLog.id],
      );
      await connection.commit();
      return { import_token: importToken, confirmed_count: items.length, items, confirmed_by: actor };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function exportRows({ scope = "all", invoiceId = null, dealerId = null, from = null, to = null, itemIds = [] } = {}) {
    const filters = ["i.status NOT IN ('Cancelled', 'Draft')"];
    const parameters = [];
    if (scope === "current" || scope === "invoice") {
      if (!invoiceId) throw stockRequestError("Invoice ID is required for this export.");
      filters.push("i.id = ?");
      parameters.push(invoiceId);
    } else if (scope === "dealer") {
      if (!dealerId) throw stockRequestError("Dealer ID is required for this export.");
      filters.push("i.dealer_id = ?");
      parameters.push(dealerId);
    } else if (scope === "date") {
      if (!from || !to) throw stockRequestError("Start and end dates are required for date-wise export.");
      filters.push("i.invoice_date BETWEEN ? AND ?");
      parameters.push(from, to);
    } else if (scope === "selected") {
      if (!itemIds.length) throw stockRequestError("Select invoice products to export.");
      filters.push(`ii.id IN (${itemIds.map(() => "?").join(",")})`);
      parameters.push(...itemIds);
    } else if (scope !== "all") {
      throw stockRequestError("Choose a valid export scope.");
    }
    const [rows] = await pool.execute(
      `SELECT ii.product_name, ii.sku, ii.category, ii.quantity, ii.unit_price, ii.gst_rate,
              ii.discount_amount, ii.line_total, i.invoice_number, i.invoice_date, d.name AS dealer_name
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       LEFT JOIN dealers d ON d.id = i.dealer_id
       WHERE ${filters.join(" AND ")}
       ORDER BY i.invoice_date, i.id, ii.id`,
      parameters,
    );
    return rows;
  }

  async function makeExport(rows, format) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Invoice Products");
    worksheet.columns = EXPORT_COLUMNS.map(([key, header]) => ({ header, key, width: Math.max(header.length + 2, 18) }));
    for (const row of rows) {
      worksheet.addRow(Object.fromEntries(EXPORT_COLUMNS.map(([key]) => [key, sanitizeCsvCell(row[key] ?? "")])));
    }
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A2A16" } };
    worksheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + EXPORT_COLUMNS.length)}1` };
    return format === "csv" ? workbook.csv.writeBuffer() : workbook.xlsx.writeBuffer();
  }

  return {
    template() {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Invoice Products");
      worksheet.columns = [
        { header: "Product SKU", key: "sku", width: 22 },
        { header: "Product Name", key: "name", width: 32 },
        { header: "Category", key: "category", width: 22 },
        { header: "HSN Code", key: "hsn", width: 16 },
        { header: "Material", key: "material", width: 20 },
        { header: "Size", key: "size", width: 18 },
        { header: "Quantity", key: "quantity", width: 14 },
        { header: "Unit Price", key: "unit_price", width: 16 },
        { header: "Discount", key: "discount", width: 14 },
        { header: "GST", key: "gst", width: 12 },
      ];
      worksheet.addRow({
        sku: "QF-2026-00001",
        name: "Wooden Sofa",
        category: "Sofas",
        hsn: "940161",
        material: "Solid Wood",
        size: "3 Seater",
        quantity: 1,
        unit_price: 25000,
        discount: 0,
        gst: 18,
      });
      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A2A16" } };
      return workbook.xlsx.writeBuffer();
    },
    preview,
    confirm,
    exportRows,
    makeExport,
  };
}

function stockRequestError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

module.exports = { createInvoiceProductService, normalizeHeader };
