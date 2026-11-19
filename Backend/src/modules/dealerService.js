const DEALER_COLUMNS = [
  "id",
  "dealer_code",
  "name",
  "company_name",
  "contact_person",
  "mobile",
  "whatsapp",
  "email",
  "gstin",
  "pan",
  "dealer_type",
  "dealer_category",
  "billing_address",
  "shipping_address",
  "city",
  "district",
  "state",
  "pincode",
  "opening_balance",
  "credit_limit",
  "payment_terms",
  "status",
  "notes",
  "created_at",
  "updated_at",
].join(", ");

function createDealerService(pool) {
  async function getById(id) {
    const [rows] = await pool.execute(
      `SELECT ${DEALER_COLUMNS} FROM dealers WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] || null;
  }

  async function addLedgerEntry(connection, dealerId, entry) {
    const [balanceRows] = await connection.execute(
      "SELECT balance FROM dealer_ledger WHERE dealer_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [dealerId],
    );
    const balance = Number(balanceRows[0]?.balance || 0);
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    await connection.execute(
      `INSERT INTO dealer_ledger
        (dealer_id, transaction_date, transaction_type, reference_number, description, debit, credit, balance)
       VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?)`,
      [dealerId, entry.type, entry.reference || null, entry.description, debit, credit, balance + debit - credit],
    );
  }

  return {
    async list({ search = "", status = "All", dealerType = "All", page = 1, limit = 100 } = {}) {
      const filters = [];
      const parameters = [];
      if (search) {
        const term = `%${search}%`;
        filters.push("(d.name LIKE ? OR d.company_name LIKE ? OR d.mobile LIKE ? OR d.gstin LIKE ? OR d.dealer_code LIKE ?)");
        parameters.push(term, term, term, term, term);
      }
      if (status !== "All") {
        filters.push("d.status = ?");
        parameters.push(status);
      }
      if (dealerType !== "All") {
        filters.push("d.dealer_type = ?");
        parameters.push(dealerType);
      }
      const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
      const offset = (page - 1) * limit;
      const [rows] = await pool.execute(
        `SELECT d.*,
                COUNT(DISTINCT CASE WHEN i.status NOT IN ('Cancelled', 'Draft') THEN i.id END) AS total_invoices,
                COALESCE(SUM(CASE WHEN i.status NOT IN ('Cancelled', 'Draft') THEN i.grand_total - i.credited_amount ELSE 0 END), 0) AS total_purchases,
                d.opening_balance + COALESCE(SUM(CASE WHEN i.status NOT IN ('Cancelled', 'Draft') THEN i.grand_total - i.amount_paid - i.credited_amount ELSE 0 END), 0) AS outstanding_balance
         FROM dealers d
         LEFT JOIN invoices i ON i.dealer_id = d.id
         ${whereClause}
         GROUP BY d.id
         ORDER BY d.created_at DESC, d.id DESC
         LIMIT ? OFFSET ?`,
        [...parameters, limit, offset],
      );
      const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM dealers d ${whereClause}`,
        parameters,
      );
      const [summaryRows] = await pool.execute(
        `SELECT COUNT(*) AS total,
                SUM(status = 'Active') AS active,
                SUM(status = 'Inactive') AS inactive
         FROM dealers`,
      );
      const [invoiceRows] = await pool.execute(
        "SELECT COUNT(*) AS total FROM invoices WHERE status NOT IN ('Cancelled', 'Draft')",
      );
      return {
        dealers: rows,
        summary: {
          total: Number(summaryRows[0]?.total || 0),
          active: Number(summaryRows[0]?.active || 0),
          inactive: Number(summaryRows[0]?.inactive || 0),
          invoices: Number(invoiceRows[0]?.total || 0),
        },
        pagination: {
          total: Number(countRows[0]?.total || 0),
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / limit)),
        },
      };
    },

    getById,

    async getProfile(id) {
      const dealer = await getById(id);
      if (!dealer) return null;
      const [invoices] = await pool.execute(
        `SELECT id, invoice_number, invoice_date, due_date, grand_total, amount_paid, credited_amount, balance_due, status
         FROM invoices WHERE dealer_id = ? ORDER BY invoice_date DESC, id DESC`,
        [id],
      );
      const [ledger] = await pool.execute(
        `SELECT id, transaction_date, transaction_type, reference_number, description, debit, credit, balance
         FROM dealer_ledger WHERE dealer_id = ? ORDER BY id DESC LIMIT 100`,
        [id],
      );
      const [creditNotes] = await pool.execute(
        `SELECT cn.id, cn.credit_note_number, cn.credit_date, cn.reason, cn.amount, i.invoice_number
         FROM credit_notes cn
         JOIN invoices i ON i.id = cn.invoice_id
         WHERE cn.dealer_id = ? ORDER BY cn.credit_date DESC, cn.id DESC`,
        [id],
      );
      const financialInvoices = invoices.filter((invoice) => !["Cancelled", "Draft"].includes(invoice.status));
      const totalPurchases = financialInvoices
        .reduce((total, invoice) => total + Number(invoice.grand_total || 0) - Number(invoice.credited_amount || 0), 0);
      const outstanding = Number(dealer.opening_balance || 0) + financialInvoices
        .reduce((total, invoice) => total + Number(invoice.balance_due || 0), 0);
      return {
        ...dealer,
        invoices,
        ledger,
        credit_notes: creditNotes,
        total_purchases: totalPurchases,
        total_invoices: financialInvoices.length,
        outstanding_balance: outstanding,
        total_paid: invoices.reduce((total, invoice) => total + Number(invoice.amount_paid || 0), 0),
        last_transaction: financialInvoices[0]?.invoice_date || null,
      };
    },

    async create(dealer) {
      const connection = await pool.getConnection();
      let id;
      try {
        await connection.beginTransaction();
        const [result] = await connection.execute(
          `INSERT INTO dealers
            (name, company_name, contact_person, mobile, whatsapp, email, gstin, pan, dealer_type,
             dealer_category, billing_address, shipping_address, city, district, state, pincode,
             opening_balance, credit_limit, payment_terms, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dealer.name, dealer.company_name, dealer.contact_person, dealer.mobile, dealer.whatsapp,
            dealer.email, dealer.gstin, dealer.pan, dealer.dealer_type, dealer.dealer_category,
            dealer.billing_address, dealer.shipping_address, dealer.city, dealer.district,
            dealer.state, dealer.pincode, dealer.opening_balance, dealer.credit_limit,
            dealer.payment_terms, dealer.status, dealer.notes,
          ],
        );
        id = result.insertId;
        const dealerCode = `DLR-${String(id).padStart(6, "0")}`;
        await connection.execute("UPDATE dealers SET dealer_code = ? WHERE id = ?", [dealerCode, id]);
        if (dealer.opening_balance > 0) {
          await connection.execute(
          `INSERT INTO dealer_ledger
            (dealer_id, transaction_date, transaction_type, reference_number, description, debit, credit, balance)
           VALUES (?, CURDATE(), 'Opening Balance', ?, 'Opening balance', ?, 0, ?)`,
            [id, dealerCode, dealer.opening_balance, dealer.opening_balance],
          );
        }
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      return getById(id);
    },

    async update(id, dealer) {
      const connection = await pool.getConnection();
      let exists = false;
      try {
        await connection.beginTransaction();
        const [existingRows] = await connection.execute(
          "SELECT opening_balance FROM dealers WHERE id = ? FOR UPDATE",
          [id],
        );
        const existing = existingRows[0];
        if (!existing) {
          await connection.rollback();
          return null;
        }
        exists = true;
        await connection.execute(
          `UPDATE dealers SET
            name = ?, company_name = ?, contact_person = ?, mobile = ?, whatsapp = ?, email = ?,
            gstin = ?, pan = ?, dealer_type = ?, dealer_category = ?, billing_address = ?,
            shipping_address = ?, city = ?, district = ?, state = ?, pincode = ?,
            opening_balance = ?, credit_limit = ?, payment_terms = ?, status = ?, notes = ?
           WHERE id = ?`,
          [
            dealer.name, dealer.company_name, dealer.contact_person, dealer.mobile, dealer.whatsapp,
            dealer.email, dealer.gstin, dealer.pan, dealer.dealer_type, dealer.dealer_category,
            dealer.billing_address, dealer.shipping_address, dealer.city, dealer.district,
            dealer.state, dealer.pincode, dealer.opening_balance, dealer.credit_limit,
            dealer.payment_terms, dealer.status, dealer.notes, id,
          ],
        );
        const openingBalanceDifference = Number(dealer.opening_balance) - Number(existing.opening_balance);
        if (openingBalanceDifference !== 0) {
          await addLedgerEntry(connection, id, {
            type: "Opening Balance Adjustment",
            reference: null,
            description: "Opening balance updated",
            debit: Math.max(0, openingBalanceDifference),
            credit: Math.max(0, -openingBalanceDifference),
          });
        }
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      return exists ? getById(id) : null;
    },

    async delete(id) {
      const [invoices] = await pool.execute(
        "SELECT id FROM invoices WHERE dealer_id = ? LIMIT 1",
        [id],
      );
      if (invoices.length) {
        const error = new Error("Dealers with invoices cannot be deleted. Set the dealer to inactive instead.");
        error.status = 409;
        throw error;
      }
      const [result] = await pool.execute("DELETE FROM dealers WHERE id = ?", [id]);
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createDealerService };
