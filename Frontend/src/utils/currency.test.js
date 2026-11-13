import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCurrency } from "./currency.js";

test("formats Indian currency with compact thousand, lakh, and crore units", () => {
  const cases = [
    [100, "₹100"],
    [1_000, "₹1K"],
    [5_000, "₹5K"],
    [10_000, "₹10K"],
    [100_000, "₹1L"],
    [150_000, "₹1.5L"],
    [1_000_000, "₹10L"],
    [10_000_000, "₹1Cr"],
  ];

  for (const [value, expected] of cases) {
    assert.equal(formatCurrency(value), expected);
  }
});

test("normalizes numeric and already-formatted amount strings", () => {
  assert.equal(formatCurrency("10000"), "₹10K");
  assert.equal(formatCurrency("10K"), "₹10K");
  assert.equal(formatCurrency("₹10,000"), "₹10K");
  assert.equal(formatCurrency("₹1,00,000"), "₹1L");
  assert.equal(formatCurrency("1.5L"), "₹1.5L");
});

test("handles decimals, negative values, and missing or invalid values", () => {
  assert.equal(formatCurrency(999.5), "₹999.5");
  assert.equal(formatCurrency(1_234_567), "₹12.35L");
  assert.equal(formatCurrency(-10_000), "-₹10K");
  assert.equal(formatCurrency(0), "₹0");
  assert.equal(formatCurrency(null), "₹0");
  assert.equal(formatCurrency(undefined), "₹0");
  assert.equal(formatCurrency("not a value"), "₹0");
});
