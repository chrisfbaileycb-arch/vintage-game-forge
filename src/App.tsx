import { useState } from "react";
import { Gamepad2, Sparkles, Trophy, Users } from "lucide-react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import GameBuilder from "./components/GameBuilder";
import GameGrid from "./components/GameGrid";
import Features from "./components/Features";
import Stats from "./components/Stats";
import Cta from "./components/Cta";
import Membership from "./components/Membership";
import Footer from "./components/Footer";
import { REPLAY_GAMES } from "./data/replayGames";
import type { ReplayGame } from "./types/replay";

const LIVE_SIGNALS = [
  { icon: Gamepad2, value: "1,204", label: "cartridges ready" },
  { icon: Users, value: "96.4K", label: "players this week" },
  { icon: Trophy, value: "2.3M", label: "scores chased" },
];

export default function App() {
  const [activeGame, setActiveGame] = useState<ReplayGame>(() => REPLAY_GAMES[0]);

  return (
    <div id="top" className="min-h-screen overflow-x-clip bg-ink font-sans text-paper selection:bg-neon selection:text-ink">
      <div className="pointer-events-none fixed inset-0 z-[55] scanlines-soft opacity-25" />
      <div className="pointer-events-none fixed inset-0 z-[60] noise opacity-[0.045]" />
      <Navbar />
      <main>
        <Hero activeGame={activeGame} onSelectGame={setActiveGame} />
        <Marquee />
        <section className="border-y border-white/10 bg-panel/70" aria-label="Live arcade activity">
          <div className="mx-auto grid max-w-6xl gap-px bg-white/10 sm:grid-cols-3">
            {LIVE_SIGNALS.map(({ icon: Icon, value, label }) => <div key={label} className="flex items-center gap-4 bg-ink/80 px-6 py-5"><Icon className="h-5 w-5 text-neon" /><div><p className="font-pixel text-sm text-paper">{value}</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fog">{label}</p></div><span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-emerald-400" /></div>)}
          </div>
        </section>
        <GameGrid onSelectGame={setActiveGame} />
        <Features />
        <Membership />
        <GameBuilder onPlayInMainArcade={setActiveGame} />
        <Stats />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
