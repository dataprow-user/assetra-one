/**
 * format.js
 * Currency / number formatting + the sensitive-amount privacy toggle.
 *
 * Amounts start HIDDEN every time the app opens; the user reveals them with the
 * eye toggle in the header. The reveal is intentionally session-only (never
 * persisted) so a fresh open of the app always masks amounts again.
 *
 * The formatters read this module-level flag directly, so toggling it and then
 * re-rendering (the context does both) flips every amount in one shot.
 */

let _hidden = true;

export function areAmountsHidden() { return _hidden; }
export function setAmountsHidden(v) { _hidden = !!v; }

export const MASK = '••••••';

// Absolute-value currency (hides sign) — the common case across pages.
export const fmt = (n) =>
  _hidden ? MASK : '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN');

// Signed currency — keeps a leading minus for negative values.
export const fmtSigned = (n) => {
  if (_hidden) return MASK;
  const num = Number(n) || 0;
  return (num < 0 ? '-' : '') + '₹' + Math.abs(num).toLocaleString('en-IN');
};

// Plain number, no ₹ symbol — quantities / holdings.
export const fmtN = (n) =>
  _hidden ? MASK : Number(n || 0).toLocaleString('en-IN');

// Raw signed balance with a ₹ prefix (matches the old Accounts behaviour where
// an overdrawn balance renders as "₹-5,000").
export const fmtBal = (n) =>
  _hidden ? MASK : '₹' + Number(n || 0).toLocaleString('en-IN');
