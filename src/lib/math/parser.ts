/* ------------------------------------------------------------------ */
/*  Expression engine: tokenizer → recursive-descent parser → AST eval */
/* ------------------------------------------------------------------ */

export type Node =
  | { t: "n"; v: number }
  | { t: "v"; name: string }
  | { t: "u"; op: "-" | "+"; a: Node }
  | { t: "b"; op: "+" | "-" | "*" | "/" | "^"; a: Node; b: Node }
  | { t: "p"; op: "!" | "%"; a: Node }
  | { t: "f"; name: string; args: Node[] };

type Tok =
  | { t: "num"; v: number }
  | { t: "var"; name: string }
  | { t: "op"; v: string }
  | { t: "f"; name: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "comma" }
  | { t: "post"; v: "!" | "%" };

export interface EvalOpts {
  deg?: boolean;
  vars?: Record<string, number>;
}

/* ---------------- gamma / factorial ---------------- */

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function gamma(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }
  z -= 1;
  let x = LANCZOS[0];
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export function factorial(x: number): number {
  if (Number.isInteger(x) && x >= 0 && x <= 170) {
    let r = 1;
    for (let i = 2; i <= x; i++) r *= i;
    return r;
  }
  if (Number.isInteger(x) && x < 0) throw new Error("Factorial of negative integer");
  const g = gamma(x + 1);
  if (!isFinite(g)) throw new Error("Factorial overflow");
  return g;
}

/* ---------------- function table ---------------- */

type Fn1 = (x: number, o: EvalOpts) => number;
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

const FN1: Record<string, Fn1> = {
  sin: (x, o) => Math.sin(o.deg ? x * D2R : x),
  cos: (x, o) => Math.cos(o.deg ? x * D2R : x),
  tan: (x, o) => Math.tan(o.deg ? x * D2R : x),
  asin: (x, o) => (o.deg ? Math.asin(x) * R2D : Math.asin(x)),
  acos: (x, o) => (o.deg ? Math.acos(x) * R2D : Math.acos(x)),
  atan: (x, o) => (o.deg ? Math.atan(x) * R2D : Math.atan(x)),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  log2: (x) => Math.log2(x),
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
  abs: (x) => Math.abs(x),
  exp: (x) => Math.exp(x),
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  round: (x) => Math.round(x),
  sign: (x) => Math.sign(x),
  gamma: (x) => gamma(x),
};

const FN2: Record<string, (a: number, b: number, o: EvalOpts) => number> = {
  min: (a, b) => Math.min(a, b),
  max: (a, b) => Math.max(a, b),
  mod: (a, b) => a % b,
  ncr: (a, b) => factorial(a) / (factorial(b) * factorial(a - b)),
  npr: (a, b) => factorial(a) / factorial(a - b),
  logbase: (a, b) => Math.log(a) / Math.log(b),
  nthroot: (a, b) => Math.pow(Math.abs(b), 1 / a) * (b < 0 && a % 2 !== 0 ? -1 : 1),
};

const CONSTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  phi: (1 + Math.sqrt(5)) / 2,
};

/* ---------------- tokenizer ---------------- */

