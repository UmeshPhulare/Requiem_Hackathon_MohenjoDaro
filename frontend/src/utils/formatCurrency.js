// formatCurrency.js — INR and USD currency formatting utilities

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrFormatterDecimal = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('en-IN', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 2,
});

/**
 * Format a number as INR currency
 * @param {number} value
 * @param {boolean} [decimal=false] - whether to show decimal places
 * @returns {string}
 */
export function formatINR(value, decimal = false) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return decimal ? inrFormatterDecimal.format(value) : inrFormatter.format(value);
}

/**
 * Format a number as USD currency
 */
export function formatUSD(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return usdFormatter.format(value);
}

/**
 * Format value with sign (+/-)
 */
export function formatINRSigned(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const formatted = formatINR(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Compact format (e.g. 12.8L, 1.2Cr)
 */
export function formatCompact(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}
