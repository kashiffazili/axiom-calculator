import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Equal, Minus, Plus, Variable } from "lucide-react";
import { compile, fmt, usesVar } from "@/lib/math/parser";
import { findRealRoots, polyRootsAll } from "@/lib/math/solvers";
import { fmtComplex, type C } from "@/lib/math/complex";
import { cramer2, solveLinear, type SolveResult } from "@/lib/math/matrix";
import { Card, Chip, ErrorNote, MicroLabel, Segmented } from "./ui";
import { Graph, type Curve } from "./Graph";

const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const subI = (n: number) => String(n).split("").map((d) => SUBS[+d]).join("");
const supN = (n: number) => String(n).split("").map((d) => SUPS[+d]).join("");

type Sub = "general" | "poly" | "system";

/* ------------------------------ general ------------------------------ */

interface GenResult {
  roots: number[];
  truncated: boolean;
  interval: [number, number];
  label: string;
  f: (x: number) => number;
}

const GEN_EXAMPLES = [
  "x^2 - 5x + 6 = 0",
  "cos(x) = x",
  "e^x - 3x = 0",
  "x^4 - 5x^2 + 4 = 0",
  "ln(x) + x = 2",
  "x^3 - 2x - 5",
];

/* ------------------------------ shared bits ------------------------------ */

function SolveButton({ onClick, label = "Solve" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-accent-500 to-accent-600 px-5 py-3 text-[14px] font-bold tracking-wide text-ink-950 shadow-[0_4px_24px_rgba(242,82,26,0.35)] transition-all hover:brightness-110 active:scale-[0.98]"
    >
      <Equal size={16} strokeWidth={3} />
      {label}
    </button>
  );
}