export function tokenize(src: string): Tok[] {
  const s = src.replace(/\s+/g, "").toLowerCase();
  const raw: Tok[] = [];
  let i = 0;

  const matchWord = (): string | null => {
    const m = /^[a-z]+/.exec(s.slice(i));
    return m ? m[0] : null;
  };

  while (i < s.length) {
    const c = s[i];

    if (/[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+/.exec(s.slice(i));
      if (!m) throw new Error("Bad number");
      raw.push({ t: "num", v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-z]/.test(c)) {
      const w = matchWord()!;
      i += w.length;
      if (w === "ans") raw.push({ t: "var", name: "ans" });
      else if (FN1[w] || FN2[w]) raw.push({ t: "f", name: w });
      else if (CONSTS[w] !== undefined) raw.push({ t: "num", v: CONSTS[w] });
      else {
        // unknown word → single-char variables ("xy" → x*y via implicit mult)
        for (const ch of w) raw.push({ t: "var", name: ch });
      }
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/" || c === "^") {
      raw.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") { raw.push({ t: "lp" }); i++; continue; }
    if (c === ")") { raw.push({ t: "rp" }); i++; continue; }
    if (c === ",") { raw.push({ t: "comma" }); i++; continue; }
    if (c === "!" || c === "%") { raw.push({ t: "post", v: c }); i++; continue; }
    // pretty glyphs
    if (c === "×") { raw.push({ t: "op", v: "*" }); i++; continue; }
    if (c === "÷") { raw.push({ t: "op", v: "/" }); i++; continue; }
    if (c === "−") { raw.push({ t: "op", v: "-" }); i++; continue; }
    if (c === "√") { raw.push({ t: "f", name: "sqrt" }); i++; continue; }
    if (c === "π") { raw.push({ t: "num", v: Math.PI }); i++; continue; }

    throw new Error(`Unexpected "${c}"`);
  }

  /* insert implicit multiplication: 2pi, 3(4), )( , )2 , 2sin( */
  const out: Tok[] = [];
  const valEnd = (t: Tok) =>
    t.t === "num" || t.t === "var" || t.t === "rp" || t.t === "post";
  const valStart = (t: Tok) =>
    t.t === "num" || t.t === "var" || t.t === "lp" || t.t === "f";
  for (let k = 0; k < raw.length; k++) {
    out.push(raw[k]);
    const a = raw[k];
    const b = raw[k + 1];
    if (a && b && valEnd(a) && valStart(b)) out.push({ t: "op", v: "*" });
  }
  return out;
}

/* ---------------- parser (recursive descent) ---------------- */

class Parser {
  pos = 0;
  constructor(private toks: Tok[]) {}

  private peek(): Tok | undefined { return this.toks[this.pos]; }
  private next(): Tok | undefined { return this.toks[this.pos++]; }

  parseExpr(): Node {
    let node = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "op" && (t.v === "+" || t.v === "-")) {
        this.next();
        node = { t: "b", op: t.v as "+" | "-", a: node, b: this.parseTerm() };
      } else return node;
    }
  }

  private parseTerm(): Node {
    let node = this.parseFactor();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "op" && (t.v === "*" || t.v === "/")) {
        this.next();
        node = { t: "b", op: t.v as "*" | "/", a: node, b: this.parseFactor() };
      } else return node;
    }
  }

  private parseFactor(): Node {
    const t = this.peek();
    if (t && t.t === "op" && (t.v === "-" || t.v === "+")) {
      this.next();
      return { t: "u", op: t.v as "-" | "+", a: this.parseFactor() };
    }
    return this.parsePower();
  }

  private parsePower(): Node {
    const base = this.parsePostfix();
    const t = this.peek();
    if (t && t.t === "op" && t.v === "^") {
      this.next();
      return { t: "b", op: "^", a: base, b: this.parseFactor() }; // right assoc, allows 2^-3
    }
    return base;
  }

  private parsePostfix(): Node {
    let node = this.parsePrimary();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "post") {
        this.next();
        node = { t: "p", op: t.v, a: node };
      } else return node;
    }
  }

  private parsePrimary(): Node {
    const t = this.next();
    if (!t) throw new Error("Unexpected end of expression");
    if (t.t === "num") return { t: "n", v: t.v };
    if (t.t === "var") return { t: "v", name: t.name };
    if (t.t === "lp") {
      const e = this.parseExpr();
      const c = this.next();
      if (!c || c.t !== "rp") throw new Error("Missing closing parenthesis");
      return e;
    }
    if (t.t === "f") {
      const lp = this.next();
      if (!lp || lp.t !== "lp") throw new Error(`Expected ( after ${t.name}`);
      const args: Node[] = [this.parseExpr()];
      for (;;) {
        const p = this.peek();
        if (p && p.t === "comma") { this.next(); args.push(this.parseExpr()); }
        else break;
      }
      const rp = this.next();
      if (!rp || rp.t !== "rp") throw new Error("Missing closing parenthesis");
      return { t: "f", name: t.name, args };
    }
    throw new Error("Syntax error");
  }
}

