import { GameCanvas } from "@/components/GameCanvas";
import { LogoDropdown } from "@/components/LogoDropdown";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { cabinet } from "@/lib/cabinet";
import { DIAL_INFO, rateSpec } from "@/lib/game/dials";
import {
  DIAL_RANGES,
  FINISH_OPTIONS,
  FRAME_OPTIONS,
  MOULD_BASE_PACE,
  MOULD_OPTIONS,
  PALETTE_OPTIONS,
  SPECTRUM_STEPS,
  TOKEN_META,
  TWIST_OPTIONS,
  type CartridgeSpec,
  type FinishId,
  type FrameId,
  type MouldKind,
  type PaletteId,
  type TwistId,
} from "@/lib/game/moulds";
import { PATTERNS, type PatternEntry } from "@/lib/game/patterns";
import { randomSeed } from "@/lib/game/rng";
import { useMutation } from "convex/react";
import { AlertTriangle, Factory, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBlocker, useLocation, useNavigate, useBeforeUnload } from "react-router";
import { toast } from "sonner";

interface Live {
  title: string;
  description: string;
  mould: MouldKind;
  pace: number;
  gridDensity: number;
  brickRows: number;
  handling: number;
  hazards: number;
  palette: PaletteId;
  frame: FrameId;
  twist: TwistId;
  finish: FinishId;
  tokens: number;
  bells: boolean;
  hue: number;
  seed: number;
}

function defaultLive(mould: MouldKind): Live {
  return {
    title: "Untitled Pressing",
    description: "",
    mould,
    pace: MOULD_BASE_PACE[mould],
    gridDensity: 5,
    brickRows: 4,
    handling: 2,
    hazards: 2,
    palette: "sepia",
    frame: "plaque",
    twist: "none",
    finish: "matte",
    tokens: 2,
    bells: false,
    hue: 0,
    seed: randomSeed(),
  };
}

function liveToSpec(l: Live): CartridgeSpec {
  return {
    title: l.title.trim() || "Untitled Pressing",
    description: l.description.trim().slice(0, 140),
    mould: l.mould,
    pace: l.pace,
    gridDensity: l.gridDensity,
    brickRows: l.brickRows,
    handling: l.handling,
    hazards: l.hazards,
    palette: l.palette,
    frame: l.frame,
    twist: l.twist,
    finish: l.finish,
    tokens: l.tokens,
    bells: l.bells,
    hue: l.hue,
    seed: l.seed >>> 0,
    schemaVersion: 2,
  };
}

function specToLive(s: CartridgeSpec): Live {
  return {
    title: s.title,
    description: s.description ?? "",
    mould: s.mould,
    pace: s.pace,
    gridDensity: s.gridDensity,
    brickRows: s.brickRows,
    handling: s.handling,
    hazards: s.hazards,
    palette: s.palette,
    frame: s.frame,
    twist: s.twist,
    finish: s.finish,
    tokens: s.tokens,
    bells: s.bells,
    hue: s.hue ?? 0,
    seed: s.seed ?? 1,
  };
}

function range(min: number, max: number): number[] {
  const out: number[] = [];
  for (let n = min; n <= max; n++) out.push(n);
  return out;
}

/** Numeric dials, rendered as sliders with per-mould ranges and effect hints. */
const NUMERIC_DIALS: {
  key: "pace" | "gridDensity" | "brickRows" | "handling" | "hazards" | "tokens";
  infoKey: string;
  rangeFor: (mould: MouldKind) => { min: number; max: number };
  label: string;
}[] = [
  { key: "pace", infoKey: "pace", label: "Pressing speed", rangeFor: () => ({ min: 1, max: 5 }) },
  { key: "brickRows", infoKey: "brickRows", label: "Brick rows", rangeFor: (m) => (m === "breakout" ? { min: 3, max: 9 } : { min: 0, max: 0 }) },
  { key: "gridDensity", infoKey: "gridDensity", label: "Board density", rangeFor: (m) => (["snake", "invaders", "maze", "burrower"].includes(m) ? { min: 0, max: 9 } : { min: 0, max: 0 }) },
  { key: "handling", infoKey: "handling", label: "Handling", rangeFor: (m) => ({ min: 0, max: DIAL_RANGES.handling.byMould[m] }) },
  { key: "hazards", infoKey: "hazards", label: "Extra fixtures", rangeFor: () => ({ min: 0, max: 9 }) },
  { key: "tokens", infoKey: "tokens", label: "House tokens", rangeFor: () => ({ min: 0, max: DIAL_RANGES.tokens.max }) },
];

