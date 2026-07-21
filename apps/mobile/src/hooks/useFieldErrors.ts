import { useState } from 'react';
import { getNumberError } from '../utils/validation';

// Ported from apps/web/src/hooks/useFieldErrors.js — tracks per-field
// validation error messages so a form shows live feedback while typing,
// not just on submit.
export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (key: string, val: string, rules: Parameters<typeof getNumberError>[1]) => {
    const msg = getNumberError(val, rules);
    setErrors((e) => ({ ...e, [key]: msg }));
    return msg;
  };

  const reset = () => setErrors({});
  const hasErrors = Object.values(errors).some(Boolean);

  return { errors, validate, reset, hasErrors };
}
