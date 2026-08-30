/* Numerical equation solvers: bisection, Newton–Raphson, Durand–Kerner */

import type { C } from "./complex";
import { cAdd, cDiv, cMul, cAbs, cSub, polyEval } from "./complex";

/* ---------------- 1D real root finding ---------------- */

const clampNum = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function bisect(f: (x: number) => number, a: number, b: number): number | null {
  let fa = f(a);
  let fb = f(b);
  if (!isFinite(fa) || !isFinite(fb)) return null;
  if (Math.abs(fa) < 1e-13) return a;
  if (Math.abs(fb) < 1e-13) return b;
  if (fa * fb > 0) return null;
  let lo = a, hi = b;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (!isFinite(fm)) return null;
    if (Math.abs(fm) < 1e-13 || (hi - lo) / 2 < 1e-13) return mid;
    if (fa * fm <= 0) { hi = mid; fb = fm; } else { lo = mid; fa = fm; }
  }
  const mid = (lo + hi) / 2;
  return Math.abs(f(mid)) < 1e-9 ? mid : null;
}

function newton(f: (x: number) => number, x0: number, limit: number): number | null {
  let x = x0;
  for (let i = 0; i < 60; i++) {
    const fx = f(x);
    if (!isFinite(fx)) return null;
    if (Math.abs(fx) < 1e-13) return x;
    const h = 1e-7 * (1 + Math.abs(x));
    const d = (f(x + h) - f(x - h)) / (2 * h);
    if (!isFinite(d) || Math.abs(d) < 1e-14) return Math.abs(fx) < 1e-9 ? x : null;
    const xn = x - fx / d;
    if (!isFinite(xn) || Math.abs(xn) > limit * 4) return null;
    if (Math.abs(xn - x) < 1e-13 * (1 + Math.abs(x))) {
      return Math.abs(f(xn)) < 1e-9 ? xn : null;
    }
    x = xn;
  }
  return null;
}

export interface RootsResult {
  roots: number[];
  truncated: boolean;
  interval: [number, number];
  samples: number;
}

/**
 * Scan an interval for all real roots of f.
 * Combines sign-change bisection with Newton refinement and
 * local-minimum polish for tangential (even-multiplicity) roots.
 */
export function findRealRoots(
  f: (x: number) => number,
  opts: { range?: number; max?: number } = {}
): RootsResult {
  const L = opts.range ?? 60;
  const MAX = opts.max ?? 16;
  const N = 3600;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = -L + (2 * L * i) / N;
    xs.push(x);
    ys.push(f(x));
  }

  const found: number[] = [];
  const push = (r: number | null) => {
    if (r === null || !isFinite(r) || Math.abs(r) > L * 1.001) return;
    if (Math.abs(f(r)) > 1e-7) return;
    if (found.some((q) => Math.abs(q - r) < 1e-6 * (1 + Math.abs(r)))) return;
    found.push(r);
  };

  for (let i = 0; i < N; i++) {
    if (found.length >= MAX) break;
    const ya = ys[i], yb = ys[i + 1];
    if (!isFinite(ya) || !isFinite(yb)) continue;

    if (ya === 0) { push(xs[i]); continue; }

    if (ya * yb < 0) {
      const r = bisect(f, xs[i], xs[i + 1]);
      if (r !== null && Math.abs(f(r)) < 1e-7) push(r);
      // else: asymptote (e.g. tan) — discard
      continue;
    }

    // tangential touch: local minimum of |f| → Newton polish
    if (i > 0) {
      const yp = ys[i - 1];
      if (
        isFinite(yp) && ya !== 0 &&
        Math.abs(ya) < Math.abs(yp) &&
        Math.abs(ya) < Math.abs(yb) &&
        Math.abs(ya) < 0.02
      ) {
        push(newton(f, xs[i], L));
      }
    }
  }

  // a few Newton seeds from moderate values catch sharp roots
  for (let i = 0; i <= N && found.length < MAX; i += 12) {
    if (isFinite(ys[i]) && Math.abs(ys[i]) < 2.5) push(newton(f, xs[i], L));
  }

  return {
    roots: found.sort((a, b) => a - b).map((r) => parseFloat(r.toPrecision(12))),
    truncated: found.length >= MAX,
    interval: [-L, L],
    samples: N,
  };
}

/* ---------------- analytic quadratic ---------------- */

export interface QuadraticResult {
  kind: "linear" | "two-real" | "one-real" | "complex";
  discriminant: number;
  roots: (number | C)[];
  vertex: { x: number; y: number };
  steps: string[];
}

import { fmt } from "./parser";

