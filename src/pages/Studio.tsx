import { GameCanvas } from "@/components/GameCanvas";
import { LogoDropdown } from "@/components/LogoDropdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  DIAL_RANGES,
  FINISH_OPTIONS,
  FRAME_OPTIONS,
  MOULD_BASE_PACE,
  MOULD_OPTIONS,
  PALETTE_OPTIONS,
  TOKEN_META,
  TWIST_OPTIONS,
  type CartridgeSpec,
  type FinishId,
  type FrameId,
  type MouldKind,
  type PaletteId,
  type TwistId,
} from "@/lib/game/moulds";
import { useMutation } from "convex/react";
import { Factory, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

interface Live {
  title: string;
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
}

function defaultLive(mould: MouldKind): Live {
  return {
    title: "Untitled Pressing",
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
  };
}

function liveToSpec(l: Live): CartridgeSpec {
  return {
    title: l.title.trim() || "Untitled Pressing",
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
  };
}

function range(min: number, max: number): number[] {
  const out: number[] = [];
  for (let n = min; n <= max; n++) out.push(n);
  return out;
}

export default function Studio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const press = useMutation(api.games.press);

  const [live, setLive] = useState<Live>(defaultLive("breakout"));
  const [pressing, setPressing] = useState(false);

  const spec = useMemo(() => liveToSpec(live), [live]);
  const activeMould = MOULD_OPTIONS.find((m) => m.id === live.mould)!;

  function update<K extends keyof Live>(key: K, value: Live[K]) {
    setLive((prev) => ({ ...prev, [key]: value }));
  }

  function handleMouldChange(id: string) {
    const mould = id as MouldKind;
    setLive((prev) => ({
      ...prev,
      mould,
      pace: MOULD_BASE_PACE[mould],
      handling: Math.min(prev.handling, DIAL_RANGES.handling.byMould[mould]),
    }));
  }

  async function handlePress() {
    setPressing(true);
    try {
      const id = await press({ title: live.title, spec });
      toast.success("Cartridge pressed and sealed.", {
        description: "It has been filed in your Workshop catalogue.",
      });
      navigate("/workshop");
    } catch (error) {
      console.error(error);
      toast.error("The press jammed. Try once more.");
    } finally {
      setPressing(false);
    }
  }

  return (
    <div className="paper-texture min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <header className="flex items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <LogoDropdown />
            <div className="leading-tight">
              <p className="small-caps text-xs text-muted-foreground">
                The Cartridge Foundry
              </p>
              <p className="font-pressing text-[10px] tracking-[0.2em] text-muted-foreground">
                DESIGN STUDIO
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.name || user?.email ? (
              <p className="small-caps mr-2 hidden text-xs text-muted-foreground sm:block">
                maker: {user?.name || user?.email}
              </p>
            ) : null}
            <Button variant="outline" onClick={() => navigate("/workshop")}>
              Workshop
            </Button>
          </div>
        </header>

        <div className="rule-double" />

        <section className="grid gap-8 py-10 lg:grid-cols-2">
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
              <Input
                id="cartridge-title"
                value={live.title}
                onChange={(e) =>
                  update("title", e.target.value.slice(0, 40))
                }
                placeholder="e.g. THE WALL, 1907"
                className="font-pressing"
                maxLength={40}
              />
            </div>

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

            <div className="grid gap-5 sm:grid-cols-2">
              <DialSelect
                label="Pressing speed"
                value={String(live.pace)}
                onChange={(v) => update("pace", Number(v))}
                options={range(1, 5).map((n) => ({
                  value: String(n),
                  label: `${n} — ${
                    ["gentle", "measured", "brisk", "lively", "frantic"][
                      n - 1
                    ]
                  }`,
                }))}
              />
              {live.mould === "breakout" && (
                <DialSelect
                  label="Brick rows"
                  value={String(live.brickRows)}
                  onChange={(v) => update("brickRows", Number(v))}
                  options={range(3, 9).map((n) => ({
                    value: String(n),
                    label: `${n} rows`,
                  }))}
                />
              )}
              {live.mould === "snake" && (
                <DialSelect
                  label="Board density"
                  value={String(live.gridDensity)}
                  onChange={(v) => update("gridDensity", Number(v))}
                  options={range(0, 9).map((n) => ({
                    value: String(n),
                    label: `${12 + n * 2} columns`,
                  }))}
                />
              )}
              {live.mould === "invaders" && (
                <DialSelect
                  label="Grid density"
                  value={String(live.gridDensity)}
                  onChange={(v) => update("gridDensity", Number(v))}
                  options={range(0, 9).map((n) => ({
                    value: String(n),
                    label: `${4 + n} across`,
                  }))}
                />
              )}
              <DialSelect
                label={
                  live.mould === "breakout"
                    ? "Paddle width"
                    : live.mould === "snake"
                      ? "Growth dial"
                      : "Cannon reload"
                }
                value={String(live.handling)}
                onChange={(v) => update("handling", Number(v))}
                options={range(
                  0,
                  DIAL_RANGES.handling.byMould[live.mould],
                ).map((n) => ({ value: String(n), label: `Setting ${n}` }))}
              />
              <DialSelect
                label="Extra fixtures"
                value={String(live.hazards)}
                onChange={(v) => update("hazards", Number(v))}
                options={range(0, 9).map((n) => ({
                  value: String(n),
                  label: n === 0 ? "none" : `${n}`,
                }))}
              />
              <DialSelect
                label="House tokens"
                value={String(live.tokens)}
                onChange={(v) => update("tokens", Number(v))}
                options={range(0, DIAL_RANGES.tokens.max).map((n) => ({
                  value: String(n),
                  label: n === 0 ? "none" : `${n} drops`,
                }))}
              />
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
                  label: t.label,
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
            </div>

            <div className="font-pressing space-y-1 text-xs text-muted-foreground">
              <p>
                TWIST: {TWIST_OPTIONS.find((t) => t.id === live.twist)?.hint}
              </p>
              <p>TOKENS: {TOKEN_META.map((t) => t.label).join(" / ")}</p>
              <p>
                FINISH: {FINISH_OPTIONS.find((f) => f.id === live.finish)?.hint}
              </p>
              <p>
                FRAME: {FRAME_OPTIONS.find((f) => f.id === live.frame)?.hint}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={handlePress} disabled={pressing}>
                {pressing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Factory className="size-4" />
                )}
                {pressing ? "Pressing…" : "Press & seal cartridge"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/play/standalone")}
              >
                Play loose instead
              </Button>
            </div>
          </div>

          {/* Right column: live preview */}
          <div>
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
          </div>
        </section>
      </div>
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
