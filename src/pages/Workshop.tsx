import { LogoDropdown } from "@/components/LogoDropdown";
import { GameCanvas } from "@/components/GameCanvas";
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
  MOULD_OPTIONS,
  catalogueNumber,
  normalizeSpec,
  type CartridgeSpec,
  type MouldKind,
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
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function Workshop() {
  const { user } = useAuth();
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
                THE WORKSHOP WALL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.name || user?.email ? (
              <p className="small-caps mr-2 hidden text-xs text-muted-foreground sm:block">
                maker: {user?.name || user?.email}
              </p>
            ) : null}
            <Button onClick={() => navigate("/studio")}>
              <Factory className="size-4" /> New pressing
            </Button>
          </div>
        </header>

        <div className="rule-double" />

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
                  <Card
                    key={g._id}
                    className="border-2 bg-card/70 paper-lift"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-pressing text-[10px] tracking-[0.2em] text-muted-foreground">
                            {catalogueNumber(g._id)} · {mould?.name ?? spec.mould}
                          </p>
                          <CardTitle className="mt-1 text-xl">
                            {g.title}
                          </CardTitle>
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
                    <CardContent className="flex flex-col gap-4">
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
                      <div className="flex gap-2">
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

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
            <DialogDescription>
              Playback from the workshop wall.
            </DialogDescription>
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
    </div>
  );
}