export function solveQuadratic(a: number, b: number, cc: number): QuadraticResult {
  const steps: string[] = [];
  if (Math.abs(a) < 1e-14) {
    // bx + c = 0
    if (Math.abs(b) < 1e-14) throw new Error("Not an equation — every coefficient is zero");
    const x = -cc / b;
    steps.push(`This is linear: ${fmt(b)}x + ${fmt(cc)} = 0`);
    steps.push(`x = −c / b = ${fmt(x)}`);
    return {
      kind: "linear", discriminant: NaN, roots: [x],
      vertex: { x: NaN, y: NaN }, steps,
    };
  }
  const D = b * b - 4 * a * cc;
  const vx = -b / (2 * a);
  const vy = a * vx * vx + b * vx + cc;
  steps.push(`Discriminant  Δ = b² − 4ac = ${fmt(b)}² − 4·${fmt(a)}·${fmt(cc)}`);
  steps.push(`Δ = ${fmt(D)}`);

  if (D > 1e-14) {
    const sq = Math.sqrt(D);
    // numerically stable form
    const q = -0.5 * (b + Math.sign(b || 1) * sq);
    const r1 = q / a;
    const r2 = cc / q;
    steps.push(`Δ > 0 → two distinct real roots`);
    steps.push(`x = (−b ± √Δ) / 2a = (${fmt(-b)} ± ${fmt(sq)}) / ${fmt(2 * a)}`);
    steps.push(`x₁ = ${fmt(r1)},   x₂ = ${fmt(r2)}`);
    return {
      kind: "two-real", discriminant: D,
      roots: [r1, r2].sort((p, q2) => (p as number) - (q2 as number)) as number[],
      vertex: { x: vx, y: vy }, steps,
    };
  }
  if (Math.abs(D) <= 1e-14) {
    steps.push(`Δ = 0 → one repeated real root`);
    steps.push(`x = −b / 2a = ${fmt(vx)}`);
    return {
      kind: "one-real", discriminant: 0, roots: [vx],
      vertex: { x: vx, y: vy }, steps,
    };
  }
  const sq = Math.sqrt(-D);
  const im = sq / (2 * a);
  steps.push(`Δ < 0 → complex conjugate pair`);
  steps.push(`x = (−b ± i√|Δ|) / 2a = ${fmt(vx)} ± ${fmt(Math.abs(im))}i`);
  return {
    kind: "complex", discriminant: D,
    roots: [{ re: vx, im: Math.abs(im) }, { re: vx, im: -Math.abs(im) } as C],
    vertex: { x: vx, y: vy }, steps,
  };
}

/* ---------------- Durand–Kerner: all roots of a polynomial ---------------- */

export function polyRootsAll(coeffsIn: number[], maxIter = 400): C[] {
  // strip leading zeros
  let coeffs = [...coeffsIn];
  while (coeffs.length > 1 && Math.abs(coeffs[0]) < 1e-14) coeffs.shift();
  const n = coeffs.length - 1;
  if (n < 1) throw new Error("Degree must be at least 1");

  // normalize
  const lead = coeffs[0];
  coeffs = coeffs.map((v) => v / lead);

  if (n === 1) return [{ re: -coeffs[1], im: 0 }];
  if (n === 2) {
    const q = solveQuadratic(coeffs[0], coeffs[1], coeffs[2]);
    return q.roots.map((r) =>
      typeof r === "number" ? { re: r, im: 0 } : (r as C)
    );
  }

  // initial guesses on a circle, slightly rotated
  const radius = 1 + Math.max(...coeffs.slice(1).map(Math.abs));
  let roots: C[] = [];
  for (let k = 0; k < n; k++) {
    const ang = (2 * Math.PI * k) / n + 0.5;
    roots.push({ re: radius * Math.cos(ang), im: radius * Math.sin(ang) });
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    const next: C[] = roots.map((ri, i) => {
      let denom: C = { re: 1, im: 0 };
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        let d = cSub(ri, roots[j]);
        if (cAbs(d) < 1e-14) d = { re: 1e-8, im: 1e-8 };
        denom = cMul(denom, d);
      }
      const delta = cDiv(polyEval(coeffs, ri), denom);
      maxDelta = Math.max(maxDelta, cAbs(delta));
      return cAdd(ri, { re: -delta.re, im: -delta.im });
    });
    roots = next;
    if (maxDelta < 1e-13) break;
  }

  // snap near-real / near-pure-imaginary roots
  return roots
    .map((r) => ({
      re: Math.abs(r.re) < 1e-9 ? 0 : r.re,
      im: Math.abs(r.im) < 1e-8 ? 0 : r.im,
    }))
    .sort((a, b) => a.re - b.re || a.im - b.im);
}

/** Numeric clamp used by the graph */
export const clamp = clampNum;
