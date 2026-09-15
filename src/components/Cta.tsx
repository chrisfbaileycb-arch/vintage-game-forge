import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Gamepad2, Zap, Download, type LucideIcon } from "lucide-react";
import CopyChip from "./CopyChip";

const VP = { once: true, margin: "-80px" } as const;

function StepShell({
  n,
  icon: Icon,
  title,
  children,
  delay,
}: {
  n: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VP}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-white/10 bg-ink/70 p-6 text-left backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-neon/25 bg-neon/10 text-neon">
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-vt text-lg uppercase tracking-[0.2em] text-fog/60">
          step {n}
        </span>
      </div>
      <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
      <div className="mt-4 flex h-16 items-center">{children}</div>
    </motion.div>
  );
}

function PlayerOne() {
  const [ready, setReady] = useState(false);
  return (
    <button
      onClick={() => setReady((r) => !r)}
      className={
        "inline-flex cursor-pointer items-center gap-3 rounded-xl border px-5 py-3 font-pixel text-[9px] tracking-wider transition-colors " +
        (ready
          ? "border-arc/50 bg-arc/10 text-arc"
          : "border-neon/40 bg-neon/10 text-neon hover:bg-neon/20")
      }
    >
      <Zap className="h-4 w-4" />
      {ready ? "PLAYER 1 READY" : "PRESS START"}
      {!ready && <span className="h-2.5 w-2.5 animate-blink bg-neon" />}
    </button>
  );
}

export default function Cta() {
  return (
    <section id="play" className="relative py-28 md:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[2rem] border border-neon/20 bg-gradient-to-b from-panel to-ink px-6 py-16 md:px-14 md:py-20"
        >
          <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[38rem] -translate-x-1/2 rounded-full bg-neon/15 blur-[110px]" />
          <div className="scanlines-soft pointer-events-none absolute inset-0 opacity-40" />

          <div className="relative text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-neon/25 bg-neon/[0.08] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-neon">
              insert coin • it's free this time
            </span>
            <h2 className="mt-8 font-pixel text-[clamp(1.3rem,3.4vw,2.1rem)] leading-[1.5]">
              READY, PLAYER{" "}
              <span className="text-glow-neon text-neon">ONE?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-fog">
              Every classic boots free, forever. Bring a controller, a friend,
              or just the mouse you're holding right now.
            </p>
          </div>

          <div className="relative mt-12 grid gap-4 md:grid-cols-3">
            <StepShell n="01" icon={Gamepad2} title="Pick a console" delay={0}>
              <div className="flex flex-wrap gap-1.5">
                {["NES", "SNES", "GB", "GENESIS"].map((c) => (
                  <span
                    key={c}
                    className="rounded-md border border-arc/30 bg-arc/[0.07] px-2.5 py-1.5 font-mono text-[10px] text-arc"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </StepShell>

            <StepShell n="02" icon={Zap} title="Mash start" delay={0.07}>
              <PlayerOne />
            </StepShell>

            <StepShell n="03" icon={Download} title="Export system ROM" delay={0.14}>
              <CopyChip
                text="system-cartridge.replay"
                className="px-4 py-2.5 text-[13px]"
              />
            </StepShell>
          </div>

          <div className="relative mt-12 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#arcade"
              className="group inline-flex items-center gap-3 rounded-xl bg-neon px-7 py-4 font-pixel text-[10px] tracking-wider text-ink transition-colors hover:bg-arc"
            >
              START PLAYING • FREE
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a
              href="#builder"
              className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 px-7 py-4 text-sm font-medium text-fog transition-colors hover:border-arc/50 hover:text-arc"
            >
              <Download className="h-4.5 w-4.5" />
              Build &amp; Export System ROM
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
