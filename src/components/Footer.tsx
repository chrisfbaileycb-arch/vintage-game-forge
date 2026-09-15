import { Gamepad2 } from "lucide-react";

const COLS = [
  {
    title: "Consoles",
    links: ["NES", "Super Nintendo", "Sega Genesis", "Game Boy", "Arcade"],
  },
  {
    title: "Platform",
    links: ["The vault", "Save states", "Netplay", "CRT filter", "Mobile"],
  },
  {
    title: "System ROMs",
    links: [".replay Format", "Export ROMs", "Local Save States", "Chiptune Audio", "CRT Shaders"],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-white/8">
      <div className="mx-auto max-w-6xl px-6 pt-20">
        <div className="grid gap-12 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-neon/30 bg-neon/10">
                <Gamepad2 className="h-5 w-5 text-neon" />
              </span>
              <span className="font-pixel text-[13px] tracking-tight">
                REPLAY<span className="text-neon">.</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fog">
              The classics at 60fps, built in the open by people who grew up
              blowing into cartridges. Every byte MIT-licensed.
            </p>
            <span className="mt-5 inline-block rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] text-fog">
              v2.4.0 • MIT
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLS.map((c) => (
              <div key={c.title}>
                <div className="font-vt text-lg uppercase tracking-[0.24em] text-fog/60">
                  {c.title}
                </div>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a
                        href="#top"
                        className="text-sm text-fog transition-colors hover:text-neon"
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* big retro watermark */}
        <div className="pointer-events-none select-none overflow-hidden text-center">
          <div className="bg-gradient-to-b from-white/14 to-white/[0.02] bg-clip-text font-pixel text-[clamp(2.6rem,13vw,10rem)] leading-[1.1] tracking-tight text-transparent">
            REPLAY
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/8 py-6 font-vt text-lg tracking-wider text-fog/70 md:flex-row">
          <span>© 2026 REPLAY • FOR THE LOVE OF PIXELS</span>
          <span>
            MADE OF <span className="text-neon">8 BITS</span> AT A TIME
          </span>
        </div>
      </div>
    </footer>
  );
}
