import { GameCanvas } from "@/components/GameCanvas";
import { MiniCabinet } from "@/components/MiniCabinet";
import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import {
  cabinet,
  type LocalCartridge,
} from "@/lib/cabinet";
import {
  MOULD_OPTIONS,
  catalogueNumber,
  normalizeSpec,
  type CartridgeSpec,
} from "@/lib/game/moulds";
import { useMutation, useQuery } from "convex/react";
import {
  Copy,
  Eye,
  EyeOff,
  Factory,
  MoreHorizontal,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

export default function Workshop() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const press = useMutation(api.games.press);
  const transferRequested = searchParams.get("transfer") === "1";

  /** After sign-in (returnTo=/workshop&transfer=1), press all local
   *  cartridges into the server Workshop, then clear the flag. */
  useEffect(() => {
    if (!isAuthenticated || !transferRequested) return;
    let cancelled = false;
    (async () => {
      const local = cabinet.listCartridges();
      let ok = 0;
      for (const g of local) {
        try {
          await press({ title: g.title, spec: g.spec });
          cabinet.removeCartridge(g.id);
          ok += 1;
        } catch {
          /* keep failed cartridges locally */
        }
      }
      if (cancelled) return;
      setSearchParams({}, { replace: true });
      if (ok > 0) {
        toast.success(
          `${ok} local cartridge${ok === 1 ? "" : "s"} pressed to your Workshop.`,
        );
      } else if (local.length > 0) {
        toast.error("The press would not take them. Your local cabinet is unchanged.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, transferRequested, press, setSearchParams]);

  return (
    <div className="paper-texture min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <SiteNav subtitle={isAuthenticated ? "THE WORKSHOP WALL" : "YOUR LOCAL CABINET"} />
        <div className="rule-double" />
        {isLoading ? (
          <p className="py-16 text-muted-foreground">Consulting the ledger…</p>
        ) : isAuthenticated ? (
          <ServerWorkshop userName={user?.name || user?.email || null} />
        ) : (
          <LocalCabinet />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signed-in: the server-persisted Workshop (unchanged behaviour)
// ---------------------------------------------------------------------------

function ServerWorkshop({ userName }: { userName: string | null }) {
  const navigate = useNavigate();
  const games = useQuery(api.games.listMine);
  const removeGame = useMutation(api.games.remove);
  const renameGame = useMutation(api.games.rename);
  const setPublicGame = useMutation(api.games.setPublic);
  const remasterGame = useMutation(api.games.remaster);
  const stats = useQuery(api.games.myStats);

  const [playing, setPlaying] = useState<CartridgeSpec | null>(null);
  const [playingTitle, setPlayingTitle] = useState("");
  const [renaming, setRenaming] = useState<{
    id: Id<"gameDesigns">;
    title: string;
  } | null>(null);

  const handleCopyLink = async (id: Id<"gameDesigns">) => {
    const url = `${window.location.origin}/play/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied.", { description: url });
    } catch {
      toast.error("Could not copy — the address is " + url);
    }
  };

  const handleRename = async () => {
    if (!renaming) return;
    try {
      await renameGame({ id: renaming.id, title: renaming.title });
      toast.success("Label re-engraved.");
    } catch {
      toast.error("Could not re-engrave the label.");
    } finally {
      setRenaming(null);
    }
  };

  const handleDelete = async (id: Id<"gameDesigns">) => {
    try {
      await removeGame({ id });
      toast.success("Cartridge withdrawn from the catalogue.");
    } catch {
      toast.error("Could not withdraw the cartridge.");
    }
  };

  const handleTogglePublic = async (
    id: Id<"gameDesigns">,
    next: boolean,
  ) => {
    try {
      await setPublicGame({ id, isPublic: next });
      toast.success(
        next ? "Added to the display case." : "Removed from the display case.",
      );
    } catch {
      toast.error("Could not change visibility.");
    }
  };

  /** Re-press: same cartridge, dials re-cast in the Studio. */
  function repress(id: Id<"gameDesigns">, spec: CartridgeSpec, title: string) {
    navigate("/studio", {
      state: { remaster: { id, spec, mould: spec.mould, title } },
    });
  }

  return (
    <>
      <section className="py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="engraved text-3xl font-semibold">
            Your cartridge catalogue
          </h1>
          {stats && (
            <p className="font-pressing text-xs tracking-widest text-muted-foreground">
              {stats.presses} PRESSED · {stats.plays} RUNS · BEST{" "}
              {stats.bestScore.toLocaleString()}
            </p>
          )}
          {games && (
            <p className="font-pressing text-xs tracking-widest text-muted-foreground">
              {games.length} FILED
            </p>
          )}
        </div>

        {games === undefined ? (
          <p className="mt-8 text-muted-foreground">Consulting the ledger…</p>
        ) : games.length === 0 ? (
          <Card className="mt-8 border-2 bg-card/70 paper-lift">
            <CardHeader>
              <CardTitle>The wall is bare</CardTitle>
              <CardDescription>
                No cartridges have been pressed yet. Visit the Studio, set the
                dials, and press your first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/studio")}>
                <Factory className="size-4" /> Go to the Studio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {games.map((g) => {
              const spec = normalizeSpec(g.spec);
              const mould = MOULD_OPTIONS.find((m) => m.id === spec.mould);
              return (
                <Card key={g._id} className="border-2 bg-card/70 paper-lift">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-pressing text-[10px] tracking-[0.2em] text-muted-foreground">
                          {catalogueNumber(g._id)} · {mould?.name ?? spec.mould}
                        </p>
                        <CardTitle className="mt-1 text-xl">{g.title}</CardTitle>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Cartridge actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() => handleCopyLink(g._id)}
                            className="cursor-pointer"
                          >
                            <Copy className="mr-2 size-4" /> Copy share link
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRenaming({ id: g._id, title: g.title })}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 size-4" /> Re-engrave label
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => repress(g._id, spec, g.title)}
                            className="cursor-pointer"
                          >
                            <Factory className="mr-2 size-4" /> Re-press with new dials
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleTogglePublic(g._id, !g.isPublic)}
                            className="cursor-pointer"
                          >
                            {g.isPublic ? (
                              <>
                                <EyeOff className="mr-2 size-4" /> Remove from
                                display case
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 size-4" /> Add to display
                                case
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(g._id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" /> Withdraw
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    <div className="hidden w-28 shrink-0 sm:block">
                      <MiniCabinet spec={spec} />
                    </div>
                    <div className="flex flex-1 flex-col gap-3">
                      <div className="font-pressing text-[11px] leading-5 tracking-wide text-muted-foreground">
                        <p>
                          SPEED {spec.pace}/5 · FIXTURES {spec.hazards} · TOKENS{" "}
                          {spec.tokens} · {spec.hue ? `TONED ${spec.hue}°` : "AS MIXED"}
                        </p>
                        <p>
                          {g.isPublic ? "ON DISPLAY" : "PRIVATE KEEPING"} ·{" "}
                          {g.plays} PLAY{g.plays === 1 ? "" : "S"} TO DATE
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setPlayingTitle(g.title);
                            setPlaying(spec);
                          }}
                        >
                          <Play className="size-4" /> Play here
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/play/${g._id}`)}
                        >
                          Open cabinet page
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Play dialog */}
      <Dialog
        open={playing !== null}
        onOpenChange={(open) => {
          if (!open) setPlaying(null);
        }}
      >
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>{playingTitle}</DialogTitle>
            <DialogDescription>Playback from the workshop wall.</DialogDescription>
          </DialogHeader>
          {playing && <GameCanvas spec={playing} />}
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
      >
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Re-engrave the label</DialogTitle>
            <DialogDescription>
              Up to 40 characters, pressed in pressing-plant capitals.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renaming?.title ?? ""}
            onChange={(e) =>
              setRenaming((prev) =>
                prev ? { ...prev, title: e.target.value.slice(0, 40) } : prev,
              )
            }
            maxLength={40}
            className="font-pressing"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Anonymous: the local cabinet
// ---------------------------------------------------------------------------

function LocalCabinet() {
  const navigate = useNavigate();
  const [games, setGames] = useState<LocalCartridge[]>([]);
  const [playing, setPlaying] = useState<LocalCartridge | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(
    null,
  );

  const refresh = useCallback(() => {
    setGames(cabinet.listCartridges());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleDelete(id: string) {
    cabinet.removeCartridge(id);
    refresh();
    toast.success("Cartridge removed from the local cabinet.");
  }

  function handleRename() {
    if (!renaming) return;
    const target = games.find((g) => g.id === renaming.id);
    if (target) {
      cabinet.saveCartridge({
        id: target.id,
        title: renaming.title,
        spec: target.spec,
      });
      toast.success("Label re-engraved.");
    }
    setRenaming(null);
    refresh();
  }

  return (
    <>
      <section className="py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="engraved text-3xl font-semibold">Your local cabinet</h1>
          <p className="font-pressing text-xs tracking-widest text-muted-foreground">
            {games.length} FILED · THIS BROWSER
          </p>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          You are not signed in, so your presses are kept safely in this
          browser. Nothing is lost between visits — and when you open a Studio
          they can be transferred into your Workshop in one click.
        </p>

        {games.length === 0 ? (
          <Card className="mt-8 border-2 bg-card/70 paper-lift">
            <CardHeader>
              <CardTitle>The cabinet is empty</CardTitle>
              <CardDescription>
                Visit the Studio, set the dials, and press a cartridge — or
                cast one of the hundred house patterns.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/studio")}>
                <Factory className="size-4" /> Go to the Studio
              </Button>
              <Button variant="outline" onClick={() => navigate("/patterns")}>
                Browse the Pattern Book
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => navigate("/auth?returnTo=/workshop&transfer=1")}
              >
                <Upload className="size-4" /> Open a Studio &amp; transfer these
              </Button>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {games.map((g) => {
                const mould = MOULD_OPTIONS.find((m) => m.id === g.mould);
                return (
                  <Card key={g.id} className="border-2 bg-card/70 paper-lift">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-pressing text-[10px] tracking-[0.2em] text-muted-foreground">
                            LOCAL · {mould?.name ?? g.mould}
                          </p>
                          <CardTitle className="mt-1 text-xl">{g.title}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Cartridge actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() =>
                                setRenaming({ id: g.id, title: g.title })
                              }
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 size-4" /> Re-engrave label
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate("/studio", {
                                  state: {
                                    pattern: g.spec,
                                  },
                                })
                              }
                              className="cursor-pointer"
                            >
                              <RotateCcw className="mr-2 size-4" /> Re-cast dials
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(g.id)}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                      <div className="hidden w-28 shrink-0 sm:block">
                        <MiniCabinet spec={g.spec} />
                      </div>
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="font-pressing text-[11px] leading-5 tracking-wide text-muted-foreground">
                          <p>
                            SPEED {g.spec.pace}/5 · BEST {g.bestScore} ·{" "}
                            {g.plays} PLAY{g.plays === 1 ? "" : "S"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => setPlaying(g)}>
                            <Play className="size-4" /> Play here
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Play dialog */}
      <Dialog
        open={playing !== null}
        onOpenChange={(open) => {
          if (!open) setPlaying(null);
        }}
      >
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>{playing?.title}</DialogTitle>
            <DialogDescription>Playback from the local cabinet.</DialogDescription>
          </DialogHeader>
          {playing && <GameCanvas spec={playing.spec} />}
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
      >
        <DialogContent className="max-w-sm bg-card">
          <DialogHeader>
            <DialogTitle>Re-engrave the label</DialogTitle>
            <DialogDescription>
              Up to 40 characters, pressed in pressing-plant capitals.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renaming?.title ?? ""}
            onChange={(e) =>
              setRenaming((prev) =>
                prev ? { ...prev, title: e.target.value.slice(0, 40) } : prev,
              )
            }
            maxLength={40}
            className="font-pressing"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
