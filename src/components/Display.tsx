import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";

export function Display({
  pretty,
  preview,
  equalsResult,
  lastLine,
  error,
  deg,
  shift,
  onToggleDeg,
}: {
  pretty: string;
  preview: string | null;
  equalsResult: string | null;
  lastLine: string | null;
  error: string | null;
  deg: boolean;
  shift: boolean;
  onToggleDeg: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [pretty, equalsResult]);

  return (
    <div className="inset-well relative flex flex-col justify-end overflow-hidden px-5 pb-4 pt-10" style={{ minHeight: 150 }}>
      {/* indicators */}
      <div className="absolute left-4 top-3 flex items-center gap-2">
        <button
          onClick={onToggleDeg}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-zinc-400 transition-colors hover:border-accent-500/40 hover:text-accent-300"
        >
          {deg ? "DEG" : "RAD"}
        </button>
        <AnimatePresence>
          {shift && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="rounded-md border border-accent-500/40 bg-accent-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-widest text-accent-400"
            >
              2ND
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* previous result */}
      <div className="absolute right-5 top-3 max-w-[60%] truncate font-mono text-[12px] text-zinc-600 tnum">
        {lastLine}
      </div>

      {/* expression */}
      <div
        ref={scrollRef}
        className={cn(
          "mask-fade-x w-full overflow-x-auto whitespace-nowrap text-right font-mono tnum",
          "[&::-webkit-scrollbar]:hidden"
        )}
        style={{ scrollbarWidth: "none" }}
      >
        {equalsResult !== null ? (
          <motion.span
            key={equalsResult}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[34px] font-semibold text-accent-400"
          >
            {equalsResult}
          </motion.span>
        ) : (
          <span className={cn("text-[30px]", pretty ? "text-zinc-100" : "text-zinc-700")}>
            {pretty || "0"}
            <span className="caret-blink ml-1 inline-block h-[26px] w-[2.5px] translate-y-[3px] rounded-full bg-accent-500" />
          </span>
        )}
      </div>

      {/* live preview / error */}
      <div className="mt-1 flex h-5 items-center justify-end">
        {error ? (
          <span className="font-mono text-[12.5px] text-red-400">{error}</span>
        ) : equalsResult === null && preview !== null ? (
          <span className="font-mono text-[13.5px] text-zinc-500 tnum">
            <span className="mr-1.5 text-accent-500/70">≈</span>
            {preview}
          </span>
        ) : null}
      </div>
    </div>
  );
}
