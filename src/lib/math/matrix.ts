/* Dense real matrix algebra with step-logging elimination */

import { fmt } from "./parser";

export type Mat = number[][];

const EPS = 1e-10;

export const zeros = (r: number, c: number): Mat =>
  Array.from({ length: r }, () => Array(c).fill(0));

export const identity = (n: number): Mat =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

export const clone = (m: Mat): Mat => m.map((row) => [...row]);

export const isSquare = (m: Mat) => m.length > 0 && m.every((r) => r.length === m.length);

export const clean = (m: Mat): Mat =>
  m.map((row) => row.map((v) => (Math.abs(v) < 1e-12 ? 0 : parseFloat(v.toPrecision(12)))));

export function add(a: Mat, b: Mat): Mat {
  if (a.length !== b.length || a[0].length !== b[0].length)
    throw new Error("Dimensions must match for addition");
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

export function sub(a: Mat, b: Mat): Mat {
  if (a.length !== b.length || a[0].length !== b[0].length)
    throw new Error("Dimensions must match for subtraction");
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

export function mul(a: Mat, b: Mat): Mat {
  const r = a.length, k = a[0].length, k2 = b.length, c = b[0].length;
  if (k !== k2) throw new Error(`Cannot multiply ${r}×${k} by ${k2}×${c} — inner dimensions differ`);
  const out = zeros(r, c);
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++) {
      let s = 0;
      for (let t = 0; t < k; t++) s += a[i][t] * b[t][j];
      out[i][j] = s;
    }
  return clean(out);
}

export const scalarMul = (m: Mat, k: number): Mat =>
  clean(m.map((row) => row.map((v) => v * k)));

export const transpose = (m: Mat): Mat =>
  m[0].map((_, j) => m.map((row) => row[j]));

export function trace(m: Mat): number {
  if (!isSquare(m)) throw new Error("Trace requires a square matrix");
  return m.reduce((s, row, i) => s + row[i], 0);
}

export function matPow(m: Mat, n: number): Mat {
  if (!isSquare(m)) throw new Error("Power requires a square matrix");
  if (!Number.isInteger(n)) throw new Error("Exponent must be an integer");
  if (n === 0) return identity(m.length);
  let base = clone(m);
  let e = n;
  if (e < 0) {
    const inv = inverse(m);
    if (!inv) throw new Error("Negative powers need an inverse — this matrix is singular");
    base = inv;
    e = -e;
  }
  let result = identity(m.length);
  while (e > 0) {
    if (e & 1) result = mul(result, base);
    e >>= 1;
    if (e > 0) base = mul(base, base);
  }
  if (result.flat().some((v) => !isFinite(v)))
    throw new Error("Result overflowed the number range — try a smaller exponent");
  return clean(result);
}

/* --------------- determinant with a human-readable work log --------------- */

export function detWithSteps(input: Mat): { det: number; steps: string[] } {
  if (!isSquare(input)) throw new Error("Determinant requires a square matrix");
  const n = input.length;
  const a = clone(input);
  const steps: string[] = [];
  let det = 1;
  let sign = 1;

  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++)
      if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;

    if (Math.abs(a[piv][i]) < EPS) {
      steps.push(`Column ${i + 1} has no nonzero pivot below row ${i + 1}`);
      steps.push(`A zero pivot makes det = 0 — the matrix is singular`);
      return { det: 0, steps };
    }
    if (piv !== i) {
      [a[i], a[piv]] = [a[piv], a[i]];
      sign *= -1;
      steps.push(`Swap R${i + 1} ↔ R${piv + 1}  (sign flips)`);
    }

    const p = a[i][i];
    det *= p;
    steps.push(`Pivot a${i + 1}${i + 1} = ${fmt(p, 8)}`);

    for (let r = i + 1; r < n; r++) {
      const f = a[r][i] / p;
      if (Math.abs(f) > EPS) {
        for (let cIdx = i; cIdx < n; cIdx++) a[r][cIdx] -= f * a[i][cIdx];
        steps.push(`R${r + 1} ← R${r + 1} − (${fmt(f, 8)})·R${i + 1}`);
      }
    }
  }
  det *= sign;
  steps.push(`det = ${sign < 0 ? "−" : ""}|product of pivots| = ${fmt(det)}`);
  return { det: Math.abs(det) < 1e-12 ? 0 : parseFloat(det.toPrecision(12)), steps };
}

