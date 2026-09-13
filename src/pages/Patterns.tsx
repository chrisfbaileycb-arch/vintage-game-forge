import { MiniCabinet } from "@/components/MiniCabinet";
import { SiteNav } from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rateSpec } from "@/lib/game/dials";
import { MOULD_OPTIONS } from "@/lib/game/moulds";
import { PATTERNS, patternsByMould } from "@/lib/game/patterns";
import { Play, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

export default function Patterns() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [mouldFilter, setMouldFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PATTERNS.filter((p) => {
      if (mouldFilter !== "all" && p.spec.mould !== mouldFilter) return false;
      const r = rateSpec(p.spec);
      if (difficultyFilter !== "all") {
        const band =
          r.overall >= 7 ? "hard" : r.overall >= 5.5 ? "medium" : "gentle";
        if (band !== difficultyFilter) return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.spec.mould.includes(q)
      );
    });
  }, [query, mouldFilter, difficultyFilter]);

  const byMould = useMemo(() => {
    const map = new Map<string, typeof PATTERNS>();
    for (const p of filtered) {
      const list = map.get(p.spec.mould) ?? [];
      list.push(p);
      map.set(p.spec.mould, list);
    }
    return map;
  }, [filtered]);

  const visibleMoulds = MOULD_OPTIONS.filter((m) => byMould.has(m.id));

  return (
    <div className="paper-texture min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <SiteNav subtitle="THE PATTERN BOOK" />

        <div className="rule-double" />

        <section className="py-10">
          <p className="small-caps text-sm text-muted-foreground">Chapter III</p>
          <h1 className="engraved mt-1 text-4xl font-semibold">
            The pattern book — {PATTERNS.length} named games
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            One hundred house patterns, each a complete dial setting with its
            own seed, difficulty rating, and board. Every card below casts the
            real configuration — Play launches the actual preset, Re-cast
            copies its dials into your Studio without touching the master.
          </p>
        </section>

        {/* Sticky filters */}
        <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <Label htmlFor="pattern-search" className="small-caps text-xs">
                Search
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="pattern-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles and descriptions…"
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label className="small-caps text-xs">Mould</Label>
              <Select value={mouldFilter} onValueChange={setMouldFilter}>
                <SelectTrigger className="mt-1 w-44">
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
            <div>
              <Label className="small-caps text-xs">Difficulty</Label>
              <Select
                value={difficultyFilter}
                onValueChange={setDifficultyFilter}
              >
                <SelectTrigger className="mt-1 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="gentle">Gentle</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p
              className="small-caps pb-2 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {filtered.length} of {PATTERNS.length} shown
            </p>
          </div>

          {/* Section quick-nav */}
          {visibleMoulds.length > 1 && (
            <nav
              aria-label="Pattern sections"
              className="mt-2 flex flex-wrap gap-1"
            >
              {visibleMoulds.map((m) => (
                <a
                  key={m.id}
                  href={`#patterns-${m.id}`}
                  className="small-caps rounded border bg-card/60 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {m.name.replace("Mould №", "№")}
                  <span className="ml-1 font-pressing">{byMould.get(m.id)?.length}</span>
                </a>
              ))}
            </nav>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-12 pt-8">
          {visibleMoulds.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">
              No patterns match those filters. Loosen the search or choose
              another mould.
            </p>
          )}
          {visibleMoulds.map((m) => {
            const entries = byMould.get(m.id)!;
            return (
              <section key={m.id} id={`patterns-${m.id}`} className="scroll-mt-40">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="engraved text-2xl font-semibold">{m.name}</h2>
                  <p className="small-caps text-sm text-primary">{m.tagline}</p>
                </div>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {entries.map((entry) => {
                    const r = rateSpec(entry.spec);
                    const band =
                      r.overall >= 7
                        ? "HARD"
                        : r.overall >= 5.5
                          ? "MEDIUM"
                          : "GENTLE";
                    return (
                      <li
                        key={entry.id}
                        className="flex flex-col rounded-md border-2 bg-card/70 p-3 paper-lift"
                      >
                        <MiniCabinet spec={entry.spec} />
                        <div className="mt-2 flex items-start justify-between gap-2">
                          <p className="font-pressing text-sm font-semibold leading-tight">
                            {entry.name}
                          </p>
                          <Badge
                            variant="secondary"
                            className="font-pressing shrink-0 text-[9px]"
                          >
                            {band} {r.overall.toFixed(1)}
                          </Badge>
                        </div>
                        <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                          {entry.blurb}
                        </p>
                        <p className="font-pressing mt-1 text-[10px] tracking-wide text-muted-foreground">
                          ~{r.sessionMinutes} MIN · SEED #
                          {(entry.spec.seed >>> 0).toString(16).toUpperCase()}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            className="min-h-9 flex-1"
                            onClick={() =>
                              navigate(`/play/standalone?pattern=${entry.id}`)
                            }
                          >
                            <Play className="size-3.5" /> Play
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-9 flex-1"
                            onClick={() =>
                              navigate("/studio", {
                                state: { pattern: entry.spec },
                              })
                            }
                          >
                            <RotateCcw className="size-3.5" /> Re-cast
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
