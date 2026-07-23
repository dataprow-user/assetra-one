// Shared currency formatting — mirrors the `fmt`/`fmtSigned` helpers repeated
// across every web page.
//
// Amounts can be globally masked (the header eye-toggle). The flag lives at
// module scope so every fmt call reflects it; AppContext flips it synchronously
// inside its toggle so the re-render shows the new state immediately. Default
// is hidden, matching the web app (sensitive amounts masked on every sign-in).
let _hidden = true;
const MASK = '••••••';

export const areAmountsHidden = () => _hidden;
export const setAmountsHidden = (v: boolean) => { _hidden = v; };

export const fmt = (n: any) => (_hidden ? MASK : '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN'));

export const fmtSigned = (n: any) => {
  if (_hidden) return MASK;
  const num = Number(n) || 0;
  return (num < 0 ? '-' : '') + '₹' + Math.abs(num).toLocaleString('en-IN');
};

export const fmtN = (n: any) => (_hidden ? MASK : Number(n || 0).toLocaleString('en-IN'));
