// Shared currency formatting — mirrors the `fmt`/`fmtSigned` helpers repeated
// across every web page.
export const fmt = (n: any) => '₹' + Math.abs(Number(n) || 0).toLocaleString('en-IN');

export const fmtSigned = (n: any) => {
  const num = Number(n) || 0;
  return (num < 0 ? '-' : '') + fmt(num);
};

export const fmtN = (n: any) => Number(n || 0).toLocaleString('en-IN');
