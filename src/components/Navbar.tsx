import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll } from "framer-motion";
import { Coins, Gamepad2, Menu, X, Download } from "lucide-react";

const LINKS = [
  { label: "Arcade", href: "#arcade" },
  { label: "Game Builder", href: "#builder" },
  { label: "Library", href: "#library" },
  { label: "Why", href: "#why" },
  { label: "Stats", href: "#stats" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300 " +
        (scrolled
          ? "border-b border-white/8 bg-ink/80 backdrop-blur-xl"
          : "border-b border-transparent")
      }
    >
      <motion.div
        style={{ scaleX: scrollYProgress }}
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-neon/80"
      />

      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-neon/30 bg-neon/10">
            <Gamepad2 className="h-5 w-5 text-neon" />
          </span>
          <span className="font-pixel text-[13px] tracking-tight">
            REPLAY<span className="text-neon">.</span>
          </span>
          <span className="hidden rounded-full border border-arc/30 bg-arc/10 px-2 py-0.5 font-mono text-[10px] text-arc sm:inline">
            v2.4
          </span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm text-fog transition-colors hover:bg-white/5 hover:text-paper"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="#builder"
            className="hidden items-center gap-1.5 rounded-xl border border-arc/40 bg-arc/10 px-3.5 py-2 font-pixel text-[9px] tracking-wider text-arc transition-colors hover:bg-arc hover:text-ink lg:inline-flex"
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            BUILD GAME
          </a>

          <button
            onClick={() => {
              const fileInput = document.querySelector<HTMLInputElement>("#arcade-cabinet input[type='file']");
              if (fileInput) fileInput.click();
              else {
                const arcade = document.getElementById("arcade");
                arcade?.scrollIntoView({ behavior: "smooth" });
              }
            }}
            title="Load System File (.replay)"
            className="hidden h-10 w-10 place-items-center rounded-full border border-white/12 text-fog transition-colors hover:border-arc/50 hover:text-arc cursor-pointer sm:grid"
            aria-label="Load System File"
          >
            <Download className="h-4 w-4" />
          </button>

          <a
            href="#arcade"
            className="hidden items-center gap-2 rounded-xl bg-neon px-4 py-2.5 font-pixel text-[9px] tracking-wider text-ink transition-colors hover:bg-arc sm:inline-flex"
          >
            <Coins className="h-4 w-4" />
            INSERT COIN
          </a>

          <button
            className="cursor-pointer rounded-full p-2 text-fog transition-colors hover:bg-white/5 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-white/8 bg-ink/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col px-6 py-3">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-white/5 py-3.5 text-sm text-fog transition-colors last:border-0 hover:text-paper"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#builder"
                onClick={() => setOpen(false)}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-arc/40 bg-arc/10 px-4 py-3 font-pixel text-[9px] tracking-wider text-arc"
              >
                <Gamepad2 className="h-4 w-4" />
                BUILD GAME
              </a>
              <a
                href="#arcade"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-neon px-4 py-3 font-pixel text-[9px] tracking-wider text-ink"
              >
                <Coins className="h-4 w-4" />
                INSERT COIN
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
