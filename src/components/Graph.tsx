import { useMemo } from "react";
import { fmtShort } from "@/lib/math/parser";

export interface Curve {
  fn: (x: number) => number;
  stroke: string;
  dash?: boolean;
}

interface GraphProps {
  funcs: Curve[];
  roots?: number[];
  points?: { x: number; y: number; label?: string }[];
  range?: [number, number];
  label?: string;
}

const W = 640;
const H = 300;
const PAD = 10;

function niceStep(raw: number): number {
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  if (norm < 1.5) return mag;
  if (norm < 3.5) return 2 * mag;
  if (norm < 7.5) return 5 * mag;
  return 10 * mag;
}

export function Graph({ funcs, roots = [], points = [], range, label }: GraphProps) {
  const model = useMemo(() => {
    let x0: number, x1: number;
    if (range) {
      [x0, x1] = range;
    } else if (roots.length > 0) {
      const span = Math.max(roots[roots.length - 1] - roots[0], 4);
      const padX = span * 0.35;
      x0 = roots[0] - padX;
      x1 = roots[roots.length - 1] + padX;
    } else if (points.length > 0) {
      x0 = points[0].x - 8;
      x1 = points[0].x + 8;
    } else {
      x0 = -10; x1 = 10;
    }

    const N = 560;
    const sampled = funcs.map(({ fn }) => {
      const pts: { x: number; y: number }[] = [];
      const yVals: number[] = [];
      for (let i = 0; i <= N; i++) {
        const x = x0 + ((x1 - x0) * i) / N;
        const y = fn(x);
        pts.push({ x, y });
        if (isFinite(y)) yVals.push(y);
      }
      return { pts, yVals };
    });

    let yMin = -10, yMax = 10;
    const allY = sampled.flatMap((s) => s.yVals).sort((a, b) => a - b);
    if (allY.length > 8) {
      const lo = allY[Math.floor(allY.length * 0.02)];
      const hi = allY[Math.min(allY.length - 1, Math.ceil(allY.length * 0.98) - 1)];
      if (isFinite(lo) && isFinite(hi) && hi > lo) {
        const padY = (hi - lo) * 0.18 + 1e-9;
        yMin = lo - padY;
        yMax = hi + padY;
      }
    }
    // make sure marked points stay visible
    for (const p of points) {
      yMin = Math.min(yMin, p.y - (yMax - yMin) * 0.12);
      yMax = Math.max(yMax, p.y + (yMax - yMin) * 0.12);
    }

    const X = (x: number) => PAD + ((x - x0) / (x1 - x0)) * (W - 2 * PAD);
    const Y = (y: number) => H - PAD - ((y - yMin) / (yMax - yMin)) * (H - 2 * PAD);
    const spanY = yMax - yMin;

    const paths = sampled.map(({ pts }) => {
      let d = "";
      let pen = false;
      let prevY = 0;
      for (const p of pts) {
        if (!isFinite(p.y)) { pen = false; continue; }
        const cy = Math.min(Math.max(p.y, yMin - spanY), yMax + spanY);
        const jump = Math.abs(cy - prevY) > spanY * 0.5;
        const sx = X(p.x), sy = Y(cy);
        if (!pen || jump) {
          d += `M ${sx.toFixed(2)} ${sy.toFixed(2)}`;
          pen = true;
        } else {
          d += ` L ${sx.toFixed(2)} ${sy.toFixed(2)}`;
        }
        prevY = cy;
      }
      return d;
    });

    const sx = niceStep((x1 - x0) / 7);
    const xTicks: number[] = [];
    for (let t = Math.ceil(x0 / sx) * sx; t <= x1; t += sx) xTicks.push(parseFloat(t.toPrecision(10)));
    const sy = niceStep(spanY / 4);
    const yTicks: number[] = [];
    for (let t = Math.ceil(yMin / sy) * sy; t <= yMax; t += sy) yTicks.push(parseFloat(t.toPrecision(10)));

    return { x0, x1, yMin, yMax, paths, X, Y, xTicks, yTicks };
  }, [funcs, roots, points, range]);

  const { x0, x1, yMin, yMax, paths, X, Y, xTicks, yTicks } = model;
  const inView = (x: number) => x >= x0 && x <= x1;

  return (
    <div className="inset-well relative overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="block aspect-[640/300] w-full">
        {xTicks.map((t) => (
          <line key={`gx${t}`} x1={X(t)} x2={X(t)} y1={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
        ))}
        {yTicks.map((t) => (
          <line key={`gy${t}`} x1={PAD} x2={W - PAD} y1={Y(t)} y2={Y(t)} stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
        ))}

        {yMin < 0 && yMax > 0 && (
          <line x1={PAD} x2={W - PAD} y1={Y(0)} y2={Y(0)} stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
        )}
        {x0 < 0 && x1 > 0 && (
          <line x1={X(0)} x2={X(0)} y1={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
        )}

        {xTicks.map((t) => (
          <text key={`lx${t}`} x={X(t)} y={H - 2} textAnchor="middle" fontSize="10.5" fill="#525b6e" fontFamily="JetBrains Mono, monospace">
            {fmtShort(t)}
          </text>
        ))}

        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={funcs[i].stroke}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={funcs[i].dash ? "7 6" : undefined}
          />
        ))}

        {roots.filter(inView).map((r, i) => (
          <g key={`r${i}`}>
            <circle cx={X(r)} cy={Y(0)} r="10" fill="rgba(94,234,212,0.12)" />
            <circle className="root-dot" cx={X(r)} cy={Y(0)} r="4.5" fill="#5eead4" />
          </g>
        ))}

        {points.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={X(p.x)} cy={Y(p.y)} r="12" fill="rgba(94,234,212,0.14)" />
            <circle cx={X(p.x)} cy={Y(p.y)} r="5" fill="#5eead4" stroke="#0b0d12" strokeWidth="2" />
            {p.label && (
              <text x={X(p.x) + 12} y={Y(p.y) - 10} fontSize="11.5" fill="#5eead4" fontFamily="JetBrains Mono, monospace">
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {label && (
        <div className="pointer-events-none absolute left-3 top-2.5 rounded-md bg-black/50 px-2 py-1 font-mono text-[10.5px] text-zinc-500 backdrop-blur">
          {label}
        </div>
      )}
    </div>
  );
}