export const determinant = (m: Mat): number => detWithSteps(m).det;

/* --------------- inverse via Gauss–Jordan --------------- */

export function inverse(input: Mat): Mat | null {
  if (!isSquare(input)) throw new Error("Inverse requires a square matrix");
  const n = input.length;
  const a = clone(input);
  const inv = identity(n);

  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++)
      if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
    if (Math.abs(a[piv][i]) < EPS) return null;
    if (piv !== i) {
      [a[i], a[piv]] = [a[piv], a[i]];
      [inv[i], inv[piv]] = [inv[piv], inv[i]];
    }
    const d = a[i][i];
    for (let cIdx = 0; cIdx < n; cIdx++) {
      a[i][cIdx] /= d;
      inv[i][cIdx] /= d;
    }
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = a[r][i];
      if (Math.abs(f) > EPS) {
        for (let cIdx = 0; cIdx < n; cIdx++) {
          a[r][cIdx] -= f * a[i][cIdx];
          inv[r][cIdx] -= f * inv[i][cIdx];
        }
      }
    }
  }
  return clean(inv);
}

/* --------------- RREF + rank --------------- */

export function rref(input: Mat): { matrix: Mat; pivots: [number, number][] } {
  const a = clone(input);
  const rows = a.length;
  const cols = a[0].length;
  const pivots: [number, number][] = [];
  let r = 0;
  for (let cIdx = 0; cIdx < cols && r < rows; cIdx++) {
    let piv = r;
    for (let i = r + 1; i < rows; i++)
      if (Math.abs(a[i][cIdx]) > Math.abs(a[piv][cIdx])) piv = i;
    if (Math.abs(a[piv][cIdx]) < EPS) continue;
    [a[r], a[piv]] = [a[piv], a[r]];
    const d = a[r][cIdx];
    for (let j = 0; j < cols; j++) a[r][j] /= d;
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const f = a[i][cIdx];
      if (Math.abs(f) > EPS)
        for (let j = 0; j < cols; j++) a[i][j] -= f * a[r][j];
    }
    pivots.push([r, cIdx]);
    r++;
  }
  return { matrix: clean(a), pivots };
}

export const rank = (m: Mat): number => rref(m).pivots.length;

/* --------------- linear system A x = b --------------- */

export interface SolveResult {
  type: "unique" | "none" | "infinite";
  x?: number[];
}

export function solveLinear(A: Mat, b: number[]): SolveResult {
  const n = A.length;
  const aug: Mat = A.map((row, i) => [...row, b[i]]);
  const { matrix: R, pivots } = rref(aug);

  // inconsistency: row like [0 0 0 | k≠0]
  for (const row of R) {
    const coeffAllZero = row.slice(0, n).every((v) => Math.abs(v) < 1e-9);
    if (coeffAllZero && Math.abs(row[n]) > 1e-9) return { type: "none" };
  }
  const rankA = pivots.filter(([, cIdx]) => cIdx < n).length;
  if (rankA < n) return { type: "infinite" };

  const x = Array(n).fill(0);
  for (const [r, cIdx] of pivots) {
    if (cIdx < n) x[cIdx] = R[r][n];
  }
  return { type: "unique", x: clean([x])[0] };
}

/* --------------- Cramer details for 2×2 systems --------------- */

export function cramer2(A: Mat, b: number[]) {
  const D = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const Dx = b[0] * A[1][1] - A[0][1] * b[1];
  const Dy = A[0][0] * b[1] - b[0] * A[1][0];
  return { D, Dx, Dy };
}
