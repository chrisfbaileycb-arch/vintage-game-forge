# The Cartridge Foundry

A browser-based maker for **original** arcade-style games, themed as a vintage
game manufacturing works. Choose a cast-iron mould (a game engine), set its
dials (gameplay parameters), and press & seal a playable cartridge — complete
with a brass label, a difficulty proof, and a deterministic run seed.

Every cartridge is a real, playable configuration, not a card. All engines,
characters, art, names, and sounds are original work created for this project;
see the in-app **About** page (`/about`) for the full originality statement.

## Quick start

```bash
bun install
bun dev            # Vite dev server + Convex dev (platform-managed in Freebuff)
bun test           # vitest suite (70 tests)
bun tsc -b --noEmit   # typecheck
```

The app talks to a Convex backend (`src/convex/`). Set `VITE_CONVEX_URL` in the
environment (managed by the platform's Keys UI — no `.env` edits needed). If
the backend is unreachable, anonymous visitors can still play every pattern,
press cartridges into the **local cabinet** (browser storage), and keep local
high scores; the Studio offers to keep unsaved work locally if a press fails.

## Architecture

```
src/
  lib/game/
    moulds.ts      Cartridge schema, dial ranges, normalization (single source of truth)
    engine.ts      The nine game engines (pure TS + Canvas 2D, framework-free)
    crt.ts         Shared CRT display pipeline (bevels, glow, scanlines, debris)
    dials.ts       Dial metadata + pure difficulty-rating calculator
    patterns.ts    The Pattern Book: 100 named presets (10 per structural mould,
                   15 per character mould), each with a stable seed
    rng.ts         mulberry32 seeded PRNG — deterministic runs
    bells.ts       WebAudio chiptune chimes for engine events
  lib/cabinet.ts   Local persistence (anonymous cartridges + high scores),
                   written against a repository interface a backend can mirror
  components/
    GameCanvas.tsx     Interactive cabinet: rAF loop, scoped keyboard/touch input
    MiniCabinet.tsx    Static one-frame preview for cards (no animation loop)
    SiteNav.tsx        Shared navigation
  pages/
    Landing.tsx        Hero with live-playable exhibits
    Moulds.tsx         The Mould Rack (9 engines, live specimens)
    Studio.tsx         Creation flow: dials, difficulty proof, seed, press & seal
    Patterns.tsx       Pattern Book: search, filters, sticky section nav
    Play.tsx           Cabinet page: game, share, local + server ledgers
    Workshop.tsx       Signed-in: server catalogue. Anonymous: local cabinet + transfer
    About.tsx          Originality statement & accessibility notes
  convex/
    schema.ts      gameDesigns, scores, counters (see below)
    games.ts       press / remaster / rename / setPublic / remove / recordPlay /
                   submitScore / listMine / browse / listShowcase / getPublic /
                   leaderboard / myStats
```

### The cartridge schema (v2)

A `CartridgeSpec` (see `src/lib/game/moulds.ts`) carries: `mould`, `title`,
`description`, `pace`, `gridDensity`, `brickRows`, `handling`, `hazards`,
`tokens`, `palette`, `frame`, `twist`, `finish`, `bells`, `hue` (spectrum
toning), **`seed`** (32-bit deterministic run seed), and **`schemaVersion`**.

`normalizeSpec()` clamps and whitelists every field. It is used by the
backend (`src/convex/games.ts`) before anything is stored, by the read path
when old rows are loaded, and by share-link decoding — one validation path
for everything.

### Determinism

The engine's RNG is `mulberry32(spec.seed)`. The same spec (dials + seed)
always produces the same run: same maze, same spawn order, same traffic.
Presets derive their seed from the preset id; Studio presses get a random
seed (re-seedable from the dial panel). Tests pin determinism across the
first twelve presets.

## Controls

- **Keyboard** — arrows or WASD to steer; Space/Enter to act; P to pause.
  Keyboard input is **scoped to the focused cabinet**: click or tab into a
  cabinet first. Page scrolling and other cabinets are never hijacked.
- **Touch** — hold left/right half to steer; tap to fire; drag to look on
  first-person moulds; a 44px-minimum virtual d-pad appears on maze-like
  moulds on small screens.
- **Cabinet controls** — Play/Restart, Pause, Reset, bells mute (when the
  cartridge was pressed with chimes), scanline grille toggle.

## Data model (Convex)

- `gameDesigns` — one pressed cartridge: sanitized spec, owner, mould/palette/
  frame/twist denormalized for filtering, `isPublic`, play counters, best
  score, timestamps. Indexed by owner, mould, and public listing.
- `scores` — one row per filed run (server-side ledger; client values are
  clamped, and local runs are labelled as local in the UI).
- `counters` — per-user aggregates (presses, plays, total/best score).

**Anonymous visitors** get the same creation flow backed by
`src/lib/cabinet.ts` (localStorage, capacity-capped, corruption-safe). The
Workshop page offers a one-click transfer that presses every local cartridge
into a signed-in Workshop.

## Tests

```bash
bun test
```

- `rng.test.ts` — PRNG determinism, seed separation, derivation.
- `smoke.test.ts` — **all 100 presets** validate, boot, and advance 100
  frames of mixed input without exceptions; identical presets play
  identically; difficulty ratings stay in bounds and respond to dials.
- `cabinet.test.ts` — save/update/remove, score pruning, clamp behaviour,
  corrupt-storage resilience.
- `engine.test.ts`, `moulds.test.ts`, `patterns.test.ts`, `spectrum.test.ts`,
  `bells.test.ts` — mould lifecycle, normalization, preset integrity,
  palette toning, and audio safety.

## Adding a mould

1. Add the id to `MouldKind` in `moulds.ts`, a `MOULD_OPTIONS` entry (name,
   tagline, blurb, dial labels), handling cap, and base pace.
2. Accept it in `normalizeSpec`'s mould whitelist.
3. Implement `buildX / updateX / renderX` in `engine.ts` and wire them into
   the update/render dispatch, `objectiveText`, `progressInfo`, `loseRun`,
   and `reset`.
4. Add ten presets to `patterns.ts` (fifteen for a character mould) and
   update the counts in `patterns.test.ts` and the smoke test expectations.
5. Add a launch case to `smoke.test.ts` coverage (automatic — it iterates
   every preset) and an engine lifecycle test.

## Adding a preset

Append an entry to `RAW_PATTERNS` in `src/lib/game/patterns.ts` with a unique
id, an original name/blurb, and a full dial record. The seed derives from the
id automatically. The smoke test will fail loudly if the preset cannot boot.

## Known limitations

- Scores submitted while signed out are filed with a visitor name and are
  clamped but not cryptographically verified (acceptable for a hobby build;
  local runs are always labelled as local).
- Sound is a single triangle-voice chime set; there is no music loop yet.
- Gamepad support is not implemented (the runtime architecture accepts a
  pluggable input source, so it is a contained addition).
- The engine render is 360×480 upscaled by CSS; a future pixel-perfect
  integer-scaling mode would sharpen large displays further.