export default function Studio() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const press = useMutation(api.games.press);
  const remaster = useMutation(api.games.remaster);

  const routeState = (location.state as
    | {
        remaster?: {
          spec: CartridgeSpec;
          mould: MouldKind;
          title: string;
          id?: string;
        };
        pattern?: CartridgeSpec;
      }
    | null);
  const remasterJob = routeState?.remaster;
  const patternJob = routeState?.pattern;

  const [live, setLive] = useState<Live>(() => {
    if (remasterJob) return specToLive(remasterJob.spec);
    if (patternJob) return specToLive(patternJob);
    return defaultLive("breakout");
  });
  const [pressing, setPressing] = useState(false);

  // Job state is read once at mount; afterwards the studio belongs to the maker.
  const hasJob = Boolean(remasterJob || patternJob);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (hasJob) setDirty(false);
  }, [hasJob]);

  const spec = useMemo(() => liveToSpec(live), [live]);
  const rating = useMemo(() => rateSpec(spec), [spec]);
  const activeMould = MOULD_OPTIONS.find((m) => m.id === live.mould)!;

  function update<K extends keyof Live>(key: K, value: Live[K]) {
    setLive((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleMouldChange(id: string) {
    const mould = id as MouldKind;
    setLive((prev) => ({
      ...prev,
      mould,
      pace: MOULD_BASE_PACE[mould],
      handling: Math.min(prev.handling, DIAL_RANGES.handling.byMould[mould]),
    }));
    setDirty(true);
  }

  function loadPattern(entry: PatternEntry) {
    setLive(specToLive(entry.spec));
    setDirty(true);
    toast.success(`Pattern loaded: ${entry.name}`);
  }

  function handleReseed() {
    update("seed", randomSeed());
  }

  // Warn before leaving with unsaved work (tab close / external nav).
  useBeforeUnload((e) => {
    if (dirty) e.preventDefault();
  });

  // In-app navigation guard via react-router's blocker.
  const blocker = useBlocker(dirty ? () => true : false);

  async function saveToCabinet() {
    const saved = cabinet.saveCartridge({ title: live.title, spec });
    toast.success("Filed in your local cabinet.", {
      description: `${saved.title} — kept in this browser.`,
    });
    setDirty(false);
  }

  async function handlePress() {
    setPressing(true);
    try {
      if (remasterJob?.id) {
        // Remastering stays on the authenticated path.
        await remaster({ id: remasterJob.id as never, spec, title: live.title });
      } else {
        await press({ title: live.title, spec });
      }
      toast.success("Cartridge pressed and sealed.", {
        description: "It has been filed in your Workshop catalogue.",
      });
      setDirty(false);
      navigate("/workshop");
    } catch (error) {
      console.error(error);
      // Honest fallback: keep the press in the local cabinet instead of losing it.
      const saved = cabinet.saveCartridge({ title: live.title, spec });
      toast.error("The press jammed — your work is safe in the local cabinet.", {
        description: `${saved.title} will survive this visit.`,
      });
      setDirty(false);
    } finally {
      setPressing(false);
    }
  }


  return (
    <div className="paper-texture min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <SiteNav subtitle="DESIGN STUDIO" />

        <div className="rule-double" />

        <section className="grid gap-8 py-10 lg:grid-cols-[1.15fr_1fr]">
          {/* Left column: the dials */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="small-caps text-sm text-muted-foreground">
                Stage II — the dials
              </p>
              <h1 className="engraved mt-1 text-3xl font-semibold">
                Set the mould
              </h1>
              <p className="mt-2 text-muted-foreground">
                Every choice below is pressed into the cartridge. The preview
                casts live as you turn the dials.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cartridge-title" className="small-caps text-sm">
                Brass label engraving
              </Label>
              <div className="flex gap-2">
                <Input
                  id="cartridge-title"
                  value={live.title}
                  onChange={(e) => update("title", e.target.value.slice(0, 40))}
                  placeholder="e.g. THE WALL, 1907"
                  className="font-pressing"
                  maxLength={40}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const nouns = ["THE WALL", "THE COIL", "THE RANKS", "THE CORRIDORS", "THE CIRCUIT", "THE STRATA", "THE GANTRY", "THE DOCK", "THE CROSSING"];
                    const idx = MOULD_OPTIONS.findIndex((m) => m.id === live.mould);
                    const noun = idx >= 0 && idx < nouns.length ? nouns[idx] : "THE PRESSING";
                    const adjectives = ["AMBER", "QUIET", "IRON", "BRASS", "MIDNIGHT", "PAPER", "GRANITE", "VELVET", "LANTERN"];
                    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
                    update("title", `${adj} ${noun}`.slice(0, 40));
                  }}
                >
                  Stamp one
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cartridge-desc" className="small-caps text-sm">
                Cabinet card <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="cartridge-desc"
                value={live.description}
                onChange={(e) => update("description", e.target.value.slice(0, 140))}
                placeholder="A one-line story for the share page"
                maxLength={140}
              />
            </div>

            <PatternPicker onLoad={loadPattern} />

            <div className="grid gap-2">
              <Label className="small-caps text-sm">Mould selection</Label>
              <Select value={live.mould} onValueChange={handleMouldChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a mould" />
                </SelectTrigger>
                <SelectContent>
                  {MOULD_OPTIONS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        — {m.tagline}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{activeMould.blurb}</p>
            </div>

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {NUMERIC_DIALS.filter((d) => {
                const r = d.rangeFor(live.mould);
                return r.max > r.min;
              }).map((d) => {
                const r = d.rangeFor(live.mould);
                const info = DIAL_INFO.find((i) => i.key === d.infoKey);
                return (
                  <div key={d.key} className="grid gap-2">
                    <div className="flex items-baseline justify-between">
                      <Label className="small-caps text-sm">{d.label}</Label>
                      <span className="font-pressing text-xs text-primary">
                        {String(live[d.key])}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={r.min}
                      max={r.max}
                      step={1}
                      value={live[d.key]}
                      onChange={(e) => update(d.key, Number(e.target.value))}
                      className="w-full accent-primary"
                      aria-label={d.label}
                      aria-describedby={info ? `dial-hint-${d.key}` : undefined}
                    />
                    {info && (
                      <p
                        id={`dial-hint-${d.key}`}
                        className="text-xs leading-snug text-muted-foreground"
                      >
                        {info.effect}
                      </p>
                    )}
                  </div>
                );
              })}

              <p className="small-caps col-span-full text-sm text-muted-foreground">
                — Cabinet dials —
              </p>
              <DialSelect
                label="Colour treatment"
                value={live.palette}
                onChange={(v) => update("palette", v as PaletteId)}
                options={PALETTE_OPTIONS.map((p) => ({
                  value: p.id,
                  label: p.label,
                }))}
              />
              <DialSelect
                label="Cabinet frame"
                value={live.frame}
                onChange={(v) => update("frame", v as FrameId)}
                options={FRAME_OPTIONS.map((f) => ({
                  value: f.id,
                  label: f.label,
                }))}
              />
              <DialSelect
                label="House twist"
                value={live.twist}
                onChange={(v) => update("twist", v as TwistId)}
                options={TWIST_OPTIONS.map((t) => ({
                  value: t.id,
                  label: `${t.label} — ${t.hint}`,
                }))}
              />
              <DialSelect
                label="Plate finish"
                value={live.finish}
                onChange={(v) => update("finish", v as FinishId)}
                options={FINISH_OPTIONS.map((f) => ({
                  value: f.id,
                  label: f.label,
                }))}
              />
              <DialSelect
                label="Foundry bells"
                value={live.bells ? "on" : "off"}
                onChange={(v) => update("bells", v === "on")}
                options={[
                  { value: "off", label: "Silent pressing" },
                  { value: "on", label: "Chiptune chimes" },
                ]}
              />
              <DialSelect
                label="Spectrum toning"
                value={String(live.hue)}
                onChange={(v) => update("hue", Number(v))}
                options={SPECTRUM_STEPS.map((s) => ({
                  value: String(s.hue),
                  label: `${s.hue}° — ${s.label}`,
                }))}
              />
            </div>

            {/* Run seed */}
            <div className="grid gap-2 rounded-md border bg-card/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <Label className="small-caps text-sm">Run seed</Label>
                <span className="font-pressing text-xs text-primary">
                  #{(live.seed >>> 0).toString(16).toUpperCase().padStart(8, "0")}
                </span>
              </div>
              <p className="text-xs leading-snug text-muted-foreground">
                The seed drives every random event: maze carving, spawn order,
                traffic rhythm. Same seed + same dials = the same run, every
                time. Re-seed for a different board.
              </p>
              <div>
                <Button type="button" size="sm" variant="outline" onClick={handleReseed}>
                  Re-seed the run
                </Button>
              </div>
            </div>
          </div>

          {/* Right column: live preview + difficulty summary */}
          <div className="flex flex-col gap-6">
            <Card className="border-2 bg-card/80 paper-lift">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="stamp text-[10px]">
                  LIVE PREVIEW CAST
                </CardTitle>
                <span className="font-pressing text-[10px] tracking-widest text-muted-foreground">
                  UNSEALED PROOF
                </span>
              </CardHeader>
              <CardContent>
                <GameCanvas spec={spec} />
              </CardContent>
            </Card>

            {/* Difficulty summary — updates with every dial */}
            <Card className="border-2 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="engraved text-xl">Proof of difficulty</CardTitle>
                <p className="small-caps text-xs text-muted-foreground">
                  recalculated as the dials turn
                </p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-pressing text-sm tracking-widest text-primary">
                    {rating.verdict}
                  </span>
                  <span className="font-pressing text-2xl">{rating.overall.toFixed(1)}</span>
                </div>
                <RatingRow label="Pace" value={rating.pace} />
                <RatingRow label="Complexity" value={rating.complexity} />
                <RatingRow label="Reflex demand" value={rating.reflex} />
                <RatingRow label="Strategy demand" value={rating.strategy} />
                <p className="small-caps text-xs text-muted-foreground">
                  expected session: ~{rating.sessionMinutes} min
                </p>
                {spec.twist === "brittle" && spec.pace >= 4 && (
                  <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-200">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    Brittle moulding at a frantic pace: one mistake ends the run.
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={handlePress} disabled={pressing}>
                {pressing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Factory className="size-4" />
                )}
                {pressing
                  ? "Pressing…"
                  : remasterJob?.id
                    ? "Remaster & reseal cartridge"
                    : "Press & seal cartridge"}
              </Button>
              {!isAuthenticated && (
                <Button size="lg" variant="outline" onClick={saveToCabinet}>
                  <Save className="size-4" /> Keep in local cabinet
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/play/standalone")}
              >
                Play loose instead
              </Button>
            </div>
            {isAuthenticated && (
              <p className="text-xs text-muted-foreground">
                Signed in as {user?.name || user?.email} — presses are filed to
                your Workshop. Local-cabinet presses are merged into the
                Workshop automatically when you sign in from this browser.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Unsaved-changes guard */}
      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
      >
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Leave with an unsealed pressing?</DialogTitle>
            <DialogDescription>
              Your dial settings have not been pressed or saved. Leaving now
              loses the setup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (blocker.state === "blocked") blocker.reset();
              }}
            >
              Stay
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDirty(false);
                if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              Discard & leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="small-caps text-xs text-muted-foreground">{label}</span>
        <span className="font-pressing text-xs">{Math.round(value * 100)}%</span>
      </div>
      <Progress value={value * 100} className="mt-1 h-1.5" />
    </div>
  );
}

function PatternPicker({ onLoad }: { onLoad: (entry: PatternEntry) => void }) {
  const [query, setQuery] = useState("");
  const [mouldFilter, setMouldFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PATTERNS.filter((p) => {
      if (mouldFilter !== "all" && p.spec.mould !== mouldFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.spec.mould.includes(q)
      );
    });
  }, [query, mouldFilter]);

  const selected = open ? results.slice(0, 30) : [];

  return (
    <div className="grid gap-2">
      <Label className="small-caps text-sm">Pattern book</Label>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search 100 house patterns…"
          aria-label="Search the pattern book"
        />
        <Select value={mouldFilter} onValueChange={(v) => { setMouldFilter(v); setOpen(true); }}>
          <SelectTrigger className="w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moulds</SelectItem>
            {MOULD_OPTIONS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name.replace("Mould №", "№")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {open && selected.length > 0 && (
        <ul className="max-h-56 overflow-y-auto rounded-md border bg-card/90 p-1">
          {selected.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full rounded px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => {
                  onLoad(p);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-muted-foreground"> — {p.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!open && (
        <p className="text-xs text-muted-foreground">
          {PATTERNS.length} house patterns — ten per structural mould, fifteen
          per character press. Loading one fills every dial below.
        </p>
      )}
    </div>
  );
}

function DialSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-2">
      <Label className="small-caps text-sm">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
