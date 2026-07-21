import { useState } from 'react';
import { getNumberError } from '../utils/validation';

// Tracks per-field validation error messages so a form can show live
// feedback while the user types, instead of waiting until submit.
export function useFieldErrors() {
  const [errors, setErrors] = useState({});

  const validate = (key, val, rules) => {
    const msg = getNumberError(val, rules);
    setErrors(e => ({ ...e, [key]: msg }));
    return msg;
  };

  const reset = () => setErrors({});
  const hasErrors = Object.values(errors).some(Boolean);

  return { errors, validate, reset, hasErrors };
}
