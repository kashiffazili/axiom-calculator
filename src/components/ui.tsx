import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/utils/cn";

/* ---------- panel card ---------- */

export function Card({
  title,
  hint,
  right,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5 sm:p-6", className)}>
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {title}
              </h3>
            )}
            {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

/* ---------- segmented control ---------- */

export function Segmented<T extends string>({
  id,
  options,
  value,
  onChange,
  size = "md",
}: {
  id: string;
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/[0.07] bg-black/40 p-1",
        size === "sm" && "gap-0.5 p-0.5"
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-full font-medium transition-colors duration-200",
              size === "md" ? "px-4 py-2 text-[13px]" : "px-3 py-1.5 text-xs",
              active ? "text-ink-950" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-accent-500"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- chip ---------- */

export function Chip({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 font-mono text-[11.5px] text-zinc-400 transition-all hover:border-accent-500/40 hover:text-accent-300 active:scale-95"
    >
      {children}
    </button>
  );
}

/* ---------- error banner ---------- */

export function ErrorNote({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-[13px] text-red-300"
    >
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

/* ---------- tiny label ---------- */

export function MicroLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </div>
  );
}