/* ---------------- evaluation ---------------- */

export function evalNode(n: Node, o: EvalOpts): number {
  switch (n.t) {
    case "n":
      return n.v;
    case "v": {
      const v = o.vars?.[n.name];
      if (v === undefined) throw new Error(`Unknown variable "${n.name}"`);
      return v;
    }
    case "u": {
      const a = evalNode(n.a, o);
      return n.op === "-" ? -a : a;
    }
    case "b": {
      const a = evalNode(n.a, o);
      const b = evalNode(n.b, o);
      switch (n.op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return a / b;
        case "^": {
          if (a < 0 && !Number.isInteger(b)) {
            // allow odd rational roots like (-8)^(1/3)
            const r = Math.round(1 / b);
            if (Math.abs(1 / b - r) < 1e-12 && r % 2 !== 0) {
              return -Math.pow(-a, b);
            }
            return NaN;
          }
          return Math.pow(a, b);
        }
      }
      return NaN;
    }
    case "p": {
      const a = evalNode(n.a, o);
      if (n.op === "!") return factorial(a);
      return a / 100;
    }
    case "f": {
      if (FN1[n.name]) {
        if (n.args.length !== 1) throw new Error(`${n.name} expects 1 argument`);
        return FN1[n.name](evalNode(n.args[0], o), o);
      }
      if (FN2[n.name]) {
        if (n.args.length !== 2) throw new Error(`${n.name} expects 2 arguments`);
        return FN2[n.name](evalNode(n.args[0], o), evalNode(n.args[1], o), o);
      }
      throw new Error(`Unknown function "${n.name}"`);
    }
  }
}

/** Parse source text into an AST (throws on syntax errors). */
export function parse(src: string): Node {
  const toks = tokenize(src);
  if (toks.length === 0) throw new Error("Empty expression");
  const p = new Parser(toks);
  const node = p.parseExpr();
  if (p.pos < toks.length) throw new Error("Syntax error");
  return node;
}

/** One-shot evaluate. */
export function evaluate(src: string, o: EvalOpts = {}): number {
  const v = evalNode(parse(src), o);
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error("Math error");
  return v;
}

/** Compile into a reusable f(x). Never throws — NaN on bad input. */
export function compile(src: string, varName = "x"): (x: number) => number {
  const ast = parse(src);
  return (x: number) => {
    try {
      const v = evalNode(ast, { vars: { [varName]: x } });
      return typeof v === "number" ? v : NaN;
    } catch {
      return NaN;
    }
  };
}

/** True if the source mentions the given variable name. */
export function usesVar(src: string, name: string): boolean {
  try {
    const toks = tokenize(src);
    return toks.some((t) => t.t === "var" && t.name === name);
  } catch {
    return false;
  }
}

/* ---------------- number formatting ---------------- */

const SUP: Record<string, string> = {
  "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

export function toSup(s: string): string {
  return s.split("").map((c) => SUP[c] ?? c).join("");
}

/** Human-friendly number formatting with float-noise cleanup. */
export function fmt(n: number, sig = 12): string {
  if (Number.isNaN(n)) return "NaN";
  if (!isFinite(n)) return n > 0 ? "∞" : "-∞";
  if (n === 0) return "0";

  const cleaned = parseFloat(n.toPrecision(sig));
  const abs = Math.abs(cleaned);

  if (abs >= 1e13 || abs < 1e-9) {
    const exp = Math.floor(Math.log10(abs));
    const mant = parseFloat((cleaned / Math.pow(10, exp)).toPrecision(6));
    return `${mant}×10${toSup(String(exp))}`;
  }
  return String(cleaned);
}

/** Compact variant for grid labels etc. */
export function fmtShort(n: number): string {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e5 || abs < 1e-4) return n.toExponential(1).replace("e", "e");
  return String(parseFloat(n.toPrecision(5)));
}
