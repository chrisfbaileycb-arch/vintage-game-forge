import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Search, Star, X, PlusCircle, Wrench, Download, Upload } from "lucide-react";
import CartCover from "./CartCover";
import SectionHead from "./SectionHead";
import type { ReplayGame } from "@/types/replay";
import { CONSOLES } from "@/types/replay";
import { REPLAY_GAMES } from "@/data/replayGames";
import { getPublishedGames } from "@/lib/firebaseGames";
import { downloadSystemRom, readSystemRomFile } from "@/lib/systemRom";
import { toast } from "sonner";

const EXTENDED_CONSOLES = [...CONSOLES, "COMMUNITY"] as const;
type FilterCat = (typeof EXTENDED_CONSOLES)[number];

const CAT_COLORS: Record<string, string> = {
  NES: "border-[#ff2e88]/40 bg-[#ff2e88]/10 text-[#ff2e88]",
  SNES: "border-[#b78bff]/40 bg-[#b78bff]/10 text-[#b78bff]",
  GENESIS: "border-[#2ee6ff]/40 bg-[#2ee6ff]/10 text-[#2ee6ff]",
  ARCADE: "border-[#ffd23f]/40 bg-[#ffd23f]/10 text-[#ffd23f]",
  GB: "border-[#35f2a8]/40 bg-[#35f2a8]/10 text-[#35f2a8]",
  COMMUNITY: "border-[#38bdf8]/40 bg-[#38bdf8]/10 text-[#38bdf8]",
};

