import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  GameCanvas,
} from "@/components/GameCanvas";
import { MOULD_OPTIONS, type CartridgeSpec, normalizeSpec } from "@/lib/game/moulds";
import { PATTERNS, PATTERN_COUNT, patternsByMould } from "@/lib/game/patterns";
import { useNavigate } from "react-router";

/** Three archival example cartridges, playable right on the landing page. */
const EXHIBITS: CartridgeSpec[] = [
  normalizeSpec({
    mould: "breakout",
    title: "THE WALL, 1907",
    brickRows: 5,
    handling: 2,
    hazards: 0,
    tokens: 3,
    pace: 3,
    palette: "sepia",
    frame: "plaque",
    twist: "none",
    finish: "lithograph",
    bells: true,
    hue: 0,
  }),
  normalizeSpec({
    mould: "snake",
    title: "GARDEN SERPENT",
    gridDensity: 3,
    handling: 5,
    hazards: 3,
    tokens: 2,
    pace: 3,
    palette: "emerald",
    frame: "engraved",
    twist: "none",
    finish: "matte",
    bells: true,
    hue: 105,
  }),
  normalizeSpec({
    mould: "maze",
    title: "THE GLASS CORRIDORS",
    gridDensity: 2,
    handling: 3,
    hazards: 4,
    tokens: 4,
    pace: 3,
    palette: "blueprint",
    frame: "engraved",
    twist: "none",
    finish: "lithograph",
    bells: true,
    hue: 0,
  }),
  normalizeSpec({
    mould: "flyer",
    title: "AERODROME NO. 5",
    gridDensity: 3,
    handling: 2,
    hazards: 3,
    tokens: 3,
    pace: 3,
    palette: "nocturne",
    frame: "gilt",
    twist: "windfall",
    finish: "electric",
    bells: true,
    hue: 210,
  }),
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="paper-texture min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        {/* Masthead */}
        <header className="flex items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Foundry seal" className="h-10 w-10 rounded-sm sepia-plate" />
            <div className="leading-tight">
              <p className="small-caps text-xs text-muted-foreground">Est. MMXXVI · The Cartridge Foundry</p>
              <p className="font-pressing text-[10px] tracking-[0.2em] text-muted-foreground">VINTAGE GAME MANUFACTURER</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/studio")}>Enter the Studio</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth?returnTo=/studio")}>
                  Sign in
                </Button>
                <Button onClick={() => navigate("/auth?returnTo=/studio")}>Open a Studio</Button>
              </>
            )}
          </nav>
        </header>

        <div className="rule-double" />

        {/* Hero */}
        <section className="grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="stamp mb-4 inline-block text-[10px] text-primary">FOUNDRY CATALOGUE · FIRST EDITION</p>
            <h1 className="engraved text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Press your own
              <span className="text-primary"> arcade cartridge</span>, the old way.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Choose a mould. Set the dials. The Foundry casts a genuine, playable
              vintage video game — sealed with a brass label and ready to share
              with the world.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="glow-amber" onClick={() => navigate(isAuthenticated ? "/studio" : "/auth?returnTo=/studio")}>
                Start pressing — free
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/play/standalone")}>
                Play a loose cartridge
              </Button>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                ["5", "cast-iron moulds"],
                ["144", "colourways"],
                ["∞", "impressions"],
              ].map(([n, label]) => (
                <div key={label} className="rounded-md border bg-card/60 px-3 py-3 paper-lift">
                  <dt className="font-pressing text-2xl text-primary">{n}</dt>
                  <dd className="small-caps text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Playable hero exhibit */}
          <div className="relative">
            <div className="rounded-lg border-2 bg-card/80 p-4 paper-lift">
              <div className="mb-3 flex items-center justify-between">
                <p className="stamp text-[10px]">EXHIBIT A</p>
                <p className="font-pressing text-[10px] tracking-widest text-muted-foreground">
                  HAND-PRESSED SPECIMEN — PLAYABLE
                </p>
              </div>
              <GameCanvas spec={EXHIBITS[0]!} />
            </div>
          </div>
          <div className="lg:col-span-2 rounded-lg border-2 bg-card/80 p-4 paper-lift">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="stamp text-[10px]">EXHIBITS B, C & D</p>
              <p className="font-pressing text-[10px] tracking-widest text-muted-foreground">
                THREE FURTHER SPECIMENS — PLAYABLE
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[EXHIBITS[1], EXHIBITS[2], EXHIBITS[3]].map(
                (exhibit, i) => exhibit ? <GameCanvas key={i} spec={exhibit} /> : null,
              )}
            </div>
          </div>
        </section>

        <div className="rule-double" />

        {/* The manufacturing process */}
        <section className="py-14">
          <p className="small-caps text-sm text-muted-foreground">Chapter I</p>
          <h2 className="engraved mt-1 text-3xl font-semibold">The manufacturing process</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every cartridge is pressed in three stages. No code, no compilers — just
            the eye of a craftsman.
          </p>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "I",
                title: "Select a mould",
                body: "Five cast-iron moulds in the rack: the Breaker, the Serpent, the Sentinels, the Stereoscope (a true first-person maze), and the Aerodrome.",
              },
              {
                step: "II",
                title: "Set the dials",
                body: "Twelve of them: rows, pace, handling, fixtures, house tokens, palette, frame, twist, plate finish, foundry bells — each stamped with its setting.",
              },
              {
                step: "III",
                title: "Press & seal",
                body: "The press runs your dials through the mould. Out comes a sealed cartridge with a brass label and a share link.",
              },
            ].map((s) => (
              <li key={s.step} className="rounded-md border bg-card/60 p-6 paper-lift">
                <span className="stamp text-xs text-primary">{s.step}</span>
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="rule-double" />

        {/* The mould rack */}
        <section className="py-14">
          <p className="small-caps text-sm text-muted-foreground">Chapter II</p>
          <h2 className="engraved mt-1 text-3xl font-semibold">The mould rack</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {MOULD_OPTIONS.map((m) => (
              <div key={m.id} className="flex flex-col rounded-md border bg-card/60 p-6 paper-lift">
                <h3 className="text-xl font-semibold">{m.name}</h3>
                <p className="small-caps mt-1 text-sm text-primary">{m.tagline}</p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{m.blurb}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {m.dials.map((d) => (
                    <Badge key={d} variant="secondary" className="font-pressing text-[10px]">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="rule-double" />

        {/* The pattern book — 50 named games, playable in place */}
        <section className="py-14">
          <p className="small-caps text-sm text-muted-foreground">Chapter III</p>
          <h2 className="engraved mt-1 text-3xl font-semibold">
            The pattern book — {PATTERN_COUNT} named games
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Fifty house patterns, ten per mould — each a complete dial setting
            that plays differently from its neighbours. Open any cabinet below,
            or re-cast a pattern with your own dials in the Studio.
          </p>
          <div className="mt-8 space-y-10">
            {[...patternsByMould().entries()].map(([mouldId, entries]) => {
              const mould = MOULD_OPTIONS.find((m) => m.id === mouldId);
              return (
                <div key={mouldId}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xl font-semibold">{mould?.name}</h3>
                    <p className="small-caps text-sm text-primary">{mould?.tagline}</p>
                  </div>
                  <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-col rounded-md border bg-card/60 p-4 paper-lift"
                      >
                        <p className="font-pressing text-sm font-semibold">{entry.name}</p>
                        <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                          {entry.blurb}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() =>
                              navigate(`/play/standalone?pattern=${entry.id}`)
                            }
                          >
                            Play
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1"
                            onClick={() =>
                              navigate("/studio", {
                                state: { pattern: entry.spec },
                              })
                            }
                          >
                            Re-cast
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <div className="rule-double" />

        {/* Closing CTA */}
        <section className="py-16 text-center">
          <p className="small-caps text-sm text-muted-foreground">Final plate</p>
          <h2 className="engraved mx-auto mt-2 max-w-2xl text-3xl font-semibold">
            The press is oiled. The moulds are warm.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Open a studio, set the dials, and walk away with a sealed vintage
            cartridge that anyone on earth can play — or start from one of the
            fifty patterns above.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={() => navigate(isAuthenticated ? "/studio" : "/auth?returnTo=/studio")}>
              Open your Studio
            </Button>
          </div>
          <p className="font-pressing mt-6 text-[10px] tracking-[0.25em] text-muted-foreground">
            THE CARTRIDGE FOUNDRY · PRESSED DAILY · EST. MMXXVI
          </p>
        </section>
      </div>
    </div>
  );
}
