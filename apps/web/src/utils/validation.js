// Shared input-validation constants and helpers used across all forms.

export const MAX_NAME_LENGTH = 60;      // asset/account/loan/event/policy/category names
export const MAX_SHORT_LENGTH = 20;     // short free-text like "unit" or policy number
export const MAX_NOTES_LENGTH = 200;    // notes / free-text description fields
export const MAX_AMOUNT = 9999999999;   // ~10B ceiling — guards against fat-fingered digits
export const MAX_RATE = 100;            // percentage fields (interest rate, alert %)
export const MAX_TENURE_MONTHS = 600;   // 50 years

// Blocks characters that let <input type="number"> accept scientific notation
// or a sign, for fields that should only ever hold a positive number.
export function blockInvalidNumberKeys(e) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
}

// Same, but allows '-' — for fields that can legitimately be negative
// (e.g. an account balance in overdraft/credit card debt).
export function blockInvalidSignedNumberKeys(e) {
  if (['e', 'E', '+'].includes(e.key)) e.preventDefault();
}

// Live validator for a numeric field — called on every keystroke (not just on
// submit) so the error shows up while the user is still typing.
export function getNumberError(val, { label = 'Value', min = 0, max = MAX_AMOUNT, maxDecimals = 2, required = true } = {}) {
  if (val === '' || val === null || val === undefined) {
    return required ? `${label} is required.` : '';
  }
  const num = Number(val);
  if (Number.isNaN(num)) return 'Enter a valid number.';
  if (num < min) return `${label} must be at least ${min.toLocaleString('en-IN')}.`;
  if (num > max) return `${label} is too large (max ${max.toLocaleString('en-IN')}).`;
  if (maxDecimals != null) {
    const decimals = (String(val).split('.')[1] || '').length;
    if (decimals > maxDecimals) return `Only up to ${maxDecimals} decimal place${maxDecimals === 1 ? '' : 's'} allowed.`;
  }
  return '';
}
