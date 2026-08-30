import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, Check, Copy, LayoutGrid } from "lucide-react";
import {
  add, detWithSteps, identity, inverse, matPow, mul, rank, rref,
  scalarMul, sub, trace, transpose, zeros, type Mat,
} from "@/lib/math/matrix";
import { fmt, toSup } from "@/lib/math/parser";
import { Card, ErrorNote, MicroLabel, Segmented } from "./ui";

/* ------------------------------ types ------------------------------ */

interface OpResult {
  title: string;
  kind: "scalar" | "matrix";
  scalar?: number;
  matrix?: Mat;
  steps?: string[];
}

/* ------------------------------ helpers ------------------------------ */

const parseMat = (s: string[][]): Mat =>
  s.map((row) => row.map((v) => (v.trim() === "" ? 0 : Number(v))));

const toStr = (x: number): string => String(parseFloat(x.toPrecision(10)));

function resize(prev: string[][], r: number, c: number): string[][] {
  return Array.from({ length: r }, (_, i) =>
    Array.from({ length: c }, (_, j) => prev[i]?.[j] ?? "")
  );
}

/* ------------------------------ sub-components ------------------------------ */

function Stepper({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="h-5 w-5 rounded border border-white/10 font-mono text-[11px] text-zinc-500 transition-colors hover:text-white"
      >−</button>
      <span className="w-4 text-center font-mono text-[12px] text-zinc-300">{value}</span>
      <button
        onClick={() => onChange(Math.min(4, value + 1))}
        className="h-5 w-5 rounded border border-white/10 font-mono text-[11px] text-zinc-500 transition-colors hover:text-white"
      >+</button>
    </div>
  );
}

