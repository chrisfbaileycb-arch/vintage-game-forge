import { LogoDropdown } from "@/components/LogoDropdown";
import { GameCanvas } from "@/components/GameCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  MOULD_OPTIONS,
  catalogueNumber,
  decodeSpec,
  normalizeSpec,
  type CartridgeSpec,
} from "@/lib/game/moulds";
import { getPattern } from "@/lib/game/patterns";
import { cabinet, type LocalScore } from "@/lib/cabinet";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Copy, RotateCcw, Share2, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

function isId(value: string): value is Id<"gameDesigns"> {
  // Convex ids are 32 lowercase base32-ish chars; be permissive but bounded.
  return /^[a-z0-9]{16,48}$/.test(value);
}

/** The Foundry's own house cartridge, shown when no code is supplied. */
const HOUSE_SPEC: CartridgeSpec = normalizeSpec({
  mould: "breakout",
  title: "THE FOUNDRY SAMPLE",
  brickRows: 5,
  handling: 2,
  hazards: 3,
  pace: 3,
  palette: "sepia",
  frame: "plaque",
  twist: "none",
});

export default function Play() {
  const { cartridgeId, shareToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const looseCode = searchParams.get("code");
  const patternId = searchParams.get("pattern");
  const looseSpec = useMemo(() => {
    if (looseCode) return decodeSpec(looseCode);
    if (patternId) return getPattern(patternId)?.spec ?? null;
    return null;
  }, [looseCode, patternId]);

  const validId = cartridgeId && isId(cartridgeId) ? cartridgeId : undefined;
  const game = useQuery(
    api.games.getPublic,
    validId ? { id: validId } : "skip",
  );
  // Revocable share links: the token resolves to its cartridge server-side;
  // revoked links resolve to null and render an empty sleeve below.
  const sharedGame = useQuery(
    api.games.getByShareToken,
    shareToken ? { token: shareToken } : "skip",
  );
  const sharedId = sharedGame?._id ?? undefined;
  /** Whichever cartridge is actually on the platter: direct id or shared. */
  const ledgerId = validId ?? sharedId;
  /** The resolved cartridge record, by either path. */
  const resolvedGame = game ?? sharedGame;
  const recordPlay = useMutation(api.games.recordPlay);
  const showcase = useQuery(api.games.listShowcase);

  const countedPlayRef = useRef<string | null>(null);
  useEffect(() => {
    if (ledgerId && resolvedGame && countedPlayRef.current !== ledgerId) {
      countedPlayRef.current = ledgerId;
      void recordPlay({ id: ledgerId, shareToken });
    }
  }, [ledgerId, resolvedGame, recordPlay, shareToken]);

  const leaderboard = useQuery(
    api.games.leaderboard,
    ledgerId
      ? { gameId: ledgerId, limit: 10, shareToken }
      : "skip",
  );
  const submitScore = useMutation(api.games.submitScore);
  const [submitting, setSubmitting] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  // Reset per-cartridge flow state when navigating between cartridges
  // client-side (this component is reused across /play/:id param changes).
  useEffect(() => {
    setSubmittedScore(null);
  }, [ledgerId]);

  const handleSubmitScore = async (score: number) => {
    if (!ledgerId || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitScore({
        gameId: ledgerId,
        score,
        combo: 0,
        shareToken,
      });
      setSubmittedScore(score);
      toast.success(
        score >= result.best
          ? "A new house record!"
          : "Score filed to the ledger.",
        { description: `Best on this cartridge: ${result.best}` },
      );
    } catch {
      toast.error("Could not file the score.");
    } finally {
      setSubmitting(false);
    }
  };

  const spec: CartridgeSpec | null = looseSpec
    ? looseSpec
    : game
      ? normalizeSpec(game.spec)
      : sharedGame
        ? normalizeSpec(sharedGame.spec)
        : cartridgeId === "standalone"
          ? HOUSE_SPEC
          : null;

  // Local run ledger: every finished run is recorded in this browser,
  // whether or not the cartridge lives on a server. Server-ledger filing
  // (the "File score" button) stays a deliberate, separate action.
  const [localScores, setLocalScores] = useState<LocalScore[]>([]);
  useEffect(() => {
    if (!spec) return;
    setLocalScores(cabinet.listScores(ledgerId ?? null, patternId));
  }, [spec, ledgerId, patternId]);

  function handleRunEnd(result: { score: number; outcome: "won" | "lost" }) {
    if (!spec) return;
    cabinet.recordScore({
      cartridgeId: ledgerId ?? null,
      presetId: patternId,
      cartridgeTitle: spec.title,
      score: result.score,
      level: 1,
      durationSec: 0,
      outcome: result.outcome,
    });
    setLocalScores(cabinet.listScores(ledgerId ?? null, patternId));
  }

  const noCartridge =
    (validId && game === null) ||
    (Boolean(shareToken) && sharedGame === null) ||
    (Boolean(cartridgeId) && !validId && !looseSpec && cartridgeId !== "standalone");

  const shareUrl = looseSpec
    ? `${window.location.origin}/play/standalone?code=${looseCode}`
    : shareToken
      ? `${window.location.origin}/s/${shareToken}`
      : ledgerId
        ? `${window.location.origin}/play/${ledgerId}`
        : "";

  const handleShare = async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: spec?.title ?? "A pressed cartridge",
          text: "Play my hand-pressed vintage cartridge:",
          url: shareUrl,
        });
        return;
      } catch {
        /* user dismissed; fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied.", { description: shareUrl });
    } catch {
      toast.error("Could not copy — the address is " + shareUrl);
    }
  };

  if (noCartridge) {
    return (
      <div className="paper-texture flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="stamp mb-4 inline-block text-[10px]">EMPTY SLEEVE</p>
          <h1 className="engraved text-2xl font-semibold">
            No cartridge in this sleeve
          </h1>
          <p className="mt-2 text-muted-foreground">
            The link may be misprinted, or the cartridge was withdrawn from the
            catalogue.
          </p>
          <Button className="mt-6" onClick={() => navigate("/")}>
            <ArrowLeft className="size-4" /> Back to the Foundry
          </Button>
        </div>
      </div>
    );
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
                THE CABINET
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleShare} disabled={!shareUrl}>
              <Share2 className="size-4" /> Share
            </Button>
            <Button onClick={() => navigate("/studio")}>Press your own</Button>
          </div>
        </header>

        <div className="rule-double" />

        <section className="grid gap-10 py-10 lg:grid-cols-[1fr_1fr]">
          <div>
            {spec ? (
              <>
                <p className="stamp mb-4 inline-block text-[10px] text-primary">
                  {ledgerId ? catalogueNumber(ledgerId) : "LOOSE IMPRESSION"}
                </p>
                <h1 className="engraved text-4xl font-semibold sm:text-5xl">
                  {spec.title}
                </h1>
                <p className="small-caps mt-2 text-sm text-primary">
                  {MOULD_OPTIONS.find((m) => m.id === spec.mould)?.name} ·{" "}
                  {MOULD_OPTIONS.find((m) => m.id === spec.mould)?.tagline}
                </p>
                <p className="mt-4 max-w-md text-muted-foreground">
                  A genuine pressed cartridge from The Cartridge Foundry. Hold
                  the left or right half of the plate to steer, press to fire,
                  or use the keyboard.
                </p>

                <div className="font-pressing mt-6 grid max-w-md grid-cols-2 gap-x-6 gap-y-2 text-xs tracking-wide text-muted-foreground">
                  <span>MOULD</span>
                  <span className="text-right text-foreground">{spec.mould}</span>
                  <span>SPEED</span>
                  <span className="text-right text-foreground">{spec.pace}/5</span>
                  <span>FIXTURES</span>
                  <span className="text-right text-foreground">
                    {spec.hazards}
                  </span>                  <span>PALETTE</span>
                  <span className="text-right text-foreground">{spec.palette}</span>
                  <span>FRAME</span>
                  <span className="text-right text-foreground">{spec.frame}</span>
                  <span>TWIST</span>
                  <span className="text-right text-foreground">{spec.twist}</span>
                  <span>FINISH</span>
                  <span className="text-right text-foreground">{spec.finish}</span>
                  <span>TOKENS</span>
                  <span className="text-right text-foreground">{spec.tokens}</span>
                  <span>SPECTRUM</span>
                  <span className="text-right text-foreground">
                    {spec.hue ? `${spec.hue}° toned` : "as mixed"}
                  </span>
                  <span>BELLS</span>
                  <span className="text-right text-foreground">{spec.bells ? "on" : "off"}</span>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleShare} disabled={!shareUrl}>
                    <Copy className="size-4" /> Copy share link
                  </Button>
                  {spec && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate("/studio", { state: { pattern: spec } })
                      }
                    >
                      <RotateCcw className="size-4" /> Re-cast in the Studio
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Lifting the sleeve…</p>
            )}
          </div>

          <div>
            {spec ? (
              <Card className="border-2 bg-card/80 paper-lift">
                <CardContent className="pt-6">
                  <GameCanvas
                    spec={spec}
                    onRunEnd={handleRunEnd}
                    onSubmitScore={
                      ledgerId && submittedScore === null
                        ? handleSubmitScore
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-md border-2 border-dashed">
                <p className="text-muted-foreground">Setting the plate…</p>
              </div>
            )}
          </div>
        </section>

        {/* Local run ledger — this browser's runs on this cartridge */}
        {spec && localScores.length > 0 && (
          <>
            <div className="rule-double" />
            <section className="py-10">
              <div className="flex items-center gap-3">
                <Trophy className="size-5 text-primary" />
                <h2 className="engraved text-2xl font-semibold">
                  Your runs on this machine
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Kept locally in this browser; not filed to the public ledger.
              </p>
              <ol className="font-pressing mt-6 max-w-xl space-y-2 text-xs tracking-wide">
                {localScores.slice(0, 8).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-baseline justify-between rounded-md border bg-card/60 px-4 py-2 paper-lift"
                  >
                    <span className="text-muted-foreground">
                      {entry.outcome === "won" ? "CLEARED" : "RUN"} ·{" "}
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-foreground">
                      {entry.score.toLocaleString()} pts
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {/* Ledger of top scores */}
        {ledgerId && leaderboard && leaderboard.length > 0 && (
          <>
            <div className="rule-double" />
            <section className="py-10">
              <div className="flex items-center gap-3">
                <Trophy className="size-5 text-primary" />
                <h2 className="engraved text-2xl font-semibold">
                  The house ledger — top scores
                </h2>
              </div>
              <ol className="font-pressing mt-6 max-w-xl space-y-2 text-xs tracking-wide">
                {leaderboard.map((entry, i) => (
                  <li
                    key={entry._id}
                    className="flex items-baseline justify-between rounded-md border bg-card/60 px-4 py-2 paper-lift"
                  >
                    <span className="text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}. {entry.playerName}
                    </span>
                    <span className="text-foreground">
                      {entry.score.toLocaleString()} pts
                      {entry.combo > 1 ? ` · ×${entry.combo} streak` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        {/* Display case */}
        <div className="rule-double" />
        <section className="py-10">
          <h2 className="engraved text-2xl font-semibold">
            From the display case
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Other cartridges currently on public exhibition.
          </p>
          {showcase && showcase.length > 0 ? (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showcase.map((s) => (
                <li key={s._id}>
                  <Link
                    to={`/play/${s._id}`}
                    className="block rounded-md border bg-card/60 p-4 transition-colors hover:bg-card paper-lift"
                  >
                    <p className="font-pressing text-[10px] tracking-[0.2em] text-muted-foreground">
                      {catalogueNumber(s._id)}
                    </p>
                    <p className="mt-1 font-semibold">{s.title}</p>
                    <p className="small-caps text-xs text-muted-foreground">
                      {s.mould} mould · {s.plays} play{s.plays === 1 ? "" : "s"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              The display case is empty for now — be the first to exhibit.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
