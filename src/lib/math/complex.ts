/* Minimal complex arithmetic for polynomial root finding */

export interface C {
  re: number;
  im: number;
}

export const c = (re: number, im = 0): C => ({ re, im });

export const cAdd = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im });
export const cSub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im });
export const cMul = (a: C, b: C): C => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cDiv = (a: C, b: C): C => {
  const d = b.re * b.re + b.im * b.im;
  if (d < 1e-300) return { re: NaN, im: NaN };
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
};
export const cAbs = (a: C): number => Math.hypot(a.re, a.im);
export const cScale = (a: C, k: number): C => ({ re: a.re * k, im: a.im * k });

/** Evaluate polynomial with descending real coefficients at complex z (Horner). */
export const polyEval = (coeffs: number[], z: C): C => {
  let acc: C = { re: 0, im: 0 };
  for (const k of coeffs) {
    acc = cAdd(cMul(acc, z), { re: k, im: 0 });
  }
  return acc;
};

const near = (x: number) => Math.abs(x) < 1e-10;

export function fmtComplex(z: C): { text: string; real: boolean } {
  const re = near(z.im) && !near(z.re) ? z.re : z.re; // (kept explicit for clarity)
  const im = z.im;
  if (near(im)) return { text: trim(re), real: true };
  if (near(re)) return { text: `${trim(im)}i`, real: false };
  const sign = im < 0 ? "−" : "+";
  return { text: `${trim(re)} ${sign} ${trim(Math.abs(im))}i`, real: false };
}

function trim(x: number): string {
  const v = parseFloat(x.toPrecision(10));
  return String(v);
}
