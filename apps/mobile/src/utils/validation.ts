// Shared input-validation constants and helpers — mirrors
// apps/web/src/utils/validation.js, adapted for React Native TextInput
// (which has no onKeyDown equivalent; we filter onChangeText instead).

export const MAX_NAME_LENGTH = 60;
export const MAX_SHORT_LENGTH = 20;
export const MAX_NOTES_LENGTH = 200;
export const MAX_AMOUNT = 9999999999;
export const MAX_RATE = 100;
export const MAX_TENURE_MONTHS = 600;

type NumberFieldRules = {
  label?: string;
  min?: number;
  max?: number;
  maxDecimals?: number | null;
  required?: boolean;
};

// Live validator for a numeric field — call on every onChangeText so the
// error shows up while the user is still typing, not just on submit.
export function getNumberError(val: string, rules: NumberFieldRules = {}) {
  const { label = 'Value', min = 0, max = MAX_AMOUNT, maxDecimals = 2, required = true } = rules;
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

// Filters keystrokes live (RN has no keydown-blocking, so we clean the text
// itself): keeps digits, a single leading '-' when allowed, and a single '.'.
export function sanitizeNumericInput(text: string, { allowNegative = false }: { allowNegative?: boolean } = {}) {
  let cleaned = text.replace(/[^0-9.-]/g, '');
  const isNegative = allowNegative && cleaned.startsWith('-');
  cleaned = cleaned.replace(/-/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
  return (isNegative ? '-' : '') + cleaned;
}
