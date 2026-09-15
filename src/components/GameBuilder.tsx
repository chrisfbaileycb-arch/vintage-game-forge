import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Wrench,
  Play,
  Save,
  RotateCcw,
  Sliders,
  Palette,
  Layers,
  Volume2,
  VolumeX,
  Gamepad2,
  Trash2,
  UploadCloud,
  RefreshCw,
  Download,
  Upload,
} from "lucide-react";
import { GameCanvas } from "./GameCanvas";
import {
  PALETTE_OPTIONS,
  FRAME_OPTIONS,
  TWIST_OPTIONS,
  FINISH_OPTIONS,
  type MouldKind,
  type CartridgeSpec,
  type PaletteId,
  type FrameId,
  type TwistId,
  type FinishId,
  normalizeSpec,
} from "@/lib/game/moulds";
import { randomSeed } from "@/lib/game/rng";
import { downloadSystemRom, readSystemRomFile } from "@/lib/systemRom";
import {
  saveGameToFirestore,
  getUserGames,
  getPublishedGames,
  deleteGameFromFirestore,
  getLocalCreatorName,
  setLocalCreatorName,
  loginWithGoogle,
  logoutUser,
  onAuthUserChanged,
  getActiveCreatorIdentity,
  type FirebaseGame,
} from "@/lib/firebaseGames";
import type { ReplayGame, ConsoleCat } from "@/types/replay";
import { toast } from "sonner";

interface GameBuilderProps {
  onPlayInMainArcade?: (game: ReplayGame) => void;
}

const TEMPLATES: {
  mould: MouldKind;
  label: string;
  cat: Exclude<ConsoleCat, "ALL">;
  tagline: string;
  icon: string;
  defaultTitle: string;
  palette: PaletteId;
  twist: TwistId;
}[] = [
  {
    mould: "invaders",
    label: "Space Invaders",
    cat: "ARCADE",
    tagline: "Marching alien fleet, bunker shields & laser dogfight",
    icon: "👾",
    defaultTitle: "GALAXY DEFENDER '89",
    palette: "blueprint",
    twist: "none",
  },
  {
    mould: "breakout",
    label: "Brick Breaker",
    cat: "NES",
    tagline: "Paddle deflection, multi-tier destructible bricks & rebounds",
    icon: "🧱",
    defaultTitle: "NEON BREAKER",
    palette: "sepia",
    twist: "none",
  },
  {
    mould: "snake",
    label: "Neon Serpent",
    cat: "GB",
    tagline: "Classic grid snake, food pellets & precision turns",
    icon: "🐍",
    defaultTitle: "CYBER OROBOROS",
    palette: "emerald",
    twist: "none",
  },
  {
    mould: "burrower",
    label: "Dungeon Excavator",
    cat: "SNES",
    tagline: "Dig shafts, gather underground gems & dodge falling rocks",
    icon: "⛏️",
    defaultTitle: "DEEP DELVER",
    palette: "cabinet",
    twist: "none",
  },
  {
    mould: "scaffolding",
    label: "Cyber Platformer",
    cat: "GENESIS",
    tagline: "Ladder climbs, structural platforms & hazard leaps",
    icon: "🏃",
    defaultTitle: "SHADOW RUNNER",
    palette: "nocturne",
    twist: "none",
  },
  {
    mould: "stacker",
    label: "Block Stacker",
    cat: "ARCADE",
    tagline: "Precision timing, oscillating blocks & skyscraper builds",
    icon: "🏗️",
    defaultTitle: "TOWER MASTER",
    palette: "blueprint",
    twist: "none",
  },
  {
    mould: "crossing",
    label: "Frog Crossing",
    cat: "NES",
    tagline: "High-speed traffic lanes, floating log river navigation",
    icon: "🐸",
    defaultTitle: "METRO LEAP",
    palette: "sepia",
    twist: "none",
  },
  {
    mould: "flyer",
    label: "Star Flyer",
    cat: "SNES",
    tagline: "Supersonic thruster navigation, asteroid dodging & warp gates",
    icon: "🚀",
    defaultTitle: "HYPER THRUST",
    palette: "nocturne",
    twist: "none",
  },
];

