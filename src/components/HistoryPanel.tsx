import { motion, AnimatePresence } from "framer-motion";
import { History, Trash2 } from "lucide-react";

export interface HistoryItem {
  id: number;
  expr: string;
  result: string;
  raw: number;
}

export function HistoryPanel({
  items,
  onPick,
  onClear,
}: {
  items: HistoryItem[];
  onPick: (item: HistoryItem) => void;
  onClear: () => void;
}) {
  return (
    <section className="panel flex min-h-0 flex-col p-5">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            History
          </h3>
          {items.length > 0 && (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10.5px] text-zinc-500">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={onClear}
            className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label="Clear history"
          >
            <Trash2 size={15} />
          </button>
        )}
      </header>

      <div className="-mr-2 max-h-[420px] min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-2 lg:max-h-none">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-white/[0.07] text-zinc-700"
            >
              <History size={20} />
              <p className="text-xs">Calculations will appear here</p>
            </motion.div>
          ) : (
            items.map((it) => (
              <motion.button
                key={it.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                onClick={() => onPick(it)}
                className="group block w-full rounded-xl border border-transparent bg-white/[0.025] px-4 py-2.5 text-right transition-all hover:border-accent-500/25 hover:bg-accent-500/[0.05]"
                title="Click to reuse result"
              >
                <div className="truncate font-mono text-[12px] text-zinc-500 group-hover:text-zinc-400">
                  {it.expr}
                </div>
                <div className="truncate font-mono text-[16px] font-medium text-zinc-200 tnum">
                  = {it.result}
                </div>
              </motion.button>
            ))
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
