// formatPercent.js — percentage formatting utilities

/**
 * Format a decimal as percentage (e.g. 0.128 → "12.8%")
 */
export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number already in percentage form (e.g. 12.8 → "12.8%")
 */
export function formatPercentDirect(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format with sign
 */
export function formatPercentSigned(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const pct = (value * 100).toFixed(decimals);
  return value >= 0 ? `+${pct}%` : `${pct}%`;
}

export function formatPercentDirectSigned(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const pct = Math.abs(value).toFixed(decimals);
  return value >= 0 ? `+${pct}%` : `-${pct}%`;
}
