import { Sparkles } from "lucide-react";

const ITEMS = [
  "nes",
  "super nintendo",
  "sega genesis",
  "game boy",
  "neo-geo",
  "turbografx-16",
  "atari 2600",
  "master system",
  "arcade",
  "game gear",
];

export default function Marquee() {
  return (
    <div className="mask-x relative overflow-hidden border-y border-white/8 bg-panel/50 py-4">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center gap-10 pr-10">
            {ITEMS.map((t) => (
              <span
                key={t}
                className="flex items-center gap-10 whitespace-nowrap font-pixel text-[9px] uppercase tracking-[0.3em] text-fog"
              >
                <Sparkles className="h-3.5 w-3.5 text-arc" />
                {t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
