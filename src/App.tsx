import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, LayoutGrid, Sigma } from "lucide-react";
import { CalculatorTab } from "./components/CalculatorTab";
import { EquationTab } from "./components/EquationTab";
import { MatrixTab } from "./components/MatrixTab";
import { Segmented } from "./components/ui";

type Mode = "calc" | "solve" | "matrix";

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid" />
      <div
        className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.14]"
        style={{ background: "radial-gradient(closest-side, #ff6b2c, transparent)" }}
      />
      <div
        className="absolute -right-56 top-1/3 h-[480px] w-[480px] rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(closest-side, #60a5fa, transparent)" }}
      />
      <div
        className="absolute -left-48 bottom-0 h-[420px] w-[420px] rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(closest-side, #5eead4, transparent)" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-ink-950 to-transparent" />
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode>("calc");

  return (
    <div className="noise relative flex min-h-screen flex-col">
      <Background />

      {/* header */}
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pb-2 pt-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-b from-accent-500 to-accent-600 text-ink-950 shadow-[0_4px_20px_rgba(242,82,26,0.4)]">
            <Sigma size={19} strokeWidth={2.6} />
          </div>
          <div>
            <div className="text-[17px] font-bold leading-none tracking-[0.28em] text-zinc-100">
              AXIOM
            </div>
            <div className="mt-1.5 font-mono text-[9.5px] uppercase leading-none tracking-[0.22em] text-zinc-600">
              compute · solve · prove
            </div>
          </div>
        </div>

        <Segmented
          id="main-mode"
          value={mode}
          onChange={(v) => setMode(v)}
          options={[
            { value: "calc", label: (<><Calculator size={14} /><span className="hidden sm:inline">Calculator</span></>) },
            { value: "solve", label: (<><Sigma size={14} /><span className="hidden sm:inline">Solve</span></>) },
            { value: "matrix", label: (<><LayoutGrid size={14} /><span className="hidden sm:inline">Matrix</span></>) },
          ]}
        />
      </header>

      {/* content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 22, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.995 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {mode === "calc" && <CalculatorTab />}
            {mode === "solve" && <EquationTab />}
            {mode === "matrix" && <MatrixTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700">
          <span>Axiom · precision instrument</span>
          <span className="normal-case tracking-[0.06em] text-zinc-500">
            Created by <span className="font-semibold text-accent-400">Mohammad Kashif Fazili</span>
          </span>
          <span className="hidden md:inline">parser · root finders · linear algebra — handcrafted in TypeScript</span>
        </div>
      </footer>
    </div>
  );
}
