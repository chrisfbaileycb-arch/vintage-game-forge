import { motion } from "framer-motion";
import { Gamepad2, Monitor, Save, Wifi, Zap, Download, type LucideIcon } from "lucide-react";
import SectionHead from "./SectionHead";

const VP = { once: true, margin: "-80px" } as const;

type Accent = "neon" | "arc" | "gold";

const ACCENT: Record<Accent, string> = {
  neon: "border-neon/25 bg-neon/10 text-neon",
  arc: "border-arc/25 bg-arc/10 text-arc",
  gold: "border-gold/25 bg-gold/10 text-gold",
};

const PERKS: { icon: LucideIcon; accent: Accent; title: string; desc: string }[] = [
  {
    icon: Zap,
    accent: "arc",
    title: "Boots in under 2s",
    desc: "No installs, no launchers. WebAssembly cores stream instantly — even on hotel wifi.",
  },
  {
    icon: Save,
    accent: "neon",
    title: "Save anywhere",
    desc: "Freeze-frame mid-jump, close the tab, resume on your phone. States sync to your account.",
  },
  {
    icon: Monitor,
    accent: "gold",
    title: "A real CRT filter",
    desc: "Scanlines, aperture grille and a hint of bloom — or pure razor pixels. Your call, per game.",
  },
  {
    icon: Gamepad2,
    accent: "arc",
    title: "Gamepad ready",
    desc: "Any controller, zero config. Rumble works where the original hardware had it.",
  },
  {
    icon: Wifi,
    accent: "neon",
    title: "Netplay",
    desc: "Send a link, share a couch. Rollback netcode keeps Street Fighter rounds honest.",
  },
];

export default function Features() {
  return (
    <section id="why" className="relative py-28 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHead
          index="02"
          kicker="Why replay"
          title={
            <>
              Zero quarters <span className="text-arc">required.</span>
            </>
          }
          desc="This isn't a ROM directory with a play button. It's a cabinet-grade runtime, tuned for feel."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {PERKS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VP}
              transition={{ duration: 0.65, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="group rounded-3xl border border-white/8 bg-panel p-6 transition-colors duration-300 hover:border-white/20"
            >
              <div
                className={
                  "grid h-11 w-11 place-items-center rounded-xl border " +
                  ACCENT[p.accent]
                }
              >
                <p.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fog">{p.desc}</p>
            </motion.div>
          ))}

          {/* standalone system files card */}
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={{ duration: 0.65, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="group relative overflow-hidden rounded-3xl border border-neon/30 bg-neon/[0.06] p-6 transition-colors duration-300 hover:border-neon/60"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-neon/25 blur-3xl" />
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-neon/30 bg-neon/10 text-neon">
              <Download className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight">
              Standalone System Files (.replay)
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-fog">
              Every game compiles to a lightweight, portable .replay system file.
              Download your cartridges, backup save states locally, and load them into any browser without cloud lock-in.
            </p>
            <button
              onClick={() => {
                const fileInput = document.querySelector<HTMLInputElement>("#arcade-cabinet input[type='file']");
                if (fileInput) fileInput.click();
                else {
                  const arcade = document.getElementById("arcade");
                  arcade?.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="mt-4 inline-flex items-center gap-2 font-pixel text-[9px] text-neon transition-transform duration-300 group-hover:translate-x-1 cursor-pointer"
            >
              LOAD SYSTEM FILE →
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
