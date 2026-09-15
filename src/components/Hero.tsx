import { motion, type Variants } from "framer-motion";
import { ArrowRight, ChevronDown, Heart } from "lucide-react";
import CopyChip from "./CopyChip";
import ArcadeGame from "./ArcadeGame";
import type { ReplayGame } from "@/types/replay";

const parent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Hero({
  activeGame,
  onSelectGame,
}: {
  activeGame?: ReplayGame | null;
  onSelectGame?: (game: ReplayGame) => void;
}) {
  return (
    <section id="arcade" className="relative overflow-hidden">
      <div className="mask-radial-fade absolute inset-0 bg-grid" />
      <div className="pointer-events-none absolute -left-32 top-[-18%] h-[420px] w-[560px] rounded-full bg-neon/[0.13] blur-[130px]" />
      <div className="pointer-events-none absolute -right-24 top-[30%] h-[380px] w-[420px] rounded-full bg-arc/[0.09] blur-[130px]" />

      <div className="relative mx-auto max-w-6xl px-6 pb-32 pt-36 md:pt-44">
        <motion.div
          variants={parent}
          initial="hidden"
          animate="show"
          className="grid items-center gap-14 lg:grid-cols-[0.95fr_1.05fr]"
        >
          {/* left column */}
          <div>
            <motion.div
              variants={item}
              className="inline-flex items-center gap-2.5 rounded-full border border-neon/25 bg-neon/[0.08] px-4 py-1.5"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-neon" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neon">
                STANDALONE SYSTEM FILES • DOWNLOADABLE .REPLAY ROMS
              </span>
            </motion.div>

            <motion.h1
              variants={item}
              className="animate-flicker mt-8 font-pixel text-[clamp(1.6rem,4.8vw,3.2rem)] leading-[1.32] tracking-tight"
            >
              PLAY THE
              <br />
              <span className="text-glow-neon text-neon">CLASSICS</span>
              <br />
              <span className="text-glow-arc text-arc">IN-BROWSER</span>
              <span className="ml-3 inline-block h-[0.72em] w-[0.5em] animate-blink bg-arc" />
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-7 max-w-xl text-lg leading-relaxed text-fog"
            >
              REPLAY is the open-source way to run 1,200+ cartridges and arcade
              boards right in a tab. Save states, netplay and a proper CRT
              filter — no installs, no quarters, no mercy for your free time.
            </motion.p>

            <motion.div
              variants={item}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a
                href="#library"
                className="group inline-flex items-center gap-3 rounded-xl bg-neon px-6 py-4 font-pixel text-[10px] tracking-wider text-ink transition-all duration-300 hover:-translate-y-0.5 hover:bg-arc"
              >
                BROWSE LIBRARY
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <CopyChip text="npx replay-cc" />
            </motion.div>

            <motion.div
              variants={item}
              className="mt-9 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-fog"
            >
              {["1,204 roms", "60 fps cores", "0 quarters", "MIT licensed"].map(
                (f, i) => (
                  <span key={f} className="flex items-center gap-3">
                    {i > 0 && <span className="text-neon">/</span>}
                    {f}
                  </span>
                )
              )}
            </motion.div>
          </div>

          {/* right column — the cabinet */}
          <motion.div variants={item} className="relative">
            <ArcadeGame activeGame={activeGame} onSelectGame={onSelectGame} />
            <div className="absolute -bottom-7 -left-3 z-10 hidden animate-float sm:block">
              <div className="rounded-xl border border-arc/30 bg-panel/95 px-4 py-3 shadow-xl shadow-black/50 backdrop-blur">
                <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-fog">
                  crt filter
                </div>
                <div className="mt-1 font-pixel text-[10px] text-arc">ON</div>
              </div>
            </div>
            <Heart className="absolute -right-3 -top-7 z-10 h-7 w-7 animate-float fill-neon text-neon drop-shadow-[0_0_12px_rgba(255,46,136,0.7)]" />
          </motion.div>
        </motion.div>
      </div>

      <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 md:flex">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-fog/60">
          scroll
        </span>
        <ChevronDown className="h-4 w-4 animate-bounce text-neon/70" />
      </div>
    </section>
  );
}
