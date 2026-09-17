import { motion, type Variants } from "framer-motion";
import { ArrowDown, ArrowRight, Heart, Sparkles } from "lucide-react";
import CopyChip from "./CopyChip";
import ArcadeGame from "./ArcadeGame";
import type { ReplayGame } from "@/types/replay";

const parent: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } };
const item: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } };

export default function Hero({ activeGame, onSelectGame }: { activeGame?: ReplayGame | null; onSelectGame?: (game: ReplayGame) => void }) {
  return (
    <section id="arcade" className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="pointer-events-none absolute -left-40 top-[-12%] h-[520px] w-[620px] rounded-full bg-neon/[0.14] blur-[140px]" />
      <div className="pointer-events-none absolute -right-40 top-[32%] h-[480px] w-[520px] rounded-full bg-arc/[0.12] blur-[140px]" />

      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-32 sm:px-6 sm:pt-40 lg:pb-32">
        <motion.div variants={parent} initial="hidden" animate="show" className="grid items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <motion.div variants={item} className="inline-flex items-center gap-2 rounded-full border border-arc/30 bg-arc/[0.08] px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-arc">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> The internet's little arcade
            </motion.div>
            <motion.h1 variants={item} className="mt-7 max-w-xl font-pixel text-[clamp(2rem,5.3vw,4.1rem)] leading-[1.26] tracking-tight">
              YOUR NEXT<br /><span className="text-glow-neon text-neon">OBSESSION</span><br /><span className="text-glow-arc text-arc">STARTS HERE</span><span className="ml-2 inline-block h-[.7em] w-[.45em] animate-blink bg-arc" />
            </motion.h1>
            <motion.p variants={item} className="mt-7 max-w-lg text-lg leading-relaxed text-fog sm:text-xl">Drop into a hand-picked arcade of weird, wonderful, high-score-chasing games. Play instantly in your browser, then forge your own cartridge when inspiration hits.</motion.p>
            <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#library" className="group inline-flex items-center gap-3 rounded-xl bg-neon px-5 py-4 font-pixel text-[10px] tracking-wider text-ink shadow-[0_0_28px_rgba(255,46,136,.25)] transition-all hover:-translate-y-1 hover:bg-arc">ENTER THE ARCADE <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></a>
              <CopyChip text="npx replay-cc" />
            </motion.div>
            <motion.div variants={item} className="mt-8 flex flex-wrap gap-x-3 gap-y-2 font-mono text-xs text-fog/80"><span className="text-neon">●</span> no install <span className="text-neon">/</span> 60 fps <span className="text-neon">/</span> save states <span className="text-neon">/</span> free to play</motion.div>
          </div>

          <motion.div variants={item} className="relative">
            <ArcadeGame activeGame={activeGame} onSelectGame={onSelectGame} />
            <div className="absolute -left-4 -bottom-6 hidden rounded-xl border border-arc/30 bg-panel/95 px-4 py-3 shadow-xl backdrop-blur sm:block"><p className="font-mono text-[9px] uppercase tracking-[.22em] text-fog">now playing</p><p className="mt-1 font-pixel text-[10px] text-arc">{activeGame?.title ?? "STAR VOYAGER"}</p></div>
            <div className="absolute -right-3 -top-7 hidden items-center gap-2 rounded-full border border-neon/30 bg-panel/90 px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-neon shadow-xl backdrop-blur sm:flex"><Heart className="h-3.5 w-3.5 fill-neon" /> player's choice</div>
          </motion.div>
        </motion.div>
      </div>
      <a href="#library" className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-2 font-mono text-[9px] uppercase tracking-[.28em] text-fog/60 md:flex">scroll to browse <ArrowDown className="h-4 w-4 animate-bounce text-neon" /></a>
    </section>
  );
}
