import { useState, useEffect, useRef, useMemo } from "react";
import {
  Download,
  Upload,
  Disc,
  ChevronDown,
  Sparkles,
  Gamepad2,
  FileCode,
} from "lucide-react";
import { REPLAY_GAMES } from "@/data/replayGames";
import type { ReplayGame } from "@/types/replay";
import { GameCanvas } from "./GameCanvas";
import { getSpecForReplayGame, downloadSystemRom, readSystemRomFile } from "@/lib/systemRom";
import { recordScoreToFirestore, getActiveCreatorIdentity } from "@/lib/firebaseGames";
import { toast } from "sonner";

export default function ArcadeGame({
  activeGame: propActiveGame,
  onSelectGame,
}: {
  activeGame?: ReplayGame | null;
  onSelectGame?: (game: ReplayGame) => void;
}) {
  const [internalGame, setInternalGame] = useState<ReplayGame>(() => REPLAY_GAMES[0]);
  const activeGame = propActiveGame ?? internalGame;

  const [cartridgeInserted, setCartridgeInserted] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive genuine retro engine spec for the active cartridge
  const spec = useMemo(() => getSpecForReplayGame(activeGame), [activeGame]);

  // Cartridge insert animation when active game changes
  useEffect(() => {
    setCartridgeInserted(true);
    const timer = window.setTimeout(() => setCartridgeInserted(false), 900);
    return () => window.clearTimeout(timer);
  }, [activeGame.id]);

  const handleSwitchGame = (g: ReplayGame) => {
    if (onSelectGame) onSelectGame(g);
    else setInternalGame(g);
    setShowPicker(false);
  };

  const handleDownloadRom = () => {
    downloadSystemRom(activeGame);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await readSystemRomFile(file);
      if (onSelectGame) onSelectGame(loaded);
      else setInternalGame(loaded);
      toast.success(`System ROM "${loaded.title}" booted!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load system file.");
    } finally {
      e.target.value = "";
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      const loaded = await readSystemRomFile(file);
      if (onSelectGame) onSelectGame(loaded);
      else setInternalGame(loaded);
      toast.success(`System ROM "${loaded.title}" booted!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load system file.");
    }
  };

  const handleScoreSubmit = async (score: number) => {
    try {
      const pilot = getActiveCreatorIdentity();
      await recordScoreToFirestore({
        gameId: activeGame.id,
        gameTitle: activeGame.title,
        score,
        level: 1,
        userName: pilot.name,
      });
      toast.success(`High score ${score} recorded to the arcade ledger!`);
    } catch (err) {
      console.error(err);
      toast.info(`Local score ${score} achieved!`);
    }
  };

  return (
    <div
      id="arcade-cabinet"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className="relative mx-auto w-full max-w-[500px]"
    >
      {/* Hidden system file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".replay,.retro,.json"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Neon haze behind cabinet */}
      <div className="glow pointer-events-none absolute -inset-8 rounded-[40px] bg-neon/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-arc/20 blur-3xl" />

      <div className="relative rounded-3xl border border-white/12 bg-gradient-to-b from-panel2 via-panel to-ink p-4 sm:p-5 shadow-2xl shadow-black/80">
        {/* Cabinet Marquee Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-1 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[11px] tracking-[0.16em] text-neon drop-shadow-[0_0_8px_rgba(255,46,136,0.6)] truncate max-w-[170px] sm:max-w-xs">
              {activeGame.title}
            </span>
            <span className="rounded border border-arc/40 bg-arc/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-arc">
              {activeGame.cat}
            </span>
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-fog/70">
              {spec.mould}
            </span>
          </div>

          <div className="relative flex items-center gap-1.5">
            {/* Download System ROM button */}
            <button
              onClick={handleDownloadRom}
              className="flex items-center gap-1 rounded-lg border border-arc/40 bg-arc/15 px-2.5 py-1 font-mono text-[10px] text-arc transition-colors hover:bg-arc/25 hover:text-white cursor-pointer"
              title="Download standalone .replay system file"
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">ROM</span>
            </button>

            {/* Load System ROM button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] text-fog transition-colors hover:border-white/30 hover:text-paper cursor-pointer"
              title="Load system file (.replay) from disk"
            >
              <Upload className="h-3 w-3" />
              <span className="hidden sm:inline">LOAD</span>
            </button>

            {/* Swap Cartridge Popover Trigger */}
            <button
              onClick={() => setShowPicker((p) => !p)}
              className="flex items-center gap-1 rounded-lg border border-neon/40 bg-neon/10 px-2.5 py-1 font-mono text-[10px] text-neon transition-colors hover:bg-neon hover:text-ink cursor-pointer"
              title="Swap Cartridge"
            >
              <Disc className="h-3 w-3" />
              <span>CARTS</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Cartridge selector popover dropdown */}
        {showPicker && (
          <div className="absolute left-4 right-4 top-16 z-40 max-h-72 overflow-y-auto rounded-xl border border-arc/40 bg-panel2/98 p-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 font-pixel text-[9px] text-arc">
              <span>INSERT A SYSTEM CARTRIDGE ({REPLAY_GAMES.length} AVAILABLE)</span>
              <button
                onClick={() => setShowPicker(false)}
                className="text-fog hover:text-paper cursor-pointer px-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {REPLAY_GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleSwitchGame(g)}
                  className={
                    "flex items-center justify-between rounded-lg px-2.5 py-2 text-left font-mono text-xs transition-colors cursor-pointer " +
                    (activeGame.id === g.id
                      ? "border border-neon bg-neon/15 text-neon"
                      : "border border-transparent bg-white/5 text-fog hover:border-white/20 hover:text-paper")
                  }
                >
                  <span className="truncate font-semibold">{g.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="rounded bg-black/40 px-1 py-0.5 text-[9px] text-arc">
                      {g.cat}
                    </span>
                    <span className="text-[10px] text-fog/60">'{String(g.year).slice(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Drag and drop overlay hint */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-3xl border-2 border-dashed border-arc bg-ink/90 backdrop-blur-sm">
            <div className="text-center p-6">
              <FileCode className="mx-auto h-12 w-12 text-arc animate-bounce" />
              <p className="mt-3 font-pixel text-sm text-paper">DROP SYSTEM FILE TO BOOT ROM</p>
              <p className="mt-1 font-mono text-xs text-fog">Accepts .replay, .retro, and .json files</p>
            </div>
          </div>
        )}

        {/* Screen Bezel and Game Engine View */}
        <div className="relative mt-3">
          {/* Cartridge insertion notification banner */}
          {cartridgeInserted && (
            <div className="pointer-events-none absolute inset-x-2 top-2 z-30 flex justify-center animate-fade-in">
              <div className="rounded-xl border border-arc/60 bg-ink/95 px-4 py-2 text-center shadow-xl backdrop-blur-md">
                <p className="flex items-center gap-2 font-pixel text-[10px] text-arc">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold" />
                  BOOTING ROM: {activeGame.title} [{spec.mould.toUpperCase()}]
                </p>
              </div>
            </div>
          )}

          {/* Genuine 60fps Retro Engine Canvas */}
          <div className="rounded-xl border border-black/80 bg-black/90 p-2 shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]">
            <GameCanvas
              key={`arcade_${activeGame.id}_${spec.mould}`}
              spec={spec}
              className="w-full"
              showHud={true}
              onSubmitScore={handleScoreSubmit}
            />
          </div>
        </div>

        {/* Cabinet Lower Deck Quick Actions */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadRom}
              className="inline-flex items-center gap-1.5 rounded-lg border border-arc/40 bg-arc/10 px-3 py-1.5 font-mono text-[11px] text-arc hover:bg-arc hover:text-ink transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              DOWNLOAD SYSTEM FILE (.replay)
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-fog hover:text-paper hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              LOAD FILE
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-fog/60 font-mono text-[10px]">
            <Gamepad2 className="h-3.5 w-3.5 text-arc" />
            <span>STANDALONE EMULATOR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
