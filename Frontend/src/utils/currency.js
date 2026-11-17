const indianNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const compactNumberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

function parseAmount(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  const normalized = value.trim().replace(/[₹,\s]/g, "");
  const match = normalized.match(/^([+-]?(?:\d+\.?\d*|\.\d+))(cr|k|l)?$/i);
  if (!match) return 0;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 0;

  const unit = match[2]?.toLowerCase();
  const multiplier = unit === "cr" ? 10_000_000 : unit === "l" ? 100_000 : unit === "k" ? 1_000 : 1;
  const parsedAmount = amount * multiplier;
  return Number.isFinite(parsedAmount) ? parsedAmount : 0;
}

export function formatCurrency(value) {
  const amount = parseAmount(value);
  const prefix = amount < 0 ? "-₹" : "₹";
  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount < 1_000) {
    return `${prefix}${indianNumberFormatter.format(absoluteAmount)}`;
  }

  let divisor = 1_000;
  let suffix = "K";
  if (absoluteAmount >= 10_000_000) {
    divisor = 10_000_000;
    suffix = "Cr";
  } else if (absoluteAmount >= 100_000) {
    divisor = 100_000;
    suffix = "L";
  }

  let compactAmount = Number((absoluteAmount / divisor).toFixed(2));
  if (suffix === "K" && compactAmount >= 1_000) {
    compactAmount /= 1_000;
    suffix = "L";
  } else if (suffix === "L" && compactAmount >= 100) {
    compactAmount /= 100;
    suffix = "Cr";
  }

  return `${prefix}${compactNumberFormatter.format(compactAmount)}${suffix}`;
}