function formatPlays(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${Math.round(n / 1_000)}k`;
}

function GameCardImage({ game }: { game: ReplayGame }) {
  const [imgFailed, setImgFailed] = useState(!game.img);

  if (game.img && !imgFailed) {
    return (
      <img
        src={game.img}
        alt={game.title}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  if (game.cover) {
    return (
      <CartCover
        spec={game.cover}
        className="h-full w-full transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="h-full w-full bg-panel2 flex items-center justify-center text-fog font-pixel text-xs text-center p-2">
      {game.title}
    </div>
  );
}

export default function GameGrid({
  onSelectGame,
}: {
  onSelectGame?: (game: ReplayGame) => void;
}) {
  const [cat, setCat] = useState<FilterCat>("ALL");
  const [search, setSearch] = useState("");
  const [communityGames, setCommunityGames] = useState<ReplayGame[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportRom = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await readSystemRomFile(file);
      handlePlay(loaded);
      toast.success(`Loaded system cartridge "${loaded.title}"!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load system file.");
    } finally {
      e.target.value = "";
    }
  };

  // Fetch community games from Firebase Firestore
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const fbGames = await getPublishedGames();
        if (!active) return;
        const converted: ReplayGame[] = fbGames.map((g) => ({
          id: g.id,
          title: g.title,
          cat: g.category || "ARCADE",
          year: new Date(g.createdAt).getFullYear() || 2026,
          rating: 5,
          plays: g.plays || 120,
          description: g.description,
          accentColor: "#2ee6ff",
          themeColors: ["#2ee6ff", "#ff2e88", "#ffd23f", "#35f2a8"],
          cartridgeSpec: g.spec,
          creatorName: g.creatorName,
          cover: {
            pattern: (g.mould === "invaders" || g.mould === "flyer"
              ? "nebula"
              : g.mould === "snake"
              ? "meadow"
              : g.mould === "burrower"
              ? "ember"
              : g.mould === "crossing"
              ? "waves"
              : "grid") as any,
            seed: g.spec?.seed || 1234,
            colors: ["#0a0714", "#181028", "#2ee6ff", "#ff2e88"],
          },
        }));
        setCommunityGames(converted);
      } catch (err) {
        console.warn("Could not load community games:", err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const allGames = useMemo(() => {
    return [...communityGames, ...REPLAY_GAMES];
  }, [communityGames]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allGames.filter((g) => {
      const isCommunity = communityGames.some((cg) => cg.id === g.id);
      const matchCat =
        cat === "ALL"
          ? true
          : cat === "COMMUNITY"
          ? isCommunity
          : g.cat === cat;

      const matchQuery =
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.cat.toLowerCase().includes(q) ||
        String(g.year).includes(q) ||
        (g.description && g.description.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [allGames, communityGames, cat, search]);

  const handlePlay = (game: ReplayGame) => {
    if (onSelectGame) onSelectGame(game);
    const arcadeEl = document.getElementById("arcade");
    if (arcadeEl) {
      arcadeEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="library" className="relative py-28 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHead
          index="01"
          kicker="The vault"
          title={
            <>
              Pick a cart. <span className="text-neon">Hit play.</span>
            </>
          }
          desc="Hand-curated archives from the 8 and 16-bit golden eras. Every title boots in seconds with save states and CRT rendering."
        />

        {/* filters & search */}
        <div className="mt-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* console pills */}
          <div className="flex flex-wrap gap-2">
            {EXTENDED_CONSOLES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={
                  "cursor-pointer rounded-xl px-4 py-2 font-pixel text-[9px] uppercase tracking-wider transition-all " +
                  (cat === c
                    ? "bg-neon text-ink shadow-[0_0_16px_rgba(255,46,136,0.35)]"
                    : "border border-white/10 bg-panel text-fog hover:border-white/25 hover:text-paper")
                }
              >
                {c === "COMMUNITY" ? `COMMUNITY (${communityGames.length})` : c}
              </button>
            ))}
          </div>

          {/* search box & load rom button */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".replay,.retro,.json"
              className="hidden"
              onChange={handleImportRom}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-arc/40 bg-arc/10 px-3 py-2.5 font-mono text-xs text-arc hover:bg-arc/20 transition-colors whitespace-nowrap cursor-pointer"
              title="Load custom .replay system file"
            >
              <Upload className="h-3.5 w-3.5" />
              LOAD FILE
            </button>

            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fog/60" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter games..."
                className="w-full rounded-xl border border-white/10 bg-panel py-2.5 pl-10 pr-9 font-mono text-xs text-paper placeholder:text-fog/50 focus:border-neon focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fog hover:text-paper cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* game count indicator */}
        <div className="mt-4 flex items-center justify-between text-xs font-mono text-fog/60">
          <span>Showing {filtered.length} of {REPLAY_GAMES.length} classics</span>
          {cat !== "ALL" && <span>Filtered by {cat}</span>}
        </div>

        {/* cards grid */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {/* Create Your Own Cartridge Action Card */}
          {(cat === "ALL" || cat === "COMMUNITY") && !search && (
            <a
              href="#builder"
              className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-arc/40 bg-arc/5 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-arc hover:bg-arc/10 hover:shadow-xl hover:shadow-arc/20"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-arc/50 bg-arc/20 text-arc transition-transform duration-300 group-hover:scale-110">
                <PlusCircle className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-pixel text-xs text-paper group-hover:text-arc">
                BUILD A GAME
              </h3>
              <p className="mt-1 font-mono text-[10px] text-fog leading-relaxed">
                Tune custom dials, choose CRT colors, and deploy to Firebase
              </p>
              <span className="mt-4 inline-flex items-center gap-1 font-pixel text-[8px] text-arc tracking-wider">
                <Wrench className="h-3 w-3" /> OPEN STUDIO
              </span>
            </a>
          )}

          <AnimatePresence>
            {filtered.map((g, i) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: i * 0.02 }}
                onClick={() => handlePlay(g)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/8 bg-panel transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-xl hover:shadow-neon/10"
              >
                {/* cartridge cover */}
                <div className="relative aspect-[3/4] overflow-hidden bg-ink">
                  <GameCardImage game={g} />

                  {/* badges overlay */}
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    <span
                      className={
                        "rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider backdrop-blur-sm " +
                        (CAT_COLORS[g.cat] || "border-white/20 bg-black/40 text-paper")
                      }
                    >
                      {g.cat}
                    </span>
                    <span className="rounded-md border border-white/10 bg-black/50 px-1.5 py-0.5 font-vt text-sm tracking-wider text-fog backdrop-blur-sm">
                      '{String(g.year).slice(2)}
                    </span>
                  </div>

                  {/* quick play and download hover overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/75 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 p-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(g);
                      }}
                      className="inline-flex w-full max-w-[130px] items-center justify-center gap-2 rounded-xl bg-neon px-3 py-2 font-pixel text-[9px] tracking-wider text-ink shadow-lg shadow-neon/40 transition-transform duration-200 hover:scale-105"
                    >
                      <Play className="h-3.5 w-3.5 fill-ink" />
                      PLAY NOW
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSystemRom(g);
                      }}
                      className="inline-flex w-full max-w-[130px] items-center justify-center gap-1.5 rounded-xl border border-arc/50 bg-ink/90 px-3 py-1.5 font-mono text-[9px] text-arc hover:bg-arc hover:text-ink transition-colors"
                      title="Download game as .replay system file"
                    >
                      <Download className="h-3 w-3" />
                      DOWNLOAD ROM
                    </button>
                  </div>
                </div>

                {/* card meta */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="truncate font-pixel text-[11px] tracking-tight text-paper transition-colors group-hover:text-neon">
                      {g.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSystemRom(g);
                      }}
                      className="text-fog/40 hover:text-arc transition-colors p-0.5"
                      title="Download .replay system file"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star
                          key={si}
                          className={
                            "h-3 w-3 " +
                            (si < g.rating
                              ? "fill-gold text-gold"
                              : "text-white/15")
                          }
                        />
                      ))}
                    </div>
                    <span className="font-vt text-sm text-fog/80">
                      {formatPlays(g.plays)} PLAYS
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 rounded-2xl border border-white/10 bg-panel/50 py-16 text-center">
            <p className="font-pixel text-sm text-fog">NO CARTRIDGES FOUND</p>
            <p className="mt-2 text-sm text-fog/60">
              No titles match "{search}" in {cat} category
            </p>
            <button
              onClick={() => {
                setCat("ALL");
                setSearch("");
              }}
              className="mt-6 rounded-xl border border-neon/40 bg-neon/10 px-5 py-2.5 font-pixel text-[9px] text-neon hover:bg-neon/20 cursor-pointer"
            >
              RESET FILTERS
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
