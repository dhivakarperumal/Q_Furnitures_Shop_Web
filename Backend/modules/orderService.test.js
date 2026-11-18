const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateOrderAmounts, calculateCartTotals } = require("./orderService");

test("calculates GST for exclusive and inclusive tax settings", () => {
  assert.deepEqual(
    calculateCartTotals([{ price: 118, quantity: 1 }], 18, "Tax Exclusive"),
    { subtotal: 118, discountAmount: 0, gstAmount: 21.24, totalAmount: 139.24 },
  );
  assert.deepEqual(
    calculateCartTotals([{ price: 118, quantity: 1 }], 18, "Tax Inclusive"),
    { subtotal: 118, discountAmount: 0, gstAmount: 18, totalAmount: 118 },
  );
  assert.deepEqual(
    calculateCartTotals([{ price: 118, quantity: 1 }], 0, "Tax Exclusive"),
    { subtotal: 118, discountAmount: 0, gstAmount: 0, totalAmount: 118 },
  );
});

test("inclusive GST is extracted from the amount after discount", () => {
  assert.deepEqual(
    calculateOrderAmounts(118, "percentage", 10, 18, "Tax Inclusive"),
    { discountAmount: 11.8, gstAmount: 16.2, totalAmount: 106.2 },
  );
});