function MatrixEditor({
  name, values, onChange, rows, cols, onResize, onFill, accent,
}: {
  name: string;
  values: string[][];
  onChange: (v: string[][]) => void;
  rows: number;
  cols: number;
  onResize: (r: number, c: number) => void;
  onFill: (kind: "zero" | "id" | "rand") => void;
  accent: boolean;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg font-mono text-[13px] font-bold ${
            accent ? "bg-accent-500/15 text-accent-400" : "bg-sky-400/10 text-sky-300"
          }`}>
            {name}
          </span>
          <Stepper label="r" value={rows} onChange={(r) => onResize(r, cols)} />
          <Stepper label="c" value={cols} onChange={(c) => onResize(rows, c)} />
        </div>
        <div className="flex gap-1.5">
          {(["zero", "id", "rand"] as const).map((k) => (
            <button
              key={k}
              onClick={() => onFill(k)}
              className="rounded-md border border-white/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:border-white/20 hover:text-zinc-300"
            >
              {k === "zero" ? "0" : k === "id" ? "I" : "rnd"}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-bracket inline-block max-w-full overflow-x-auto">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {values.flatMap((row, i) =>
            row.map((v, j) => (
              <input
                key={`${i}-${j}-${rows}x${cols}`}
                value={v}
                inputMode="decimal"
                spellCheck={false}
                onChange={(e) =>
                  onChange(values.map((r, ri) => (ri === i ? r.map((q, cj) => (cj === j ? e.target.value : q)) : r)))
                }
                className="w-[4.2rem] rounded-lg border border-white/[0.07] bg-black/40 px-1 py-2 text-center font-mono text-[13.5px] text-zinc-200 outline-none transition-colors focus:border-accent-500/60 tnum"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MatrixView({ m }: { m: Mat }) {
  return (
    <div className="mx-bracket inline-block max-w-full overflow-x-auto">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${m[0].length}, minmax(0,1fr))` }}>
        {m.flatMap((row, i) =>
          row.map((v, j) => (
            <motion.div
              key={`${i}-${j}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (i * m[0].length + j) * 0.03, type: "spring", stiffness: 400, damping: 28 }}
              className="w-[4.6rem] rounded-lg bg-white/[0.04] px-1 py-2 text-center font-mono text-[13px] text-teal-100 tnum"
            >
              {fmt(v, 8)}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function OpButton({ label, onClick, wide = false }: { label: string; onClick: () => void; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 font-mono text-[12.5px] text-zinc-300 transition-all hover:border-accent-500/40 hover:bg-accent-500/[0.08] hover:text-accent-300 active:scale-95 ${
        wide ? "col-span-2" : ""
      }`}
    >
      {label}
    </button>
  );
}

/* ------------------------------ main tab ------------------------------ */

export function MatrixTab() {
  const [aStr, setAStr] = useState<string[][]>([["2", "1", "3"], ["0", "-1", "4"], ["5", "2", "0"]]);
  const [bStr, setBStr] = useState<string[][]>([["1", "2", "-1"], ["3", "0", "2"], ["-2", "1", "1"]]);
  const [target, setTarget] = useState<"A" | "B">("A");
  const [scalar, setScalar] = useState("2");
  const [expo, setExpo] = useState("3");
  const [result, setResult] = useState<OpResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const rA = aStr.length, cA = aStr[0].length;
  const rB = bStr.length, cB = bStr[0].length;

  const run = (fn: () => OpResult) => {
    setError(null);
    try {
      setResult(fn());
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const targetMat = () => parseMat(target === "A" ? aStr : bStr);
  const tName = () => target;

  const unary: { label: string; fn: () => OpResult }[] = [
    {
      label: `det ${tName()}`,
      fn: () => {
        const { det, steps } = detWithSteps(targetMat());
        return { title: `det(${tName()}) — Gaussian elimination`, kind: "scalar", scalar: det, steps };
      },
    },
    {
      label: `${tName()}⁻¹`,
      fn: () => {
        const inv = inverse(targetMat());
        if (!inv) throw new Error(`${tName()} is singular — its determinant is 0, so no inverse exists`);
        return { title: `inverse of ${tName()} — Gauss–Jordan`, kind: "matrix", matrix: inv };
      },
    },
    {
      label: `${tName()}ᵀ`,
      fn: () => ({ title: `transpose of ${tName()}`, kind: "matrix", matrix: transpose(targetMat()) }),
    },
    {
      label: `tr ${tName()}`,
      fn: () => ({ title: `trace of ${tName()} — sum of the diagonal`, kind: "scalar", scalar: trace(targetMat()) }),
    },
    {
      label: `rank ${tName()}`,
      fn: () => ({ title: `rank of ${tName()} — independent rows`, kind: "scalar", scalar: rank(targetMat()) }),
    },
    {
      label: `RREF`,
      fn: () => {
        const { matrix, pivots } = rref(targetMat());
        return {
          title: `RREF of ${tName()} — ${pivots.length} pivot${pivots.length === 1 ? "" : "s"}`,
          kind: "matrix", matrix,
        };
      },
    },
    {
      label: `k·${tName()}`,
      fn: () => {
        const k = Number(scalar);
        if (!isFinite(k)) throw new Error("Scalar k must be a number");
        return { title: `${fmt(k)} × ${tName()} — scalar product`, kind: "matrix", matrix: scalarMul(targetMat(), k) };
      },
    },
    {
      label: `${tName()}^x`,
      fn: () => {
        const x = Number(expo);
        if (expo.trim() === "" || !Number.isInteger(x))
          throw new Error("Exponent must be an integer (…−2, −1, 0, 1, 2, …)");
        if (Math.abs(x) > 99) throw new Error("Keep |x| ≤ 99 to stay inside the number range");
        const title =
          x === 0
            ? `${tName()}⁰ = I — any matrix to the power 0 is the identity`
            : x < 0
              ? `${tName()}${toSup(String(x))} = (${tName()}⁻¹)${toSup(String(-x))} — power of the inverse`
              : `${tName()}${toSup(String(x))} — binary (repeated-squaring) exponentiation`;
        return { title, kind: "matrix", matrix: matPow(targetMat(), x) };
      },
    },
  ];

  const binary: { label: string; fn: () => OpResult }[] = [
    { label: "A + B", fn: () => ({ title: "A + B", kind: "matrix", matrix: add(parseMat(aStr), parseMat(bStr)) }) },
    { label: "A − B", fn: () => ({ title: "A − B", kind: "matrix", matrix: sub(parseMat(aStr), parseMat(bStr)) }) },
    { label: "A × B", fn: () => ({ title: "A × B — row by column", kind: "matrix", matrix: mul(parseMat(aStr), parseMat(bStr)) }) },
  ];

  const validateFinite = (m: Mat) => {
    if (m.flat().some((v) => !isFinite(v))) throw new Error("Cells must be valid numbers");
  };

  const guarded = (fn: () => OpResult) => () => {
    try {
      validateFinite(parseMat(aStr));
      validateFinite(parseMat(bStr));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bad cells");
      setResult(null);
      return;
    }
    run(fn);
  };

  const copyResult = async () => {
    if (!result) return;
    const text = result.kind === "scalar"
      ? String(result.scalar)
      : result.matrix!.map((r) => `[${r.map((v) => toStr(v)).join(", ")}]`).join(",\n ");
    try {
      await navigator.clipboard.writeText(result.kind === "scalar" ? text : `[${text}]`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch { /* clipboard unavailable */ }
  };

  const sendTo = (which: "A" | "B") => {
    if (result?.kind !== "matrix" || !result.matrix) return;
    const str = result.matrix.map((row) => row.map(toStr));
    if (which === "A") setAStr(str); else setBStr(str);
  };

  const fill = (which: "A" | "B") => (kind: "zero" | "id" | "rand") => {
    const set = which === "A" ? setAStr : setBStr;
    const r = which === "A" ? rA : rB;
    const c = which === "A" ? cA : cB;
    if (kind === "zero") set(zeros(r, c).map((row) => row.map(toStr)));
    else if (kind === "id") set(identity(Math.max(r, c)).slice(0, r).map((row) => row.slice(0, c).map(toStr)));
    else set(Array.from({ length: r }, () => Array.from({ length: c }, () => String(Math.floor(Math.random() * 19) - 9))));
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
          <LayoutGrid size={17} strokeWidth={2.4} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-zinc-100">Matrix Studio</h2>
          <p className="text-xs text-zinc-600">Determinants, inverses, products, ranks — up to 4 × 4</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,250px)_minmax(0,1fr)]">
        <MatrixEditor
          name="A" values={aStr} onChange={setAStr} rows={rA} cols={cA}
          onResize={(r, c) => setAStr((p) => resize(p, r, c))}
          onFill={fill("A")} accent
        />

        {/* operations column */}
        <div className="panel flex flex-col gap-5 p-5">
          <div>
            <MicroLabel>Unary ops · target</MicroLabel>
            <div className="mt-2.5">
              <Segmented
                id="mx-target" size="sm" value={target}
                onChange={(v) => setTarget(v)}
                options={[{ value: "A", label: "Matrix A" }, { value: "B", label: "Matrix B" }]}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {unary.slice(0, 6).map((op) => (
                <OpButton key={op.label} label={op.label} onClick={guarded(op.fn)} />
              ))}
              <div className="flex gap-1.5">
                <input
                  value={scalar}
                  onChange={(e) => setScalar(e.target.value)}
                  inputMode="decimal"
                  className="w-full min-w-0 rounded-xl border border-white/[0.08] bg-black/40 px-2 py-2 text-center font-mono text-[12.5px] text-zinc-200 outline-none focus:border-accent-500/60"
                  aria-label="scalar k"
                />
                <button
                  onClick={guarded(unary[6].fn)}
                  className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 font-mono text-[12.5px] text-zinc-300 transition-all hover:border-accent-500/40 hover:text-accent-300 active:scale-95"
                >
                  k·M
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  value={expo}
                  onChange={(e) => setExpo(e.target.value)}
                  inputMode="numeric"
                  className="w-full min-w-0 rounded-xl border border-white/[0.08] bg-black/40 px-2 py-2 text-center font-mono text-[12.5px] text-zinc-200 outline-none focus:border-accent-500/60"
                  aria-label="exponent x"
                />
                <button
                  onClick={guarded(unary[7].fn)}
                  title="Raise the target matrix to integer power x (negative powers use the inverse)"
                  className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 font-mono text-[12.5px] text-zinc-300 transition-all hover:border-accent-500/40 hover:text-accent-300 active:scale-95"
                >
                  M^x
                </button>
              </div>
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-zinc-600">
              <span className="font-mono text-zinc-500">M^x</span> supports any integer — 0 gives I,
              negative powers use M⁻¹ (fails gracefully if the matrix is singular).
            </p>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div>
            <MicroLabel>Combine A & B</MicroLabel>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {binary.map((op) => (
                <OpButton key={op.label} label={op.label} onClick={guarded(op.fn)} />
              ))}
            </div>
            <button
              onClick={() => { setAStr(bStr.map((r) => [...r])); setBStr(aStr.map((r) => [...r])); }}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 font-mono text-[12.5px] text-zinc-400 transition-all hover:border-white/25 hover:text-zinc-200 active:scale-95"
            >
              <ArrowRightLeft size={13} />
              Swap A ⇄ B
            </button>
          </div>
        </div>

        <MatrixEditor
          name="B" values={bStr} onChange={setBStr} rows={rB} cols={cB}
          onResize={(r, c) => setBStr((p) => resize(p, r, c))}
          onFill={fill("B")} accent={false}
        />
      </div>

      {/* result */}
      <div className="mt-6">
        {error && <ErrorNote message={error} />}
        <AnimatePresence mode="wait">
          {result && !error && (
            <motion.div
              key={result.title + (result.scalar ?? "") + (result.matrix ? "m" : "")}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                title="Result"
                hint={result.title}
                right={
                  <div className="flex items-center gap-2">
                    {result.kind === "matrix" && (
                      <>
                        <button onClick={() => sendTo("A")} className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 font-mono text-[11px] text-zinc-400 transition-colors hover:border-accent-500/40 hover:text-accent-300">
                          → A
                        </button>
                        <button onClick={() => sendTo("B")} className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 font-mono text-[11px] text-zinc-400 transition-colors hover:border-accent-500/40 hover:text-accent-300">
                          → B
                        </button>
                      </>
                    )}
                    <button onClick={copyResult} className="rounded-lg border border-white/[0.08] p-1.5 text-zinc-400 transition-colors hover:border-white/25 hover:text-white" aria-label="Copy result">
                      {copied ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                }
              >
                {result.kind === "scalar" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="py-4 text-center"
                  >
                    <div className="font-mono text-[44px] font-semibold leading-none text-accent-400 tnum">
                      {fmt(result.scalar!)}
                    </div>
                    {result.title.startsWith("det") && (
                      <div className="mt-3 text-[12px] text-zinc-600">
                        {Math.abs(result.scalar!) < 1e-12
                          ? "Zero — the matrix is singular: rows are linearly dependent and it cannot be inverted."
                          : "Non-zero — the matrix is invertible; this is the signed scale factor of its linear map."}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="overflow-x-auto py-1 text-center">
                    <MatrixView m={result.matrix!} />
                  </div>
                )}

                {result.steps && (
                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <MicroLabel>Work log</MicroLabel>
                    <ol className="mt-3 max-h-52 space-y-1.5 overflow-y-auto pr-2">
                      {result.steps.map((s, i) => (
                        <li key={i} className="flex items-baseline gap-3 font-mono text-[12.5px] text-zinc-500">
                          <span className="w-5 shrink-0 text-right text-[10px] text-zinc-700">{i + 1}</span>
                          <span className={i === result.steps!.length - 1 ? "text-accent-300" : ""}>{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {!result && !error && (
          <div className="flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/[0.08] text-zinc-700">
            <LayoutGrid size={20} />
            <p className="max-w-[300px] text-center text-[13px] leading-relaxed">
              Pick an operation — the result, with a step-by-step work log for determinants, appears here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
