const { createStockService } = require("./stockService");

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parseProductData(value) {
  if (value && typeof value === "object") return value;
  if (!value) return {};
  const parsed = JSON.parse(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function dateOnly(value) {
  if (!(value instanceof Date)) return String(value || "").slice(0, 10);
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function invoiceStatus(amountPaid, total, dueDate) {
  if (amountPaid >= total) return "Paid";
  if (amountPaid > 0) return "Partially Paid";
  const due = dateOnly(dueDate);
  if (due && due < new Date().toISOString().slice(0, 10)) return "Overdue";
  return "Unpaid";
}

function createInvoiceService(pool, stockService = createStockService(pool)) {
  async function getById(id, executor = pool) {
    const [rows] = await executor.execute(
      `SELECT i.*, d.dealer_code
       FROM invoices i LEFT JOIN dealers d ON d.id = i.dealer_id
       WHERE i.id = ? LIMIT 1`,
      [id],
    );
    if (!rows[0]) return null;
    const [items] = await executor.execute(
      "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id",
      [id],
    );
    const [payments] = await executor.execute(
      "SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY paid_at, id",
      [id],
    );
    const [creditNotes] = await executor.execute(
      "SELECT * FROM credit_notes WHERE invoice_id = ? ORDER BY credit_date, id",
      [id],
    );
    const [creditItems] = await executor.execute(
      `SELECT cni.* FROM credit_note_items cni
       JOIN credit_notes cn ON cn.id = cni.credit_note_id
       WHERE cn.invoice_id = ? ORDER BY cni.id`,
      [id],
    );
    const [creditedQuantities] = await executor.execute(
      `SELECT cni.invoice_item_id, SUM(cni.quantity) AS quantity
       FROM credit_note_items cni
       JOIN credit_notes cn ON cn.id = cni.credit_note_id
       WHERE cn.invoice_id = ? GROUP BY cni.invoice_item_id`,
      [id],
    );
    const creditedQuantityMap = new Map(creditedQuantities.map((row) => [Number(row.invoice_item_id), Number(row.quantity)]));
    return {
      ...rows[0],
      items: items.map((item) => ({
        ...item,
        credited_quantity: creditedQuantityMap.get(Number(item.id)) || 0,
        remaining_quantity: Number(item.quantity) - (creditedQuantityMap.get(Number(item.id)) || 0),
      })),
      payments,
      credit_notes: creditNotes.map((creditNote) => ({
        ...creditNote,
        items: creditItems.filter((item) => Number(item.credit_note_id) === Number(creditNote.id)),
      })),
    };
  }

  async function insertLedgerEntry(connection, dealerId, entry) {
    if (!dealerId) return;
    const [lastRows] = await connection.execute(
      "SELECT balance FROM dealer_ledger WHERE dealer_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [dealerId],
    );
    const previousBalance = Number(lastRows[0]?.balance || 0);
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    await connection.execute(
      `INSERT INTO dealer_ledger
        (dealer_id, invoice_id, transaction_date, transaction_type, reference_number, description, debit, credit, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dealerId,
        entry.invoiceId || null,
        entry.date,
        entry.type,
        entry.reference,
        entry.description,
        debit,
        credit,
        roundMoney(previousBalance + debit - credit),
      ],
    );
  }

  return {
    async list({ page = 1, limit = 25, search = "", status = "All" } = {}) {
      const filters = [];
      const parameters = [];
      if (search) {
        const term = `%${search}%`;
        filters.push("(i.invoice_number LIKE ? OR i.customer_name LIKE ? OR d.name LIKE ?)");
        parameters.push(term, term, term);
      }
      if (status !== "All") {
        filters.push("i.status = ?");
        parameters.push(status);
      }
      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const offset = (page - 1) * limit;
      const [invoices] = await pool.execute(
        `SELECT i.id, i.invoice_number, i.invoice_date, i.due_date, i.customer_name,
                i.grand_total, i.amount_paid, i.credited_amount, i.balance_due, i.status,
                d.id AS dealer_id, d.name AS dealer_name
         FROM invoices i LEFT JOIN dealers d ON d.id = i.dealer_id
         ${whereClause}
         ORDER BY i.created_at DESC, i.id DESC LIMIT ? OFFSET ?`,
        [...parameters, limit, offset],
      );
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM invoices i LEFT JOIN dealers d ON d.id = i.dealer_id ${whereClause}`,
        parameters,
      );
      return {
        invoices,
        pagination: {
          total: Number(countRows[0]?.total || 0),
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / limit)),
        },
      };
    },

    getById,

    async createCreditNote(invoiceId, creditNote, actor = null) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [invoiceRows] = await connection.execute(
          "SELECT * FROM invoices WHERE id = ? FOR UPDATE",
          [invoiceId],
        );
        const invoice = invoiceRows[0];
        if (!invoice) {
          const error = new Error("Invoice was not found.");
          error.status = 404;
          throw error;
        }
        if (invoice.status === "Cancelled") {
          const error = new Error("Credit notes cannot be issued for a cancelled invoice.");
          error.status = 400;
          throw error;
        }
        if (invoice.status === "Draft") {
          const error = new Error("Draft invoices must be finalized before a credit note can be issued.");
          error.status = 400;
          throw error;
        }
        const invoiceDate = dateOnly(invoice.invoice_date);
        if (creditNote.credit_date < invoiceDate) {
          const error = new Error("Credit date cannot be before the invoice date.");
          error.status = 400;
          throw error;
        }
        const [invoiceItems] = await connection.execute(
          "SELECT * FROM invoice_items WHERE invoice_id = ? FOR UPDATE",
          [invoiceId],
        );
        const [previousCredits] = await connection.execute(
          `SELECT cni.invoice_item_id, SUM(cni.quantity) AS quantity,
                  SUM(cni.taxable_amount) AS taxable_amount,
                  SUM(cni.cgst_amount) AS cgst_amount,
                  SUM(cni.sgst_amount) AS sgst_amount,
                  SUM(cni.igst_amount) AS igst_amount,
                  SUM(cni.amount) AS amount
           FROM credit_note_items cni
           JOIN credit_notes cn ON cn.id = cni.credit_note_id
           WHERE cn.invoice_id = ?
           GROUP BY cni.invoice_item_id`,
          [invoiceId],
        );
        const previousCreditMap = new Map(previousCredits.map((row) => [Number(row.invoice_item_id), row]));
        const requestedCredits = [];
        for (const requested of creditNote.items) {
          const source = invoiceItems.find((item) => Number(item.id) === requested.invoice_item_id);
          if (!source) {
            const error = new Error("A selected product does not belong to this invoice.");
            error.status = 400;
            throw error;
          }
          const previous = previousCreditMap.get(Number(source.id)) || {};
          const remainingQuantity = Number(source.quantity) - Number(previous.quantity || 0);
          if (requested.quantity > remainingQuantity) {
            const error = new Error(`Credit quantity for ${source.product_name} exceeds the unreturned quantity.`);
            error.status = 400;
            throw error;
          }
          const portion = (sourceAmount, previousAmount) => {
            const remainingAmount = roundMoney(Number(sourceAmount) - Number(previousAmount || 0));
            return requested.quantity === remainingQuantity
              ? remainingAmount
              : roundMoney(remainingAmount * requested.quantity / remainingQuantity);
          };
          const taxable = portion(source.taxable_amount, previous.taxable_amount);
          const cgst = portion(source.cgst_amount, previous.cgst_amount);
          const sgst = portion(source.sgst_amount, previous.sgst_amount);
          const igst = portion(source.igst_amount, previous.igst_amount);
          requestedCredits.push({
            invoice_item_id: source.id,
            product_id: source.product_id,
            product_name: source.product_name,
            hsn_code: source.hsn_code,
            quantity: requested.quantity,
            stock_disposition: requested.stock_disposition,
            taxable_amount: taxable,
            cgst_amount: cgst,
            sgst_amount: sgst,
            igst_amount: igst,
            amount: roundMoney(taxable + cgst + sgst + igst),
          });
        }
        const amount = roundMoney(requestedCredits.reduce((sum, item) => sum + item.amount, 0));
        if (amount <= 0 || amount > Number(invoice.balance_due)) {
          const error = new Error("Credit value must be positive and cannot exceed the unpaid invoice balance.");
          error.status = 400;
          throw error;
        }
        const [noteResult] = await connection.execute(
          `INSERT INTO credit_notes
            (credit_note_number, invoice_id, dealer_id, credit_date, reason, amount, notes)
           VALUES (NULL, ?, ?, ?, ?, ?, ?)`,
          [invoiceId, invoice.dealer_id, creditNote.credit_date, creditNote.reason, amount, creditNote.notes],
        );
        const noteId = noteResult.insertId;
        const noteNumber = `QF-CN-${creditNote.credit_date.slice(0, 4)}-${String(noteId).padStart(6, "0")}`;
        await connection.execute("UPDATE credit_notes SET credit_note_number = ? WHERE id = ?", [noteNumber, noteId]);
        for (const item of requestedCredits) {
          await connection.execute(
            `INSERT INTO credit_note_items
              (credit_note_id, invoice_item_id, product_name, hsn_code, quantity,
               taxable_amount, cgst_amount, sgst_amount, igst_amount, amount, stock_disposition)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              noteId, item.invoice_item_id, item.product_name, item.hsn_code, item.quantity,
              item.taxable_amount, item.cgst_amount, item.sgst_amount, item.igst_amount,
              item.amount, item.stock_disposition,
            ],
          );
          await stockService.restoreReturnedStock(connection, {
            invoiceId,
            invoiceItemId: item.invoice_item_id,
            creditNoteId: noteId,
            creditNoteNumber: noteNumber,
            productId: item.product_id,
            productName: item.product_name,
            productSku: invoiceItems.find((line) => Number(line.id) === Number(item.invoice_item_id))?.sku,
            quantity: item.quantity,
            disposition: item.stock_disposition,
            actor,
          });
        }
        const creditedAmount = roundMoney(Number(invoice.credited_amount || 0) + amount);
        const balanceDue = roundMoney(Number(invoice.grand_total) - Number(invoice.amount_paid) - creditedAmount);
        const status = balanceDue === 0
          ? Number(invoice.amount_paid) > 0 ? "Paid" : "Credited"
          : invoiceStatus(Number(invoice.amount_paid), Number(invoice.grand_total), invoice.due_date);
        await connection.execute(
          "UPDATE invoices SET credited_amount = ?, balance_due = ?, status = ? WHERE id = ?",
          [creditedAmount, balanceDue, status, invoiceId],
        );
        await insertLedgerEntry(connection, invoice.dealer_id, {
          invoiceId,
          date: creditNote.credit_date,
          type: "Credit Note",
          reference: noteNumber,
          description: `${noteNumber} - ${creditNote.reason}`,
          credit: amount,
        });
        const createdInvoice = await getById(invoiceId, connection);
        await connection.commit();
        return createdInvoice;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async create(input, actor = null) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        let dealer = null;
        if (input.dealer_id) {
          const [dealerRows] = await connection.execute(
            "SELECT id, name, mobile, email, gstin, billing_address, shipping_address, state, opening_balance, status FROM dealers WHERE id = ? FOR UPDATE",
            [input.dealer_id],
          );
          dealer = dealerRows[0];
          if (!dealer) {
            const error = new Error("Selected dealer was not found.");
            error.status = 404;
            throw error;
          }
          if (dealer.status !== "Active") {
            const error = new Error("Invoices cannot be created for an inactive dealer.");
            error.status = 400;
            throw error;
          }
        }

        const invoiceItems = [];
        for (const requestedItem of input.items) {
          const [products] = await connection.execute(
            `SELECT id, product_code, name, category, offer_price, selling_price, product_data, status
             FROM products WHERE id = ? LIMIT 1`,
            [requestedItem.product_id],
          );
          const product = products[0];
          if (!product) {
            const error = new Error(`Product ${requestedItem.product_id} was not found.`);
            error.status = 400;
            throw error;
          }
          if (product.status !== "Active") {
            const error = new Error(`Product ${product.name} is not active.`);
            error.status = 400;
            throw error;
          }
          const data = parseProductData(product.product_data);
          const quantity = requestedItem.quantity;
          const unitPrice = Number(requestedItem.unit_price ?? product.offer_price ?? product.selling_price);
          const discountType = requestedItem.discount_type || "none";
          const discountValue = Number(requestedItem.discount_value || 0);
          const gstRate = Number(requestedItem.gst_rate ?? data.gst_percentage ?? data.gst_rate ?? 18);
          if (!Number.isFinite(unitPrice) || unitPrice <= 0 || !Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
            const error = new Error(`Product ${product.name} has invalid price or GST configuration.`);
            error.status = 400;
            throw error;
          }
          const gross = unitPrice * quantity;
          const discount = discountType === "percentage"
            ? gross * discountValue / 100
            : discountType === "fixed" ? discountValue * quantity : 0;
          if (discount > gross) {
            const error = new Error(`Product ${product.name} discount cannot exceed its line value.`);
            error.status = 400;
            throw error;
          }
          const taxable = roundMoney(gross - discount);
          const gst = roundMoney(taxable * gstRate / 100);
          const intraState = input.seller_state.trim().toLowerCase() === input.place_of_supply.trim().toLowerCase();
          invoiceItems.push({
            product_id: product.id,
            sku: product.product_code || "",
            product_name: product.name,
            category: product.category,
            hsn_code: String(data.hsn_code || data.hsn || ""),
            material: String(data.material_type || data.material || ""),
            dimensions: String(data.dimensions || data.size || ""),
            quantity,
            unit: String(requestedItem.unit || "pcs"),
            unit_price: roundMoney(unitPrice),
            discount_type: discountType,
            discount_value: discountValue,
            discount_amount: roundMoney(discount),
            gst_rate: gstRate,
            taxable_amount: taxable,
            cgst_amount: intraState ? roundMoney(gst / 2) : 0,
            sgst_amount: intraState ? roundMoney(gst - roundMoney(gst / 2)) : 0,
            igst_amount: intraState ? 0 : gst,
            gst_amount: gst,
            line_total: roundMoney(taxable + gst),
          });
        }

        const subtotal = roundMoney(invoiceItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0));
        const itemDiscount = roundMoney(invoiceItems.reduce((sum, item) => sum + item.discount_amount, 0));
        const additionalDiscount = input.additional_discount;
        if (additionalDiscount > subtotal - itemDiscount) {
          const error = new Error("Additional discount cannot exceed the remaining subtotal.");
          error.status = 400;
          throw error;
        }
        const remainingTaxable = roundMoney(invoiceItems.reduce((sum, item) => sum + item.taxable_amount, 0));
        let discountLeft = additionalDiscount;
        invoiceItems.forEach((item, index) => {
          const allocation = index === invoiceItems.length - 1
            ? discountLeft
            : remainingTaxable > 0
              ? Math.min(discountLeft, roundMoney(additionalDiscount * item.taxable_amount / remainingTaxable))
              : 0;
          const appliedDiscount = Math.min(item.taxable_amount, allocation);
          discountLeft = Math.max(0, roundMoney(discountLeft - appliedDiscount));
          item.discount_amount = roundMoney(item.discount_amount + appliedDiscount);
          item.taxable_amount = roundMoney(item.taxable_amount - appliedDiscount);
          item.gst_amount = roundMoney(item.taxable_amount * item.gst_rate / 100);
          const intraState = input.seller_state.trim().toLowerCase() === input.place_of_supply.trim().toLowerCase();
          item.cgst_amount = intraState ? roundMoney(item.gst_amount / 2) : 0;
          item.sgst_amount = intraState ? roundMoney(item.gst_amount - item.cgst_amount) : 0;
          item.igst_amount = intraState ? 0 : item.gst_amount;
          item.line_total = roundMoney(item.taxable_amount + item.gst_amount);
        });
        const taxableAmount = roundMoney(invoiceItems.reduce((sum, item) => sum + item.taxable_amount, 0));
        const cgst = roundMoney(invoiceItems.reduce((sum, item) => sum + item.cgst_amount, 0));
        const sgst = roundMoney(invoiceItems.reduce((sum, item) => sum + item.sgst_amount, 0));
        const igst = roundMoney(invoiceItems.reduce((sum, item) => sum + item.igst_amount, 0));
        const delivery = input.delivery_charges;
        const installation = input.installation_charges;
        const beforeRound = taxableAmount + cgst + sgst + igst + delivery + installation;
        const grandTotal = roundMoney(Math.round(beforeRound));
        const roundOff = roundMoney(grandTotal - beforeRound);
        const isDraft = input.is_draft === true;
        const amountReceived = isDraft ? 0 : input.amount_received;
        if (amountReceived > grandTotal) {
          const error = new Error("Amount received cannot exceed the invoice total.");
          error.status = 400;
          throw error;
        }
        const balanceDue = roundMoney(grandTotal - amountReceived);
        const status = isDraft ? "Draft" : invoiceStatus(amountReceived, grandTotal, input.due_date);
        let previousOutstanding = 0;
        if (dealer) {
          const [balanceRows] = await connection.execute(
            `SELECT ? + COALESCE(SUM(balance_due), 0) AS balance
             FROM invoices WHERE dealer_id = ? AND status NOT IN ('Cancelled', 'Draft')`,
            [Number(dealer.opening_balance || 0), dealer.id],
          );
          previousOutstanding = roundMoney(balanceRows[0]?.balance || 0);
        }

        const [invoiceResult] = await connection.execute(
          `INSERT INTO invoices
            (invoice_number, dealer_id, invoice_date, due_date, customer_name, mobile, gstin,
             billing_address, shipping_address, sales_person, payment_terms, seller_state,
             place_of_supply, subtotal, item_discount, additional_discount, taxable_amount,
             cgst_amount, sgst_amount, igst_amount, delivery_charges, installation_charges,
             round_off, grand_total, previous_outstanding, amount_paid, balance_due, status, notes)
           VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dealer?.id || null, input.invoice_date, input.due_date || null,
            input.customer_name, input.mobile, input.gstin, input.billing_address,
            input.shipping_address, input.sales_person, input.payment_terms, input.seller_state,
            input.place_of_supply, subtotal, itemDiscount, additionalDiscount, taxableAmount,
            cgst, sgst, igst, delivery, installation, roundOff, grandTotal,
            previousOutstanding, amountReceived, balanceDue, status, input.notes,
          ],
        );
        const invoiceId = invoiceResult.insertId;
        const invoiceNumber = `QF-INV-${input.invoice_date.slice(0, 4)}-${String(invoiceId).padStart(6, "0")}`;
        await connection.execute("UPDATE invoices SET invoice_number = ? WHERE id = ?", [invoiceNumber, invoiceId]);

        const savedItems = [];
        for (const item of invoiceItems) {
          const [itemResult] = await connection.execute(
            `INSERT INTO invoice_items
              (invoice_id, product_id, sku, product_name, category, hsn_code, material, dimensions,
               quantity, unit, unit_price, discount_type, discount_value, discount_amount, gst_rate,
               taxable_amount, cgst_amount, sgst_amount, igst_amount, gst_amount, line_total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              invoiceId, item.product_id, item.sku, item.product_name, item.category, item.hsn_code,
              item.material, item.dimensions, item.quantity, item.unit, item.unit_price,
              item.discount_type, item.discount_value, item.discount_amount, item.gst_rate,
              item.taxable_amount, item.cgst_amount, item.sgst_amount, item.igst_amount,
              item.gst_amount, item.line_total,
            ],
          );
          savedItems.push({ ...item, id: itemResult.insertId });
        }

        if (!isDraft) {
          await stockService.deductInvoiceStock(
            connection,
            { id: invoiceId, invoice_number: invoiceNumber },
            savedItems,
            actor,
          );
          await connection.execute("UPDATE invoices SET stock_deducted = 1 WHERE id = ?", [invoiceId]);
          await insertLedgerEntry(connection, dealer?.id, {
            invoiceId,
            date: input.invoice_date,
            type: "Sales Invoice",
            reference: invoiceNumber,
            description: `Invoice ${invoiceNumber}`,
            debit: grandTotal,
          });
        }
        if (!isDraft && amountReceived > 0) {
          await connection.execute(
            `INSERT INTO invoice_payments
              (invoice_id, dealer_id, paid_at, payment_method, transaction_id, reference_number, amount, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              invoiceId, dealer?.id || null, input.invoice_date, input.payment_method || "Cash",
              input.transaction_id, input.reference_number, amountReceived, "Initial payment",
            ],
          );
          await insertLedgerEntry(connection, dealer?.id, {
            invoiceId,
            date: input.invoice_date,
            type: "Payment Received",
            reference: input.reference_number || invoiceNumber,
            description: `Initial payment for ${invoiceNumber}`,
            credit: amountReceived,
          });
        }

        const updatedInvoice = await getById(invoiceId, connection);
        await connection.commit();
        return updatedInvoice;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async finalizeDraft(invoiceId, actor = null) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.execute(
          "SELECT * FROM invoices WHERE id = ? FOR UPDATE",
          [invoiceId],
        );
        const invoice = rows[0];
        if (!invoice) {
          const error = new Error("Invoice was not found.");
          error.status = 404;
          throw error;
        }
        if (invoice.status === "Cancelled") {
          const error = new Error("A cancelled invoice cannot be finalized.");
          error.status = 409;
          throw error;
        }
        if (Number(invoice.stock_deducted)) {
          const existingInvoice = await getById(invoiceId, connection);
          await connection.commit();
          return existingInvoice;
        }
        if (invoice.status !== "Draft") {
          const error = new Error("Only draft invoices can be finalized.");
          error.status = 409;
          throw error;
        }
        const [items] = await connection.execute(
          "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY product_id, id FOR UPDATE",
          [invoiceId],
        );
        await stockService.deductInvoiceStock(connection, invoice, items, actor);
        const status = invoiceStatus(Number(invoice.amount_paid), Number(invoice.grand_total), invoice.due_date);
        const balanceDue = roundMoney(Number(invoice.grand_total) - Number(invoice.amount_paid) - Number(invoice.credited_amount || 0));
        await connection.execute(
          "UPDATE invoices SET status = ?, balance_due = ?, stock_deducted = 1 WHERE id = ?",
          [status, balanceDue, invoiceId],
        );
        await insertLedgerEntry(connection, invoice.dealer_id, {
          invoiceId,
          date: dateOnly(invoice.invoice_date),
          type: "Sales Invoice",
          reference: invoice.invoice_number,
          description: `Invoice ${invoice.invoice_number}`,
          debit: Number(invoice.grand_total),
        });
        const finalizedInvoice = await getById(invoiceId, connection);
        await connection.commit();
        return finalizedInvoice;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async recordPayment(invoiceId, payment) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.execute(
          "SELECT * FROM invoices WHERE id = ? FOR UPDATE",
          [invoiceId],
        );
        const invoice = rows[0];
        if (!invoice) {
          const error = new Error("Invoice was not found.");
          error.status = 404;
          throw error;
        }
        if (invoice.status === "Cancelled") {
          const error = new Error("Payments cannot be added to a cancelled invoice.");
          error.status = 400;
          throw error;
        }
        if (invoice.status === "Draft") {
          const error = new Error("Draft invoices must be finalized before payments can be recorded.");
          error.status = 400;
          throw error;
        }
        if (payment.amount > Number(invoice.balance_due)) {
          const error = new Error("Payment cannot exceed the remaining invoice balance.");
          error.status = 400;
          throw error;
        }
        await connection.execute(
          `INSERT INTO invoice_payments
            (invoice_id, dealer_id, paid_at, payment_method, transaction_id, reference_number, amount, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId, invoice.dealer_id, payment.paid_at, payment.payment_method,
            payment.transaction_id, payment.reference_number, payment.amount, payment.notes,
          ],
        );
        const amountPaid = roundMoney(Number(invoice.amount_paid) + payment.amount);
        const balanceDue = roundMoney(Number(invoice.grand_total) - amountPaid - Number(invoice.credited_amount || 0));
        const status = invoiceStatus(amountPaid + Number(invoice.credited_amount || 0), Number(invoice.grand_total), invoice.due_date);
        await connection.execute(
          "UPDATE invoices SET amount_paid = ?, balance_due = ?, status = ? WHERE id = ?",
          [amountPaid, balanceDue, status, invoiceId],
        );
        await insertLedgerEntry(connection, invoice.dealer_id, {
          invoiceId,
          date: payment.paid_at,
          type: "Payment Received",
          reference: payment.reference_number || invoice.invoice_number,
          description: `Payment received for ${invoice.invoice_number}`,
          credit: payment.amount,
        });
        const updatedInvoice = await getById(invoiceId, connection);
        await connection.commit();
        return updatedInvoice;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async cancel(id, reason = "Cancelled by administrator", actor = null) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.execute("SELECT * FROM invoices WHERE id = ? FOR UPDATE", [id]);
        const invoice = rows[0];
        if (!invoice) {
          const error = new Error("Invoice was not found.");
          error.status = 404;
          throw error;
        }
        if (invoice.status === "Cancelled") {
          const cancelledInvoice = await getById(id, connection);
          await connection.commit();
          return cancelledInvoice;
        }
        if (Number(invoice.amount_paid) > 0) {
          const error = new Error("A paid invoice cannot be cancelled. Record a credit note or refund first.");
          error.status = 409;
          throw error;
        }
        if (Number(invoice.credited_amount || 0) > 0) {
          const error = new Error("An invoice with an issued credit note cannot be cancelled.");
          error.status = 409;
          throw error;
        }
        if (Number(invoice.stock_deducted)) {
          const [items] = await connection.execute(
            "SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY product_id, id FOR UPDATE",
            [id],
          );
          await stockService.restoreInvoiceStock(connection, invoice, items, actor);
        }
        await connection.execute(
          "UPDATE invoices SET status = 'Cancelled', balance_due = 0, stock_deducted = 0, cancel_reason = ? WHERE id = ?",
          [reason, id],
        );
        if (invoice.status !== "Draft") {
          await insertLedgerEntry(connection, invoice.dealer_id, {
            invoiceId: id,
            date: new Date().toISOString().slice(0, 10),
            type: "Credit Adjustment",
            reference: invoice.invoice_number,
            description: `Cancelled invoice ${invoice.invoice_number}`,
            credit: Number(invoice.grand_total),
          });
        }
        const updatedInvoice = await getById(id, connection);
        await connection.commit();
        return updatedInvoice;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async listPayments({ page = 1, limit = 25 } = {}) {
      const offset = (page - 1) * limit;
      const [payments] = await pool.execute(
        `SELECT p.*, i.invoice_number, d.name AS dealer_name
         FROM invoice_payments p
         JOIN invoices i ON i.id = p.invoice_id
         LEFT JOIN dealers d ON d.id = p.dealer_id
         ORDER BY p.paid_at DESC, p.id DESC LIMIT ? OFFSET ?`,
        [limit, offset],
      );
      const [countRows] = await pool.execute("SELECT COUNT(*) AS total FROM invoice_payments");
      return {
        payments,
        pagination: {
          total: Number(countRows[0]?.total || 0),
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / limit)),
        },
      };
    },
  };
}

module.exports = { createInvoiceService, invoiceStatus, roundMoney };
