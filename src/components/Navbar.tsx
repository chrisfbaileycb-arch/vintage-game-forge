import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll } from "framer-motion";
import { Download, Gamepad2, Menu, Sparkles, X } from "lucide-react";

const LINKS = [
  { label: "Play", href: "#arcade" },
  { label: "Library", href: "#library" },
  { label: "Build", href: "#builder" },
  { label: "Why it rules", href: "#why" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadFile = () => {
    const input = document.querySelector<HTMLInputElement>("#arcade-cabinet input[type='file']");
    input?.click();
  };

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-white/10 bg-ink/85 shadow-2xl shadow-black/20 backdrop-blur-xl" : "bg-transparent"}`}>
      <motion.div style={{ scaleX: scrollYProgress }} className="absolute inset-x-0 top-0 h-0.5 origin-left bg-neon" />
      <nav className="mx-auto flex h-[74px] max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="#top" className="group flex items-center gap-3" aria-label="Vintage Game Forge home">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-neon/40 bg-neon/10 shadow-[0_0_22px_rgba(255,46,136,.16)] transition-transform group-hover:rotate-[-8deg]">
            <Gamepad2 className="h-5 w-5 text-neon" />
          </span>
          <span className="font-pixel text-[11px] leading-tight tracking-tight sm:text-[13px]">VINTAGE<br /><span className="text-neon">GAME FORGE</span></span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => <a key={link.href} href={link.href} className="rounded-full px-4 py-2 text-sm text-fog transition-colors hover:bg-white/5 hover:text-paper">{link.label}</a>)}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadFile} className="hidden h-10 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs text-fog transition-colors hover:border-arc/50 hover:text-arc sm:flex" aria-label="Load a game file">
            <Download className="h-4 w-4" /> <span className="hidden lg:inline">LOAD CART</span>
          </button>
          <a href="#library" className="hidden items-center gap-2 rounded-xl bg-neon px-4 py-3 font-pixel text-[9px] tracking-wider text-ink transition-all hover:-translate-y-0.5 hover:bg-arc sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" /> PLAY NOW
          </a>
          <button className="rounded-xl p-2 text-fog hover:bg-white/5 hover:text-paper md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-b border-white/10 bg-ink/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col px-5 py-3">
            {LINKS.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="border-b border-white/5 py-4 text-sm text-fog last:border-0 hover:text-paper">{link.label}</a>)}
            <a href="#library" onClick={() => setOpen(false)} className="mt-3 rounded-xl bg-neon px-4 py-3 text-center font-pixel text-[9px] tracking-wider text-ink">PLAY NOW</a>
          </div>
        </motion.div>}
      </AnimatePresence>
    </header>
  );
}
