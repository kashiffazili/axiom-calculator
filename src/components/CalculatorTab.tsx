import { useCallback, useEffect, useState } from "react";
import { Sigma } from "lucide-react";
import { evaluate, fmt } from "@/lib/math/parser";
import { Display } from "./Display";
import { Keypad, KEYBOARD_MAP, resolveKey } from "./Keypad";
import { HistoryPanel, type HistoryItem } from "./HistoryPanel";
import { Card, Chip } from "./ui";

/* ---------- display transform ---------- */

function prettify(machine: string): string {
  return machine
    .replace(/sqrt\(/g, "√(")
    .replace(/cbrt\(/g, "∛(")
    .replace(/gamma\(/g, "Γ(")
    .replace(/pi/g, "π")
    .replace(/ans/g, "Ans")
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/-/g, "−")
    .replace(/\+/g, " + ");
}

const BACK_TOKENS = [
  "gamma(", "sqrt(", "cbrt(", "asin(", "acos(", "atan(", "sin(", "cos(",
  "tan(", "log(", "abs(", "ln(", "10^(", "^(-1)", "^(2)", "^(3)", "^(1/(",
  "ans", "pi", "e^(",
];

const BINARY_OPS = ["+", "*", "/", "^"];

function sanitizedForEval(raw: string): string {
  let s = raw;
  // strip trailing binary operators (allow unary chains like "5*-" to lose only the last)
  while (s.length > 0 && [...BINARY_OPS, "-"].includes(s[s.length - 1])) s = s.slice(0, -1);
  // drop trailing unmatched open parens content-safe: auto-close instead
  const open = (s.match(/\(/g) || []).length;
  const close = (s.match(/\)/g) || []).length;
  s += ")".repeat(Math.max(0, open - close));
  return s;
}

/* ---------- component ---------- */

const EXAMPLES = [
  { label: "sin(45°) + cos(45°)", machine: "sin(45)+cos(45)" },
  { label: "√2 ^ 2", machine: "sqrt(2)^(2)" },
  { label: "6! ÷ 3!", machine: "6!/3!" },
  { label: "15% × 640", machine: "15%*640" },
  { label: "ln(e³)", machine: "ln(e^(3))" },
  { label: "log₂(1024)", machine: "log2(1024)" },
];

export function CalculatorTab() {
  const [expr, setExpr] = useState("");
  const [ans, setAns] = useState(0);
  const [deg, setDeg] = useState(true);
  const [shift, setShift] = useState(false);
  const [equalsResult, setEqualsResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem("axiom-history");
      return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("axiom-history", JSON.stringify(history.slice(0, 40)));
    } catch {
      /* storage unavailable */
    }
  }, [history]);

  /* ---------- evaluation ---------- */

  const tryEval = useCallback(
    (raw: string) => evaluate(sanitizedForEval(raw), { deg, vars: { ans } }),
    [deg, ans]
  );

  const preview = (() => {
    if (expr === "" || equalsResult !== null) return null;
    if (/^-?\d*\.?\d+$/.test(expr)) return null;
    try {
      const v = tryEval(expr);
      if (!isFinite(v)) return null;
      const s = fmt(v);
      return s === expr ? null : s;
    } catch {
      return null;
    }
  })();

  /* ---------- key handling ---------- */

  const insert = useCallback(
    (token: string) => {
      setError(null);
      const isDigitLike = /^[0-9.]$/.test(token) || token.endsWith("(") || token === "pi" || token === "e";
      const isBinary = [...BINARY_OPS, "-"].includes(token);

      setExpr((prev) => {
        let base = prev;
        if (equalsResult !== null) {
          base = isBinary ? "ans" : "";
          setEqualsResult(null);
        }
        if (token === "." ) {
          const seg = /[\d.]*$/.exec(base)?.[0] ?? "";
          if (seg.includes(".")) return base;
          if (seg === "") token = "0.";
        }
        if (isBinary && base.length > 0) {
          const last = base[base.length - 1];
          if ([...BINARY_OPS].includes(last) && token !== "-") return base.slice(0, -1) + token;
          if (last === "+" && token === "+") return base;
        }
        if (isBinary && base === "" && token !== "-") return base;
        return base + token;
      });
      if (shift && isDigitLike) setShift(false);
    },
    [equalsResult, shift]
  );

  const backspace = useCallback(() => {
    setError(null);
    setEqualsResult(null);
    setExpr((prev) => {
      for (const t of BACK_TOKENS) if (prev.endsWith(t)) return prev.slice(0, -t.length);
      return prev.slice(0, -1);
    });
  }, []);

  const negate = useCallback(() => {
    setError(null);
    setEqualsResult(null);
    setExpr((prev) => {
      if (prev === "") return "-";
      const wrapped = /\(-(\d+\.?\d*)\)$/.exec(prev);
      if (wrapped) return prev.slice(0, -wrapped[0].length) + wrapped[1];
      const num = /(\d+\.?\d*)$/.exec(prev);
      if (num) return prev.slice(0, -num[0].length) + `(-${num[1]})`;
      return prev + "*(-1)";
    });
  }, []);

  const equals = useCallback(() => {
    if (expr === "") return;
    try {
      const v = tryEval(expr);
      if (!isFinite(v)) throw new Error("Math error — result is not finite");
      const pretty = prettify(expr);
      const resultStr = fmt(v);
      setEqualsResult(resultStr);
      setAns(v);
      setError(null);
      setHistory((h) =>
        [{ id: Date.now(), expr: pretty, result: resultStr, raw: v }, ...h].slice(0, 40)
      );
    } catch (err) {
      setEqualsResult(null);
      setError(err instanceof Error ? err.message : "Error");
    }
  }, [expr, tryEval]);

  const clear = useCallback(() => {
    setExpr("");
    setEqualsResult(null);
    setError(null);
  }, []);

  const handleKey = useCallback(
    (id: string) => {
      const r = resolveKey(id, shift);
      if (!r) return;
      if (r.action === "clear") return clear();
      if (r.action === "back") return backspace();
      if (r.action === "equals") return equals();
      if (r.action === "negate") return negate();
      if (r.action === "shift") return setShift((s) => !s);
      if (r.insert) insert(r.insert);
    },
    [shift, clear, backspace, equals, negate, insert]
  );

  /* ---------- physical keyboard ---------- */

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      let id = KEYBOARD_MAP[e.key];
      if (!id && e.key.toLowerCase() === "p") id = "pi";
      if (!id) return;
      e.preventDefault();
      setPressed(id);
      window.setTimeout(() => setPressed(null), 130);
      handleKey(id);
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [handleKey]);

  /* ---------- render ---------- */

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)]">
      {/* device */}
      <div className="panel relative overflow-hidden p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <div className="mb-4 flex items-center justify-between px-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
              <Sigma size={15} strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-[13px] font-bold leading-none tracking-[0.22em] text-zinc-200">
                AXIOM
              </div>
              <div className="mt-1 font-mono text-[9.5px] uppercase leading-none tracking-[0.18em] text-zinc-600">
                fx-infinity · scientific
              </div>
            </div>
          </div>
          <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-zinc-600">
            12-digit precision
          </div>
        </div>

        <Display
          pretty={prettify(expr)}
          preview={preview}
          equalsResult={equalsResult}
          lastLine={equalsResult !== null ? prettify(expr) + " =" : ans !== 0 ? `Ans = ${fmt(ans)}` : null}
          error={error}
          deg={deg}
          shift={shift}
          onToggleDeg={() => setDeg((d) => !d)}
        />

        <div className="mt-4">
          <Keypad shift={shift} pressed={pressed} onKey={handleKey} />
        </div>
      </div>

      {/* right rail */}
      <div className="flex min-w-0 flex-col gap-6">
        <HistoryPanel
          items={history}
          onClear={() => setHistory([])}
          onPick={(item) => {
            setEqualsResult(null);
            setError(null);
            setExpr(String(parseFloat(item.raw.toPrecision(12))));
          }}
        />

        <Card title="Quick try" hint="Tap to load an expression">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <Chip
                key={ex.machine}
                onClick={() => {
                  setExpr(ex.machine);
                  setEqualsResult(null);
                  setError(null);
                }}
              >
                {ex.label}
              </Chip>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-zinc-600">
            Full keyboard support — digits, operators,{" "}
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[10px]">Enter</kbd>{" "}
            for equals,{" "}
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[10px]">Esc</kbd>{" "}
            to clear. Implicit multiplication like{" "}
            <span className="font-mono text-zinc-500">2π or 3(4+5)</span> just works.
          </p>
        </Card>
      </div>
    </div>
  );
}
