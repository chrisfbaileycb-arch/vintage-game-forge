import { Gamepad2 } from "lucide-react";

const COLS = [
  { title: "Play", links: ["The arcade", "The vault", "Daily challenge", "Community picks"] },
  { title: "Create", links: ["Game builder", "Publish a cartridge", "Creator profiles", ".replay format"] },
  { title: "Support", links: ["Founding membership", "Roadmap", "Accessibility", "Contact"] },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/8">
      <div className="mx-auto max-w-6xl px-5 pt-20 sm:px-6">
        <div className="grid gap-12 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-lg border border-neon/30 bg-neon/10"><Gamepad2 className="h-5 w-5 text-neon" /></span><span className="font-pixel text-[11px] leading-tight">VINTAGE<br /><span className="text-neon">GAME FORGE</span></span></div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fog">A friendly little browser arcade for original retro-inspired games, curious players, and the people who still remember blowing into cartridges.</p>
            <span className="mt-5 inline-block rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] text-fog">FOUNDING SEASON • 2026</span>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{COLS.map((column) => <div key={column.title}><div className="font-vt text-lg uppercase tracking-[0.24em] text-fog/60">{column.title}</div><ul className="mt-4 space-y-2.5">{column.links.map((link) => <li key={link}><a href={link === "Founding membership" ? "#membership" : link === "Game builder" ? "#builder" : link === "The arcade" ? "#arcade" : "#top"} className="text-sm text-fog transition-colors hover:text-neon">{link}</a></li>)}</ul></div>)}</div>
        </div>
        <div className="pointer-events-none select-none overflow-hidden text-center"><div className="bg-gradient-to-b from-white/14 to-white/[0.02] bg-clip-text font-pixel text-[clamp(2.3rem,12vw,9rem)] leading-[1.1] tracking-tight text-transparent">FORGE</div></div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/8 py-6 font-vt text-lg tracking-wider text-fog/70 md:flex-row"><span>© 2026 VINTAGE GAME FORGE • FOR THE LOVE OF PIXELS</span><span>MADE OF <span className="text-neon">8 BITS</span> AT A TIME</span></div>
      </div>
    </footer>
  );
}