function NumField({
  value,
  onChange,
  width = "w-14",
  accent = false,
}: {
  value: string;
  onChange: (v: string) => void;
  width?: string;
  accent?: boolean;
}) {
  return (
    <input
      value={value}
      inputMode="decimal"
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} rounded-lg border px-1 py-2 text-center font-mono text-[14px] outline-none transition-colors tnum ${
        accent
          ? "border-accent-500/30 bg-accent-500/[0.06] text-accent-300 focus:border-accent-500/70"
          : "border-white/[0.08] bg-black/40 text-zinc-200 focus:border-white/25"
      }`}
    />
  );
}

function StatCard({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">{label}</div>
      <div className={`mt-1 text-[15px] text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

/* ------------------------------ component ------------------------------ */

export function EquationTab() {
  const [sub, setSub] = useState<Sub>("general");
  const [error, setError] = useState<string | null>(null);

  /* ---- general state ---- */
  const [gi, setGi] = useState("x^2 - 5x + 6 = 0");
  const [gen, setGen] = useState<GenResult | null>(null);

  const solveGeneral = (src?: string) => {
    const input = (src ?? gi).trim();
    if (src !== undefined) setGi(src);
    setError(null);
    try {
      if (!input) throw new Error("Enter an equation in x first");
      const parts = input.split("=");
      if (parts.length > 2) throw new Error("Use at most one “=” sign");
      const lhs = parts[0].trim();
      const rhs = (parts[1] ?? "0").trim() || "0";
      const fsrc = `(${lhs})-(${rhs})`;
      if (!usesVar(fsrc, "x")) throw new Error("The equation must involve the variable x");
      const f = compile(fsrc);
      if (!isFinite(f(0.5)) && !isFinite(f(1.5)) && !isFinite(f(-2))) {
        throw new Error("Could not evaluate — check the syntax");
      }
      const r = findRealRoots(f, { range: 60, max: 16 });
      setGen({
        roots: r.roots,
        truncated: r.truncated,
        interval: r.interval,
        label: parts.length === 2 ? `${lhs} = ${rhs}` : `${lhs} = 0`,
        f,
      });
    } catch (err) {
      setGen(null);
      setError(err instanceof Error ? err.message : "Could not solve");
    }
  };

  /* ---- polynomial state ---- */
  const [deg, setDeg] = useState(2);
  const [coeffs, setCoeffs] = useState<string[]>(["1", "-5", "6"]);
  const [poly, setPoly] = useState<{ nums: number[]; roots: C[] } | null>(null);

  const changeDeg = (d: number) => {
    const nd = Math.min(6, Math.max(1, d));
    setDeg(nd);
    setCoeffs((prev) => {
      // prev[0] ↔ power prev.length-1 … keep constants aligned by power
      const next = Array(nd + 1).fill("");
      for (let i = 0; i <= nd; i++) {
        const power = nd - i;
        const prevIdx = prev.length - 1 - power;
        if (prevIdx >= 0 && prevIdx < prev.length) next[i] = prev[prevIdx];
      }
      return next;
    });
    setPoly(null);
  };

  const solvePoly = () => {
    setError(null);
    try {
      const nums = coeffs.map((v) => (v.trim() === "" ? 0 : Number(v)));
      if (nums.some((n) => !isFinite(n))) throw new Error("Coefficients must be valid numbers");
      if (Math.abs(nums[0]) < 1e-14) throw new Error("Leading coefficient must be non-zero for this degree");
      const roots = polyRootsAll(nums);
      setPoly({ nums, roots });
    } catch (err) {
      setPoly(null);
      setError(err instanceof Error ? err.message : "Could not solve");
    }
  };

  const polyFn = (nums: number[]) => (x: number) => {
    let acc = 0;
    for (const k of nums) acc = acc * x + k;
    return acc;
  };

  /* ---- system state ---- */
  const [n, setN] = useState<2 | 3>(2);
  const [aVals, setAVals] = useState<string[][]>([
    ["2", "3", ""],
    ["1", "-1", ""],
  ]);
  const [bVals, setBVals] = useState<string[]>(["8", "1", ""]);
  const [sys, setSys] = useState<{
    res: SolveResult;
    cramer?: { D: number; Dx: number; Dy: number };
    A: number[][];
    b: number[];
  } | null>(null);

  const changeN = (m: 2 | 3) => {
    setN(m);
    setSys(null);
  };

  const solveSystem = () => {
    setError(null);
    try {
      const A = aVals.slice(0, n).map((row) => row.slice(0, n).map((v) => (v.trim() === "" ? 0 : Number(v))));
      const b = bVals.slice(0, n).map((v) => (v.trim() === "" ? 0 : Number(v)));
      if (A.flat().some((v) => !isFinite(v)) || b.some((v) => !isFinite(v)))
        throw new Error("All coefficients must be valid numbers");
      if (A.flat().every((v) => v === 0)) throw new Error("Enter at least one non-zero coefficient");
      const res = solveLinear(A, b);
      const cramer = n === 2 ? cramer2(A, b) : undefined;
      setSys({ res, cramer, A, b });
    } catch (err) {
      setSys(null);
      setError(err instanceof Error ? err.message : "Could not solve");
    }
  };

  /* ---- derived ---- */

  const polyLabel = (nums: number[]) =>
    nums
      .map((c0, i) => {
        const p = nums.length - 1 - i;
        if (c0 === 0) return "";
        const sign = i === 0 ? (c0 < 0 ? "−" : "") : c0 < 0 ? " − " : " + ";
        const mag = Math.abs(c0);
        const coef = p === 0 ? fmt(mag) : mag === 1 ? "" : fmt(mag);
        const term = p === 0 ? "" : p === 1 ? "x" : `x${supN(p)}`;
        return `${sign}${coef}${term}`;
      })
      .join("") || "0";

  const VAR_NAMES = ["x", "y", "z"];

  const sysCurves = (): { curves: Curve[]; point: { x: number; y: number; label: string } } | null => {
    if (!sys || sys.res.type !== "unique" || n !== 2) return null;
    const [a1, b1] = sys.A[0];
    const [a2, b2] = sys.A[1];
    if (Math.abs(b1) < 1e-12 || Math.abs(b2) < 1e-12) return null;
    const [xv, yv] = sys.res.x!;
    return {
      curves: [
        { fn: (x: number) => (sys.b[0] - a1 * x) / b1, stroke: "#ff6b2c" },
        { fn: (x: number) => (sys.b[1] - a2 * x) / b2, stroke: "#60a5fa" },
      ],
      point: { x: xv, y: yv, label: `(${fmt(xv)}, ${fmt(yv)})` },
    };
  };
  const sysGraph = sysCurves();

  /* ------------------------------ render ------------------------------ */

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
            <Variable size={17} strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-100">Equation Solver</h2>
            <p className="text-xs text-zinc-600">General roots · polynomials · linear systems</p>
          </div>
        </div>
        <Segmented
          id="eq-sub"
          size="sm"
          value={sub}
          onChange={(v) => { setSub(v); setError(null); }}
          options={[
            { value: "general", label: "General f(x)" },
            { value: "poly", label: "Polynomial" },
            { value: "system", label: "Linear system" },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* ------------ left: controls ------------ */}
        <div className="space-y-6">
          {sub === "general" && (
            <Card title="Any equation in x" hint="Typed with the same syntax as the calculator">
              <div className="inset-well flex items-center gap-2.5 px-4">
                <span className="shrink-0 font-mono text-[13px] text-accent-400/90">f(x)=</span>
                <input
                  value={gi}
                  spellCheck={false}
                  onChange={(e) => setGi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && solveGeneral()}
                  placeholder="x^3 - 2x - 5 = 0"
                  className="w-full bg-transparent py-3 font-mono text-[14.5px] text-zinc-100 outline-none placeholder:text-zinc-700"
                />
              </div>
              <div className="mt-4">
                <SolveButton onClick={() => solveGeneral()} />
              </div>
              <div className="mt-5">
                <MicroLabel>Examples</MicroLabel>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {GEN_EXAMPLES.map((ex) => (
                    <Chip key={ex} onClick={() => solveGeneral(ex)}>{ex}</Chip>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {sub === "poly" && (
            <Card
              title="Polynomial coefficients"
              hint="Every root, real and complex, via Durand–Kerner"
              right={
                <div className="flex items-center gap-1.5">
                  <button onClick={() => changeDeg(deg - 1)} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition-colors hover:text-white" aria-label="Lower degree">
                    <Minus size={13} />
                  </button>
                  <span className="w-16 text-center font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                    deg {deg}
                  </span>
                  <button onClick={() => changeDeg(deg + 1)} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition-colors hover:text-white" aria-label="Raise degree">
                    <Plus size={13} />
                  </button>
                </div>
              }
            >
              <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
                {coeffs.map((v, i) => {
                  const p = deg - i;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <NumField
                        value={v}
                        onChange={(nv) =>
                          setCoeffs((prev) => prev.map((q, j) => (j === i ? nv : q)))
                        }
                      />
                      <span className="font-mono text-[11px] text-zinc-600">
                        {p === 0 ? "1" : p === 1 ? "x" : `x${supN(p)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6">
                <SolveButton onClick={solvePoly} label="Find all roots" />
              </div>
              <div className="mt-5">
                <MicroLabel>Presets</MicroLabel>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Chip onClick={() => { changeDeg(2); setCoeffs(["1", "-5", "6"]); }}>x² − 5x + 6</Chip>
                  <Chip onClick={() => { changeDeg(3); setCoeffs(["1", "-6", "11", "-6"]); }}>x³ − 6x² + 11x − 6</Chip>
                  <Chip onClick={() => { changeDeg(4); setCoeffs(["1", "0", "-5", "0", "4"]); }}>x⁴ − 5x² + 4</Chip>
                  <Chip onClick={() => { changeDeg(3); setCoeffs(["1", "-2", "2", "0"]); }}>x³ − 2x² + 2x</Chip>
                </div>
              </div>
            </Card>
          )}

          {sub === "system" && (
            <Card
              title="Linear system"
              hint="Coefficients of each equation"
              right={
                <Segmented
                  id="sys-n"
                  size="sm"
                  value={String(n) as "2" | "3"}
                  onChange={(v) => changeN(Number(v) as 2 | 3)}
                  options={[
                    { value: "2", label: "2 × 2" },
                    { value: "3", label: "3 × 3" },
                  ]}
                />
              }
            >
              <div className="space-y-3">
                {Array.from({ length: n }).map((_, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    {Array.from({ length: n }).map((_, j) => (
                      <span key={j} className="flex items-center gap-2">
                        <NumField
                          value={aVals[i][j]}
                          width="w-[3.1rem]"
                          onChange={(nv) =>
                            setAVals((prev) => prev.map((row, r) => (r === i ? row.map((q, cIdx) => (cIdx === j ? nv : q)) : row)))
                          }
                        />
                        <span className="font-mono text-[13px] text-accent-400/80">{VAR_NAMES[j]}</span>
                        {j < n - 1 && <span className="font-mono text-[13px] text-zinc-600">+</span>}
                      </span>
                    ))}
                    <span className="font-mono text-[13px] text-zinc-600">=</span>
                    <NumField
                      value={bVals[i]}
                      width="w-[3.4rem]"
                      accent
                      onChange={(nv) => setBVals((prev) => prev.map((q, r) => (r === i ? nv : q)))}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <SolveButton onClick={solveSystem} label="Solve system" />
              </div>
              <div className="mt-5">
                <MicroLabel>Presets</MicroLabel>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Chip onClick={() => { changeN(2); setAVals([["2", "3", ""], ["1", "-1", ""]]); setBVals(["8", "1"]); }}>2x+3y=8, x−y=1</Chip>
                  <Chip onClick={() => { changeN(3); setAVals([["1", "1", "1"], ["0", "2", "5"], ["2", "5", "-1"]]); setBVals(["6", "-4", "27"]); }}>3-variable classic</Chip>
                </div>
              </div>
            </Card>
          )}

          {error && <ErrorNote message={error} />}
        </div>

        {/* ------------ right: results ------------ */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {/* ---------- general results ---------- */}
            {sub === "general" && gen && (
              <motion.div
                key={"gen" + gen.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard label="Equation" value={gen.label} />
                  <StatCard label="Real roots found" value={String(gen.roots.length)} />
                  <StatCard label="Interval scanned" value={`[${gen.interval[0]}, ${gen.interval[1]}]`} />
                </div>

                {gen.roots.length === 0 ? (
                  <Card>
                    <p className="text-[14px] text-zinc-400">
                      No real roots found in{" "}
                      <span className="font-mono text-zinc-300">[{gen.interval[0]}, {gen.interval[1]}]</span>.
                      The curve may live outside this window, touch tangentially with steep slopes, or have
                      only complex solutions — the graph below shows its shape near the origin.
                    </p>
                  </Card>
                ) : (
                  <Card title="Solutions" hint={gen.truncated ? "List truncated — periodic equations have infinitely many roots" : "Verified to |f(x)| < 10⁻⁷"}>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {gen.roots.map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between rounded-xl border border-teal-400/20 bg-teal-400/[0.05] px-4 py-3"
                        >
                          <span className="font-mono text-[13px] text-teal-400/70">x{subI(i + 1)}</span>
                          <span className="font-mono text-[16.5px] text-teal-200 tnum">{fmt(r)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card title="Graph" hint="Curve of f(x) — roots marked where it crosses zero">
                  <Graph
                    funcs={[{ fn: gen.f, stroke: "#ff6b2c" }]}
                    roots={gen.roots}
                    range={gen.roots.length === 0 ? [-12, 12] : undefined}
                    label={gen.label}
                  />
                </Card>
              </motion.div>
            )}

            {/* ---------- polynomial results ---------- */}
            {sub === "poly" && poly && (
              <motion.div
                key={"poly" + poly.nums.join(",")}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="p(x)" value={polyLabel(poly.nums)} />
                  <StatCard label="Real roots" value={String(poly.roots.filter((r) => r.im === 0).length)} />
                  <StatCard label="Complex roots" value={String(poly.roots.filter((r) => r.im !== 0).length)} />
                </div>

                <Card title="All roots" hint="Fundamental theorem of algebra: degree n ⇒ exactly n roots">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {poly.roots.map((r, i) => {
                      const info = fmtComplex(r);
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                            info.real
                              ? "border-teal-400/20 bg-teal-400/[0.05]"
                              : "border-white/[0.07] bg-white/[0.025]"
                          }`}
                        >
                          <span className={`font-mono text-[13px] ${info.real ? "text-teal-400/70" : "text-zinc-500"}`}>
                              x{subI(i + 1)}
                          </span>
                          <span className={`font-mono text-[15.5px] tnum ${info.real ? "text-teal-200" : "text-zinc-300"}`}>
                            {info.text}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Graph" hint="Real roots where p(x) crosses the axis">
                  <Graph
                    funcs={[{ fn: polyFn(poly.nums), stroke: "#ff6b2c" }]}
                    roots={poly.roots.filter((r) => r.im === 0).map((r) => r.re)}
                    range={poly.roots.every((r) => r.im !== 0) ? [-6, 6] : undefined}
                    label={`y = ${polyLabel(poly.nums)}`}
                  />
                </Card>
              </motion.div>
            )}

            {/* ---------- system results ---------- */}
            {sub === "system" && sys && (
              <motion.div
                key={"sys" + JSON.stringify(sys.res.x ?? sys.res.type)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="space-y-6"
              >
                {sys.res.type === "unique" && (
                  <>
                    <Card title="Solution" hint={n === 2 ? "Solved with Cramer's rule" : "Solved with Gaussian elimination"}>
                      <div className="grid gap-2.5 sm:grid-cols-3">
                        {sys.res.x!.map((v, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="flex items-center justify-between rounded-xl border border-teal-400/20 bg-teal-400/[0.05] px-4 py-3"
                          >
                            <span className="font-mono text-[13px] text-teal-400/70">{VAR_NAMES[i]}</span>
                            <span className="font-mono text-[17px] text-teal-200 tnum">{fmt(v)}</span>
                          </motion.div>
                        ))}
                      </div>
                    </Card>

                    {sys.cramer && Math.abs(sys.cramer.D) > 1e-12 && (
                      <Card title="Cramer's rule" hint="Determinants of the coefficient matrices">
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                          <StatCard label="D" value={fmt(sys.cramer.D)} />
                          <StatCard label="Dx" value={fmt(sys.cramer.Dx)} />
                          <StatCard label="Dy" value={fmt(sys.cramer.Dy)} />
                          <StatCard label="x = Dx/D · y = Dy/D" value={`${fmt(sys.cramer.Dx / sys.cramer.D)},  ${fmt(sys.cramer.Dy / sys.cramer.D)}`} />
                        </div>
                      </Card>
                    )}

                    {sysGraph && n === 2 && (
                      <Card title="Intersection" hint="Each equation is a line — the solution is where they cross">
                        <Graph
                          funcs={sysGraph.curves}
                          points={[sysGraph.point]}
                          range={[sysGraph.point.x - 8, sysGraph.point.x + 8]}
                        />
                      </Card>
                    )}
                  </>
                )}
                {sys.res.type === "none" && (
                  <Card>
                    <p className="text-[15px] font-semibold text-red-300">No solution</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">
                      The reduced row echelon form contains a{" "}
                      <span className="font-mono text-zinc-300">[0 0 … 0 | k]</span> row with k ≠ 0 —
                      the equations contradict each other (parallel lines / planes).
                    </p>
                  </Card>
                )}
                {sys.res.type === "infinite" && (
                  <Card>
                    <p className="text-[15px] font-semibold text-amber-300">Infinitely many solutions</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">
                      The coefficient matrix is singular (rank &lt; {n}), so the system is
                      underdetermined — solutions form a line or plane of free parameters.
                    </p>
                  </Card>
                )}
              </motion.div>
            )}

            {/* ---------- idle ---------- */}
            {((sub === "general" && !gen) || (sub === "poly" && !poly) || (sub === "system" && !sys)) && !error && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/[0.08] text-zinc-700"
              >
                <Equal size={22} />
                <p className="max-w-[260px] text-center text-[13px] leading-relaxed">
                  Configure the equation on the left and press solve — roots, steps and a graph appear here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
