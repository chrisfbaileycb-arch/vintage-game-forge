import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Marquee from "./components/Marquee";
import GameBuilder from "./components/GameBuilder";
import GameGrid from "./components/GameGrid";
import Features from "./components/Features";
import Stats from "./components/Stats";
import Cta from "./components/Cta";
import Footer from "./components/Footer";
import { REPLAY_GAMES } from "./data/replayGames";
import type { ReplayGame } from "./types/replay";

export default function App() {
  const [activeGame, setActiveGame] = useState<ReplayGame>(() => REPLAY_GAMES[0]);

  return (
    <div
      id="top"
      className="relative min-h-screen overflow-x-clip bg-ink font-sans text-paper selection:bg-neon selection:text-ink"
    >
      {/* ambient CRT texture across the whole page */}
      <div className="scanlines-soft pointer-events-none fixed inset-0 z-[55] opacity-30" />
      <div className="noise pointer-events-none fixed inset-0 z-[60] opacity-[0.05]" />
      <Navbar />
      <main>
        <Hero activeGame={activeGame} onSelectGame={setActiveGame} />
        <Marquee />
        <GameBuilder onPlayInMainArcade={setActiveGame} />
        <GameGrid onSelectGame={setActiveGame} />
        <Features />
        <Stats />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
