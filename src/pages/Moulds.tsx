import { MiniCabinet } from "@/components/MiniCabinet";
import { SiteNav } from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PATTERNS } from "@/lib/game/patterns";
import { MOULD_OPTIONS } from "@/lib/game/moulds";
import { Link } from "react-router";

/** One representative pattern per mould, for the specimen plate. */
function specimenFor(mouldId: string) {
  return PATTERNS.find((p) => p.spec.mould === mouldId)?.spec;
}

export default function Moulds() {
  return (
    <div className="paper-texture min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <SiteNav subtitle="THE MOULD RACK" />

        <div className="rule-double" />

        <section className="py-10">
          <p className="small-caps text-sm text-muted-foreground">Chapter II</p>
          <h1 className="engraved mt-1 text-4xl font-semibold">
            The mould rack
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Nine cast-iron moulds, each one a complete game engine. Choose a
            mould, set its dials in the Studio, and the Foundry presses a
            sealed cartridge. Every mould below is a working press — the
            specimen plate on each card is cast live from a real pattern.
          </p>
        </section>

        <div className="grid gap-8 pb-16 md:grid-cols-2">
          {MOULD_OPTIONS.map((m, i) => {
            const specimen = specimenFor(m.id);
            return (
              <article
                key={m.id}
                id={m.id}
                className="flex scroll-mt-24 gap-5 rounded-lg border-2 bg-card/70 p-6 paper-lift"
              >
                <div className="flex-1">
                  <p className="font-pressing text-[10px] tracking-[0.25em] text-muted-foreground">
                    PLATE {String(i + 1).padStart(2, "0")}
                  </p>
                  <h2 className="engraved mt-1 text-2xl font-semibold">{m.name}</h2>
                  <p className="small-caps mt-1 text-sm text-primary">{m.tagline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                    {m.blurb}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {m.dials.map((d) => (
                      <Badge
                        key={d}
                        variant="secondary"
                        className="font-pressing text-[10px]"
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link
                        to="/studio"
                        state={{
                          pattern: specimen,
                        }}
                      >
                        Cast this mould
                      </Link>
                    </Button>
                    {specimen && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/play/standalone?pattern=${PATTERNS.find((p) => p.spec.mould === m.id)!.id}`}>
                          Play the specimen
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
                {specimen && (
                  <div className="hidden w-36 shrink-0 sm:block">
                    <MiniCabinet spec={specimen} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