export default function GameBuilder({ onPlayInMainArcade }: GameBuilderProps) {
  // Active Cartridge Editor State
  const [activeTab, setActiveTab] = useState<"mechanics" | "visuals" | "meta" | "cloud">("mechanics");
  const [mould, setMould] = useState<MouldKind>("invaders");
  const [title, setTitle] = useState("CYBER TITAN '92");
  const [description, setDescription] = useState("Custom arcade cartridge dialed in REPLAY Studio.");
  const [category, setCategory] = useState<Exclude<ConsoleCat, "ALL">>("ARCADE");
  const [creatorName, setCreatorName] = useState(() => getLocalCreatorName());

  // Engine Dials
  const [pace, setPace] = useState(3);
  const [gridDensity, setGridDensity] = useState(4);
  const [brickRows, setBrickRows] = useState(5);
  const [handling, setHandling] = useState(3);
  const [hazards, setHazards] = useState(2);
  const [tokens, setTokens] = useState(3);
  const [twist, setTwist] = useState<TwistId>("none");

  // Visuals & Audio
  const [palette, setPalette] = useState<PaletteId>("blueprint");
  const [frame, setFrame] = useState<FrameId>("engraved");
  const [finish, setFinish] = useState<FinishId>("electric");
  const [bells, setBells] = useState(true);
  const [hue, setHue] = useState(0);
  const [seed, setSeed] = useState(() => randomSeed());

  // Cloud & Local State
  const [authIdentity, setAuthIdentity] = useState(() => getActiveCreatorIdentity());
  const [saving, setSaving] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [published, setPublished] = useState(true);
  const [cloudSubTab, setCloudSubTab] = useState<"mine" | "community">("mine");
  const [currentCartridgeId, setCurrentCartridgeId] = useState<string | null>(null);
  const [userGames, setUserGames] = useState<FirebaseGame[]>([]);
  const [communityGames, setCommunityGames] = useState<FirebaseGame[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [keyCounter, setKeyCounter] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build live CartridgeSpec
  const activeSpec: CartridgeSpec = useMemo(() => {
    return normalizeSpec({
      title,
      description,
      mould,
      pace,
      gridDensity,
      brickRows,
      handling,
      hazards,
      tokens,
      twist,
      palette,
      frame,
      finish,
      bells,
      hue,
      seed,
    });
  }, [
    title,
    description,
    mould,
    pace,
    gridDensity,
    brickRows,
    handling,
    hazards,
    tokens,
    twist,
    palette,
    frame,
    finish,
    bells,
    hue,
    seed,
  ]);

  // Export current cartridge as a downloadable .replay system file
  const handleExportRom = () => {
    downloadSystemRom({
      title,
      spec: activeSpec,
      cat: category,
      description,
      creatorName,
    });
  };

  // Import a .replay / JSON system file from disk
  const handleImportRom = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const loaded = await readSystemRomFile(file);
      if (loaded.cartridgeSpec) {
        setTitle(loaded.title);
        if (loaded.description) setDescription(loaded.description);
        if (loaded.cat) setCategory(loaded.cat);
        if (loaded.creatorName) setCreatorName(loaded.creatorName);
        const s = loaded.cartridgeSpec;
        setMould(s.mould);
        setPace(s.pace ?? 3);
        setGridDensity(s.gridDensity ?? 3);
        setBrickRows(s.brickRows ?? 5);
        setHandling(s.handling ?? 3);
        setHazards(s.hazards ?? 2);
        setTokens(s.tokens ?? 3);
        setTwist(s.twist ?? "none");
        setPalette(s.palette ?? "blueprint");
        setFrame(s.frame ?? "engraved");
        setFinish(s.finish ?? "electric");
        setBells(s.bells ?? true);
        setHue(s.hue ?? 0);
        setSeed(s.seed ?? randomSeed());
        setKeyCounter((k) => k + 1);
        toast.success(`System cartridge "${loaded.title}" imported into Studio!`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load system file.");
    } finally {
      e.target.value = "";
    }
  };

  // Load user & community games from Firestore
  const refreshCloudGames = useCallback(async () => {
    setLoadingCloud(true);
    try {
      const [mine, comm] = await Promise.all([
        getUserGames(),
        getPublishedGames(),
      ]);
      setUserGames(mine);
      setCommunityGames(comm);
    } catch (err) {
      console.warn("Error loading cloud games:", err);
    } finally {
      setLoadingCloud(false);
    }
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsub = onAuthUserChanged((user) => {
      const ident = getActiveCreatorIdentity();
      setAuthIdentity(ident);
      if (user?.displayName) {
        setCreatorName(user.displayName);
      }
      refreshCloudGames();
    });
    return () => unsub();
  }, [refreshCloudGames]);

  // Initial load of games
  useEffect(() => {
    refreshCloudGames();
  }, [refreshCloudGames]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    try {
      const user = await loginWithGoogle();
      toast.success(`Welcome back, pilot ${user.displayName || user.email}!`);
      setAuthIdentity(getActiveCreatorIdentity());
      if (user.displayName) setCreatorName(user.displayName);
      refreshCloudGames();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("popup-closed-by-user")) {
        console.error("Google sign in failed:", err);
        toast.error("Google login cancelled or unavailable.");
      }
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await logoutUser();
      setAuthIdentity(getActiveCreatorIdentity());
      toast.success("Signed out to Guest Pilot mode.");
      refreshCloudGames();
    } catch (err) {
      console.error(err);
    }
  };

  // Load template preset
  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    setMould(tpl.mould);
    setTitle(tpl.defaultTitle);
    setCategory(tpl.cat);
    setPalette(tpl.palette);
    setTwist(tpl.twist);
    setSeed(randomSeed());
    setKeyCounter((k) => k + 1);
    toast.success(`Loaded ${tpl.label} template.`);
  };

  // Load an existing game into the editor
  const loadGameIntoEditor = (game: FirebaseGame) => {
    setCurrentCartridgeId(game.id);
    setTitle(game.title);
    setDescription(game.description || "");
    setMould(game.mould);
    setCategory(game.category || "ARCADE");
    if (game.spec) {
      setPace(game.spec.pace ?? 3);
      setGridDensity(game.spec.gridDensity ?? 4);
      setBrickRows(game.spec.brickRows ?? 5);
      setHandling(game.spec.handling ?? 3);
      setHazards(game.spec.hazards ?? 2);
      setTokens(game.spec.tokens ?? 3);
      setTwist(game.spec.twist ?? "none");
      setPalette(game.spec.palette ?? "blueprint");
      setFrame(game.spec.frame ?? "engraved");
      setFinish(game.spec.finish ?? "electric");
      setBells(game.spec.bells ?? true);
      setHue(game.spec.hue ?? 0);
      setSeed(game.spec.seed ?? randomSeed());
    }
    setPublished(game.published ?? true);
    setKeyCounter((k) => k + 1);
    toast.success(`Loaded "${game.title}" into the Studio.`);
  };

  // Save Cartridge to Firestore
  const handleSaveToCloud = async (isPublic = true) => {
    setSaving(true);
    try {
      setLocalCreatorName(creatorName);
      const saved = await saveGameToFirestore({
        id: currentCartridgeId || undefined,
        title,
        description,
        mould,
        category,
        palette,
        spec: activeSpec,
        published: isPublic,
      });

      setCurrentCartridgeId(saved.id);
      setPublished(isPublic);
      toast.success(
        isPublic
          ? `Cartridge "${saved.title}" saved & published to Firebase cloud!`
          : `Cartridge "${saved.title}" saved privately.`
      );
      refreshCloudGames();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save cartridge to Firebase.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Cartridge from Firestore
  const handleDelete = async (gameId: string) => {
    if (!confirm("Delete this cartridge from Firebase?")) return;
    try {
      await deleteGameFromFirestore(gameId);
      toast.success("Cartridge deleted.");
      if (currentCartridgeId === gameId) {
        setCurrentCartridgeId(null);
      }
      refreshCloudGames();
    } catch {
      toast.error("Failed to delete cartridge.");
    }
  };

  // Send to Main Arcade Cabinet
  const handlePlayInArcade = () => {
    if (!onPlayInMainArcade) return;
    const replayCartridge: ReplayGame = {
      id: currentCartridgeId || `custom_${Date.now()}`,
      title: title || "CUSTOM CARTRIDGE",
      cat: category,
      year: 1990,
      rating: 5,
      plays: 1,
      description: description || "Built in REPLAY Game Studio",
      accentColor: "#2ee6ff",
      themeColors: ["#2ee6ff", "#ff2e88", "#ffd23f", "#35f2a8"],
      cartridgeSpec: activeSpec,
      creatorName,
    };

    onPlayInMainArcade(replayCartridge);
    const arcadeEl = document.getElementById("arcade");
    if (arcadeEl) {
      arcadeEl.scrollIntoView({ behavior: "smooth" });
    }
    toast.success(`Cartridge "${title}" loaded into Main Arcade!`);
  };

  return (
    <section id="builder" className="relative border-b border-white/8 bg-ink/90 py-20">
      {/* Blueprint grid background */}
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-arc/40 bg-arc/10 px-3.5 py-1 text-xs font-mono text-arc">
            <Wrench className="h-3.5 w-3.5" />
            CARTRIDGE FOUNDRY & GAME STUDIO
          </div>
          <h2 className="mt-4 font-pixel text-2xl tracking-tight sm:text-3xl lg:text-4xl">
            DEVELOP &amp; PLAY <span className="text-arc">RETRO GAMES</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-fog sm:text-base">
            Select a classic engine mould, dial in game physics &amp; hazards, customize CRT colorways, and test play live. Cartridges deploy directly to the Firebase arcade cloud.
          </p>
        </div>

        {/* Template Quick Select Bar */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-xs text-fog uppercase tracking-wider">
              1. Choose Starting Engine Mould
            </span>
            <span className="font-mono text-xs text-arc">
              Active: <strong className="text-paper">{mould.toUpperCase()}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {TEMPLATES.map((tpl) => {
              const active = mould === tpl.mould;
              return (
                <button
                  key={tpl.mould}
                  onClick={() => applyTemplate(tpl)}
                  className={`group relative flex flex-col items-center rounded-xl border p-3 text-center transition-all ${
                    active
                      ? "border-arc bg-arc/15 shadow-[0_0_20px_rgba(46,230,255,0.25)]"
                      : "border-white/10 bg-panel/60 hover:border-white/25 hover:bg-panel"
                  }`}
                >
                  <span className="text-2xl transition-transform group-hover:scale-110">
                    {tpl.icon}
                  </span>
                  <span className="mt-1.5 font-pixel text-[9px] text-paper">
                    {tpl.label}
                  </span>
                  <span className="mt-1 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] text-fog">
                    {tpl.cat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Studio Workspace: 2-Column Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Editor Controls & Dials (7 cols) */}
          <div className="rounded-2xl border border-white/12 bg-panel/80 p-5 backdrop-blur-xl lg:col-span-7">
            {/* Editor Tabs */}
            <div className="mb-6 flex border-b border-white/10">
              <button
                onClick={() => setActiveTab("mechanics")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                  activeTab === "mechanics"
                    ? "border-arc text-arc font-semibold"
                    : "border-transparent text-fog hover:text-paper"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Mechanics & Dials
              </button>
              <button
                onClick={() => setActiveTab("visuals")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                  activeTab === "visuals"
                    ? "border-arc text-arc font-semibold"
                    : "border-transparent text-fog hover:text-paper"
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                CRT Visuals & Audio
              </button>
              <button
                onClick={() => setActiveTab("meta")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                  activeTab === "meta"
                    ? "border-arc text-arc font-semibold"
                    : "border-transparent text-fog hover:text-paper"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Cartridge Info
              </button>
              <button
                onClick={() => setActiveTab("cloud")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                  activeTab === "cloud"
                    ? "border-neon text-neon font-semibold"
                    : "border-transparent text-fog hover:text-paper"
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Cloud Cartridges ({userGames.length})
              </button>
            </div>

            {/* Tab 1: Mechanics */}
            {activeTab === "mechanics" && (
              <div className="space-y-5">
                {/* Dial: Pace / Speed */}
                <div className="rounded-xl border border-white/8 bg-ink/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-pixel text-xs text-paper">GAME SPEED / PACE</div>
                      <div className="text-xs text-fog">Master clock velocity and reflex demand</div>
                    </div>
                    <span className="font-mono text-base font-bold text-arc">Level {pace}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={pace}
                    onChange={(e) => setPace(Number(e.target.value))}
                    className="mt-3 w-full accent-arc cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-fog">
                    <span>1 Gentle</span>
                    <span>3 Standard</span>
                    <span>5 Ludicrous</span>
                  </div>
                </div>

                {/* Dial: Handling & Physics */}
                <div className="rounded-xl border border-white/8 bg-ink/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-pixel text-xs text-paper">HANDLING & AGILITY</div>
                      <div className="text-xs text-fog">Paddle width, jump impulse, and maneuverability</div>
                    </div>
                    <span className="font-mono text-base font-bold text-arc">{handling}/9</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={1}
                    value={handling}
                    onChange={(e) => setHandling(Number(e.target.value))}
                    className="mt-3 w-full accent-arc cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-fog">
                    <span>Rigid</span>
                    <span>Responsive</span>
                    <span>Hyper-Agile</span>
                  </div>
                </div>

                {/* Dial: Hazards & Traps */}
                <div className="rounded-xl border border-white/8 bg-ink/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-pixel text-xs text-paper">HAZARDS & HOSTILES</div>
                      <div className="text-xs text-fog">Boulders, enemy lasers, spikes, and traps</div>
                    </div>
                    <span className="font-mono text-base font-bold text-neon">{hazards}/9</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={1}
                    value={hazards}
                    onChange={(e) => setHazards(Number(e.target.value))}
                    className="mt-3 w-full accent-neon cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-fog">
                    <span>Peaceful (0)</span>
                    <span>Standard (2)</span>
                    <span>Bullet Hell (9)</span>
                  </div>
                </div>

                {/* Dual Sliders: Grid Density & Tokens */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/8 bg-ink/40 p-3.5">
                    <div className="flex justify-between font-pixel text-[10px] text-paper">
                      <span>GRID / FORMATION</span>
                      <span className="font-mono text-arc">{gridDensity}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={9}
                      value={gridDensity}
                      onChange={(e) => setGridDensity(Number(e.target.value))}
                      className="mt-2.5 w-full accent-arc cursor-pointer"
                    />
                    <div className="mt-1 font-mono text-[9px] text-fog">Columns & Corridor Size</div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-ink/40 p-3.5">
                    <div className="flex justify-between font-pixel text-[10px] text-paper">
                      <span>HOUSE TOKENS</span>
                      <span className="font-mono text-yellow-400">{tokens}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={9}
                      value={tokens}
                      onChange={(e) => setTokens(Number(e.target.value))}
                      className="mt-2.5 w-full accent-yellow-400 cursor-pointer"
                    />
                    <div className="mt-1 font-mono text-[9px] text-fog">Bonus power-ups & drops</div>
                  </div>
                </div>

                {/* Gameplay Twist */}
                <div className="rounded-xl border border-white/8 bg-ink/40 p-4">
                  <div className="font-pixel text-xs text-paper mb-2">SPECIAL RULE MODIFIER (TWIST)</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {TWIST_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTwist(t.id)}
                        className={`rounded-lg border p-2 text-left transition-all ${
                          twist === t.id
                            ? "border-arc bg-arc/15 text-paper"
                            : "border-white/8 bg-panel/40 text-fog hover:border-white/20 hover:text-paper"
                        }`}
                      >
                        <div className="font-mono text-xs font-semibold">{t.label}</div>
                        <div className="text-[10px] text-fog truncate">{t.hint}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Visuals & Sound */}
            {activeTab === "visuals" && (
              <div className="space-y-5">
                {/* Palette Selection */}
                <div>
                  <div className="mb-2 font-pixel text-xs text-paper">CRT PHOSPHOR PALETTE</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PALETTE_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPalette(p.id)}
                        className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                          palette === p.id
                            ? "border-arc bg-arc/15 shadow-[0_0_15px_rgba(46,230,255,0.2)]"
                            : "border-white/8 bg-panel/40 text-fog hover:border-white/20 hover:text-paper"
                        }`}
                      >
                        <span className="font-mono text-xs font-bold text-paper">{p.label}</span>
                        <span className="text-[10px] text-fog">{p.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spectrum Hue Shifter */}
                <div className="rounded-xl border border-white/8 bg-ink/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-pixel text-xs text-paper">SPECTRUM HUE ROTATION</div>
                      <div className="text-xs text-fog">Rotate the whole phosphor color wheel</div>
                    </div>
                    <span className="font-mono text-sm text-arc">{hue}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={345}
                    step={15}
                    value={hue}
                    onChange={(e) => setHue(Number(e.target.value))}
                    className="mt-3 w-full accent-arc cursor-pointer"
                  />
                  <div className="mt-1 flex justify-between font-mono text-[9px] text-fog">
                    <span>0° Original</span>
                    <span>180° Inverted</span>
                    <span>345° Crimson</span>
                  </div>
                </div>

                {/* Bezel Frame & Finish */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/8 bg-ink/40 p-3.5">
                    <div className="font-pixel text-[10px] text-paper mb-2">CABINET FRAME</div>
                    <select
                      value={frame}
                      onChange={(e) => setFrame(e.target.value as FrameId)}
                      aria-label="Cabinet Frame"
                      className="w-full rounded-lg border border-white/12 bg-panel px-3 py-2 font-mono text-xs text-paper focus:border-arc focus:outline-none"
                    >
                      {FRAME_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id} className="bg-panel text-paper">
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-ink/40 p-3.5">
                    <div className="font-pixel text-[10px] text-paper mb-2">SCREEN FINISH</div>
                    <select
                      value={finish}
                      onChange={(e) => setFinish(e.target.value as FinishId)}
                      aria-label="Screen Finish"
                      className="w-full rounded-lg border border-white/12 bg-panel px-3 py-2 font-mono text-xs text-paper focus:border-arc focus:outline-none"
                    >
                      {FINISH_OPTIONS.map((fi) => (
                        <option key={fi.id} value={fi.id} className="bg-panel text-paper">
                          {fi.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Audio Engine */}
                <div className="rounded-xl border border-white/8 bg-ink/40 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-pixel text-xs text-paper">CHIPTUNE FOUNDRY BELLS</div>
                      <div className="text-xs text-fog">Pitched square-wave acoustic chimes on events</div>
                    </div>
                    <button
                      onClick={() => setBells(!bells)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs ${
                        bells
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                          : "border-white/10 bg-panel text-fog"
                      }`}
                    >
                      {bells ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                      {bells ? "ENABLED" : "MUTED"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Metadata & Publisher */}
            {activeTab === "meta" && (
              <div className="space-y-4">
                <div>
                  <label className="block font-pixel text-[10px] text-paper mb-1">
                    CARTRIDGE TITLE
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={32}
                    placeholder="e.g. CYBER SHIFT '91"
                    className="w-full rounded-xl border border-white/12 bg-ink/70 px-4 py-2.5 font-mono text-sm text-paper focus:border-arc focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-pixel text-[10px] text-paper mb-1">
                    DESCRIPTION / ARCADE LORE
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    maxLength={140}
                    placeholder="Short description of your game..."
                    className="w-full rounded-xl border border-white/12 bg-ink/70 px-4 py-2 font-mono text-xs text-paper focus:border-arc focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-pixel text-[10px] text-paper mb-1">
                      CONSOLE ERA TAG
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as Exclude<ConsoleCat, "ALL">)}
                      aria-label="Console Era Tag"
                      className="w-full rounded-xl border border-white/12 bg-panel px-3 py-2 font-mono text-xs text-paper focus:border-arc focus:outline-none"
                    >
                      <option value="NES">NES (8-Bit Famicom)</option>
                      <option value="SNES">SNES (16-Bit Super)</option>
                      <option value="GENESIS">SEGA GENESIS</option>
                      <option value="ARCADE">ARCADE COIN-OP</option>
                      <option value="GB">GAME BOY (Dot Matrix)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-pixel text-[10px] text-paper mb-1">
                      CREATOR HANDLE
                    </label>
                    <input
                      type="text"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      maxLength={16}
                      placeholder="Your arcade handle"
                      className="w-full rounded-xl border border-white/12 bg-ink/70 px-3 py-2 font-mono text-xs text-paper focus:border-arc focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-panel/50 p-3.5">
                  <div>
                    <span className="font-pixel text-[10px] text-paper block">PUBLISH TO ARCADE FLOOR</span>
                    <span className="font-mono text-[10px] text-fog">Make your custom cartridge publicly discoverable in the community vault.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublished(!published)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${published ? "bg-arc" : "bg-white/15"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${published ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>

                <div className="rounded-xl border border-arc/20 bg-arc/5 p-4 text-xs text-fog">
                  <div className="font-mono text-arc font-semibold mb-1">Firebase Cloud Cartridge</div>
                  All custom cartridges are backed by Google Cloud Firestore with real-time replication. Saving your game grants an immortal permanent cartridge playable in the browser.
                </div>
              </div>
            )}

            {/* Tab 4: Cloud Cartridges */}
            {activeTab === "cloud" && (
              <div className="space-y-4">
                {/* Pilot Account Status Card */}
                <div className="rounded-xl border border-white/10 bg-panel/60 p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-arc/15 border border-arc/30 flex items-center justify-center font-pixel text-xs text-arc">
                      {authIdentity.isGoogle ? (authIdentity.name.slice(0, 2).toUpperCase()) : "G"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-pixel text-[11px] text-paper">{authIdentity.name}</span>
                        <span className={`rounded px-1.5 py-0.2 font-mono text-[9px] ${authIdentity.isGoogle ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/10 text-fog"}`}>
                          {authIdentity.isGoogle ? "Google Pilot" : "Guest Pilot"}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-fog">
                        {authIdentity.isGoogle
                          ? authIdentity.email || "Cartridges linked to Google account"
                          : "Cartridges saved locally & to Firestore cloud"}
                      </p>
                    </div>
                  </div>

                  <div>
                    {authIdentity.isGoogle ? (
                      <button
                        onClick={handleSignOut}
                        className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono text-xs text-fog hover:text-paper hover:bg-white/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <button
                        onClick={handleGoogleLogin}
                        disabled={loggingIn}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-arc/40 bg-arc/15 px-3 py-1.5 font-mono text-xs text-arc hover:bg-arc/25 transition-colors disabled:opacity-50"
                      >
                        {loggingIn ? "Connecting..." : "Sign in with Google"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCloudSubTab("mine")}
                      className={`rounded-lg px-2.5 py-1 font-mono text-xs uppercase transition-colors ${
                        cloudSubTab === "mine"
                          ? "bg-arc text-ink font-bold"
                          : "bg-panel text-fog hover:text-paper"
                      }`}
                    >
                      My Cartridges ({userGames.length})
                    </button>
                    <button
                      onClick={() => setCloudSubTab("community")}
                      className={`rounded-lg px-2.5 py-1 font-mono text-xs uppercase transition-colors ${
                        cloudSubTab === "community"
                          ? "bg-arc text-ink font-bold"
                          : "bg-panel text-fog hover:text-paper"
                      }`}
                    >
                      Arcade Community ({communityGames.length})
                    </button>
                  </div>
                  <button
                    onClick={refreshCloudGames}
                    disabled={loadingCloud}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-panel px-2.5 py-1 text-xs text-fog hover:text-paper"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingCloud ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                {cloudSubTab === "mine" ? (
                  userGames.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
                      <Gamepad2 className="mx-auto h-8 w-8 text-fog/40" />
                      <p className="mt-2 font-pixel text-xs text-paper">NO CLOUD CARTRIDGES YET</p>
                      <p className="mt-1 text-xs text-fog">
                        Tune your dials on the left and click &quot;Save to Firebase&quot; to build your first game.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {userGames.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between rounded-xl border border-white/8 bg-ink/60 p-3 transition-colors hover:border-arc/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-pixel text-xs text-paper truncate">
                                {g.title}
                              </span>
                              <span className="rounded bg-arc/20 px-1.5 py-0.5 font-mono text-[9px] text-arc">
                                {g.mould}
                              </span>
                            </div>
                            <p className="text-[11px] text-fog truncate">{g.description}</p>
                          </div>
                          <div className="ml-3 flex items-center gap-1.5">
                            <button
                              onClick={() => downloadSystemRom(g)}
                              className="rounded-lg p-1.5 text-fog hover:bg-arc/20 hover:text-arc"
                              title="Download system file (.replay)"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => loadGameIntoEditor(g)}
                              className="rounded-lg border border-arc/40 bg-arc/15 px-2.5 py-1 font-mono text-xs text-arc hover:bg-arc/25"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleDelete(g.id)}
                              className="rounded-lg p-1.5 text-fog hover:bg-red-500/20 hover:text-red-400"
                              title="Delete game"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  communityGames.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
                      <Gamepad2 className="mx-auto h-8 w-8 text-fog/40" />
                      <p className="mt-2 font-pixel text-xs text-paper">NO COMMUNITY GAMES FOUND</p>
                      <p className="mt-1 text-xs text-fog">
                        Be the first to publish a cartridge to the arcade floor!
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                      {communityGames.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between rounded-xl border border-white/8 bg-ink/60 p-3 transition-colors hover:border-neon/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-pixel text-xs text-paper truncate">
                                {g.title}
                              </span>
                              <span className="rounded bg-neon/20 px-1.5 py-0.5 font-mono text-[9px] text-neon">
                                by {g.creatorName || "Arcade Pilot"}
                              </span>
                            </div>
                            <p className="text-[11px] text-fog truncate">{g.description}</p>
                          </div>
                          <div className="ml-3 flex items-center gap-1.5">
                            <button
                              onClick={() => downloadSystemRom(g)}
                              className="rounded-lg p-1.5 text-fog hover:bg-arc/20 hover:text-arc"
                              title="Download system file (.replay)"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => loadGameIntoEditor(g)}
                              className="rounded-lg border border-arc/40 bg-arc/15 px-2.5 py-1 font-mono text-xs text-arc hover:bg-arc/25"
                            >
                              Inspect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Hidden ROM File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".replay,.retro,.json"
              className="hidden"
              onChange={handleImportRom}
            />

            {/* Quick Actions Footer */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5 border-t border-white/10 pt-4">
              <button
                onClick={() => handleSaveToCloud(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-neon px-4 py-2.5 font-pixel text-[10px] text-ink transition-colors hover:bg-arc disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    SAVE TO FIREBASE
                  </>
                )}
              </button>

              <button
                onClick={handleExportRom}
                className="inline-flex items-center gap-2 rounded-xl border border-arc/40 bg-arc/15 px-3.5 py-2.5 font-mono text-xs text-arc transition-colors hover:bg-arc hover:text-ink cursor-pointer"
                title="Download current cartridge as standalone .replay system file"
              >
                <Download className="h-3.5 w-3.5" />
                DOWNLOAD ROM (.replay)
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 font-mono text-xs text-fog hover:border-white/30 hover:text-paper transition-colors cursor-pointer"
                title="Import a system file (.replay) from disk"
              >
                <Upload className="h-3.5 w-3.5" />
                LOAD FILE
              </button>

              <button
                onClick={handlePlayInArcade}
                className="inline-flex items-center gap-2 rounded-xl border border-arc/50 bg-arc/10 px-4 py-2.5 font-pixel text-[10px] text-arc transition-colors hover:bg-arc hover:text-ink"
              >
                <Play className="h-3.5 w-3.5" />
                PLAY IN MAIN CABINET
              </button>

              <button
                onClick={() => {
                  setSeed(randomSeed());
                  setKeyCounter((k) => k + 1);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-panel px-3.5 py-2.5 font-mono text-xs text-fog hover:text-paper"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Randomize Seed
              </button>
            </div>
          </div>

          {/* Right Column: Live Interactive CRT Test Bench (5 cols) */}
          <div className="flex flex-col items-center rounded-2xl border border-white/12 bg-ink/95 p-5 backdrop-blur-xl lg:col-span-5">
            <div className="mb-3 flex w-full items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-pixel text-xs text-paper">LIVE CRT TEST BENCH</span>
              </div>
              <span className="font-mono text-xs text-arc">
                60 FPS • {mould.toUpperCase()}
              </span>
            </div>

            {/* Test Screen Frame */}
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-arc/40 bg-black p-2 shadow-[0_0_30px_rgba(46,230,255,0.2)]">
              {/* Scanline CRT overlay */}
              <div className="scanlines pointer-events-none absolute inset-0 z-20 opacity-35" />
              <div className="crt-vignette pointer-events-none absolute inset-0 z-25" />

              {/* GameCanvas Engine Instance */}
              <div className="relative z-10 w-[320px] max-w-full sm:w-[360px]">
                <GameCanvas
                  key={`workbench_${mould}_${keyCounter}`}
                  spec={activeSpec}
                  className="rounded-lg shadow-inner"
                  showHud={true}
                />
              </div>
            </div>

            {/* Control Instructions */}
            <div className="mt-4 w-full rounded-xl border border-white/8 bg-panel/40 p-3 text-center">
              <p className="font-mono text-xs text-fog">
                <span className="text-arc font-bold">CONTROLS:</span> Use <strong className="text-paper">Arrow Keys / WASD</strong> to steer, <strong className="text-paper">Spacebar</strong> to fire/action, <strong className="text-paper">P</strong> to pause.
              </p>
            </div>

            {/* Live Spec Metrics Badge */}
            <div className="mt-3 flex w-full justify-around rounded-xl border border-white/5 bg-panel/30 py-2 font-mono text-[11px] text-fog">
              <span>Pace: <strong className="text-paper">{pace}x</strong></span>
              <span>Hazards: <strong className="text-neon">{hazards}</strong></span>
              <span>Palette: <strong className="text-arc">{palette}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
