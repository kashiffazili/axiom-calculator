import type { ReactNode } from "react";
import { Delete, Divide, Equal, Minus, Percent, Plus, X } from "lucide-react";
import { cn } from "@/utils/cn";

export type KeyAction = "clear" | "back" | "equals" | "negate" | "shift";

interface KeyDef {
  id: string;
  label: ReactNode;
  insert?: string;
  action?: KeyAction;
  cls?: string;
  alt?: { label: ReactNode; insert: string };
}

const sup = (a: string, b: string) => (
  <span>
    {a}
    <span className="relative -top-[0.55em] text-[0.62em]">{b}</span>
  </span>
);

const ROWS: KeyDef[][] = [
  [
    { id: "shift", label: "2nd", action: "shift", cls: "key-fn" },
    { id: "pi", label: "π", insert: "pi", cls: "key-fn", alt: { label: "Ans", insert: "ans" } },
    { id: "e", label: "e", insert: "e", cls: "key-fn" },
    { id: "back", label: <Delete size={19} strokeWidth={2.2} />, action: "back", cls: "key-danger" },
    { id: "clear", label: "C", action: "clear", cls: "key-danger" },
  ],
  [
    { id: "sin", label: "sin", insert: "sin(", cls: "key-fn", alt: { label: <span>sin{sup("", "−1")}</span>, insert: "asin(" } },
    { id: "cos", label: "cos", insert: "cos(", cls: "key-fn", alt: { label: <span>cos{sup("", "−1")}</span>, insert: "acos(" } },
    { id: "tan", label: "tan", insert: "tan(", cls: "key-fn", alt: { label: <span>tan{sup("", "−1")}</span>, insert: "atan(" } },
    { id: "ln", label: "ln", insert: "ln(", cls: "key-fn", alt: { label: sup("e", "x"), insert: "e^(" } },
    { id: "log", label: "log", insert: "log(", cls: "key-fn", alt: { label: sup("10", "x"), insert: "10^(" } },
  ],
  [
    { id: "lp", label: "(", insert: "(", cls: "key-fn" },
    { id: "rp", label: ")", insert: ")", cls: "key-fn" },
    { id: "sq", label: sup("x", "2"), insert: "^(2)", cls: "key-fn", alt: { label: sup("x", "3"), insert: "^(3)" } },
    { id: "pow", label: sup("x", "y"), insert: "^", cls: "key-fn", alt: { label: <span>{sup("", "y")}√x</span>, insert: "^(1/(" } },
    { id: "sqrt", label: "√x", insert: "sqrt(", cls: "key-fn", alt: { label: <span>∛x</span>, insert: "cbrt(" } },
  ],
  [
    { id: "7", label: "7", insert: "7" },
    { id: "8", label: "8", insert: "8" },
    { id: "9", label: "9", insert: "9" },
    { id: "div", label: <Divide size={20} strokeWidth={2.4} />, insert: "/", cls: "key-op" },
    { id: "fact", label: "x!", insert: "!", cls: "key-fn", alt: { label: "Γ", insert: "gamma(" } },
  ],
  [
    { id: "4", label: "4", insert: "4" },
    { id: "5", label: "5", insert: "5" },
    { id: "6", label: "6", insert: "6" },
    { id: "mul", label: <X size={20} strokeWidth={2.4} />, insert: "*", cls: "key-op" },
    { id: "inv", label: "1/x", insert: "^(-1)", cls: "key-fn", alt: { label: "|x|", insert: "abs(" } },
  ],
  [
    { id: "1", label: "1", insert: "1" },
    { id: "2", label: "2", insert: "2" },
    { id: "3", label: "3", insert: "3" },
    { id: "sub", label: <Minus size={20} strokeWidth={2.4} />, insert: "-", cls: "key-op" },
    { id: "pct", label: <Percent size={17} strokeWidth={2.4} />, insert: "%", cls: "key-fn" },
  ],
  [
    { id: "neg", label: "±", action: "negate" },
    { id: "0", label: "0", insert: "0" },
    { id: "dot", label: ".", insert: "." },
    { id: "add", label: <Plus size={20} strokeWidth={2.4} />, insert: "+", cls: "key-op" },
    { id: "eq", label: <Equal size={21} strokeWidth={2.6} />, action: "equals", cls: "key-eq" },
  ],
];

export const KEYBOARD_MAP: Record<string, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6",
  "7": "7", "8": "8", "9": "9", ".": "dot", "+": "add", "-": "sub",
  "*": "mul", "/": "div", "^": "pow", "(": "lp", ")": "rp", "!": "fact",
  "%": "pct", Enter: "eq", "=": "eq", Backspace: "back", Escape: "clear",
};

export function resolveKey(
  id: string,
  shift: boolean
): { def: KeyDef; insert?: string; action?: KeyAction } | null {
  for (const row of ROWS)
    for (const k of row) {
      if (k.id !== id) continue;
      if (shift && k.alt) return { def: k, insert: k.alt.insert };
      return { def: k, insert: k.insert, action: k.action };
    }
  return null;
}

export function Keypad({
  shift,
  pressed,
  onKey,
}: {
  shift: boolean;
  pressed: string | null;
  onKey: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {ROWS.flat().map((k) => {
        const useAlt = shift && k.alt;
        const isShift = k.id === "shift";
        return (
          <button
            key={k.id}
            aria-label={k.id}
            className={cn(
              "key",
              k.cls,
              useAlt && "text-accent-300",
              isShift && shift && "border-accent-500/50 text-accent-400",
              pressed === k.id && "pressed"
            )}
            onClick={() => onKey(k.id)}
          >
            {useAlt ? k.alt!.label : k.label}
          </button>
        );
      })}
    </div>
  );
}
