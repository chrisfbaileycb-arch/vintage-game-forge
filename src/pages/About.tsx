import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "react-router";

export default function About() {
  return (
    <div className="paper-texture min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6">
        <SiteNav subtitle="ABOUT THE FOUNDRY" />

        <div className="rule-double" />

        <section className="py-10">
          <p className="small-caps text-sm text-muted-foreground">Final plate</p>
          <h1 className="engraved mt-1 text-4xl font-semibold">
            About &amp; originality statement
          </h1>
        </section>

        <div className="space-y-6 pb-16">
          <Card className="border-2 bg-card/70">
            <CardHeader>
              <CardTitle className="engraved text-2xl">
                An original foundry
              </CardTitle>
              <CardDescription>
                What The Cartridge Foundry is, and what it deliberately is not.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-foreground/90">
              <p>
                The Cartridge Foundry is an original hobby project: a browser
                workshop for pressing playable vintage-style arcade cartridges.
                Every engine, character, visual asset, sound, name, and
                configuration in it was created for this project. No code,
                sprites, sounds, fonts, levels, or other assets were extracted
                from any commercial game, and no ROM or console technology is
                emulated.
              </p>
              <p>
                The games belong to broad, unprotectable genre families — ball
                and bat, trail growth, formation defense, maze navigation,
                scrolling obstacle courses, excavation, climbing, stacking,
                and traffic crossing. Genre mechanics themselves are not owned
                by anyone; what would be protected is a specific expression of
                them. The Foundry's expression is entirely its own: original
                mould names, original characters such as Boots the Badger,
                Sprocket the Squirrel, and Pip the Pigeon, original palettes
                and label language, original board layouts generated
                procedurally from seeds, and original synthesized sounds.
              </p>
              <p>
                No trademarked titles, trade dress, character silhouettes,
                distinctive colour combinations, or signature animations from
                commercial games appear in this application — in its
                interface, its metadata, its generated content, or its public
                descriptions. Any resemblance to particular commercial works
                is limited to the shared genre vocabulary that predates and
                outlasts any single title.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 bg-card/70">
            <CardHeader>
              <CardTitle className="engraved text-2xl">
                How a cartridge is made
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                <strong>Choose a mould.</strong> Nine engine families, from the
                Breaker's ball-and-bat arena to Pip the Pigeon's ten-lane
                thoroughfare. Each mould is a real engine, not a skin.
              </p>
              <p>
                <strong>Set the dials.</strong> Every dial measurably changes
                the game — board shape, speeds, hazard density, growth,
                handling, timers, and rules. A live difficulty proof shows
                pace, complexity, reflex and strategy demand, and expected
                session length as you turn them.
              </p>
              <p>
                <strong>Press &amp; Seal.</strong> The dials and a run seed are
                validated, pressed, and sealed into a cartridge. The seed makes
                runs deterministic: the same cartridge, same dials, same seed —
                the same board every time.
              </p>
              <p>
                <strong>Play, share, re-cast.</strong> Every cartridge has a
                playable cabinet page and a share link. Re-casting copies a
                cartridge's or a pattern's dials into your Studio without
                overwriting the original.
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 bg-card/70">
            <CardHeader>
              <CardTitle className="engraved text-2xl">Accessibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                Cabinets are keyboard-operable: click or tab into a cabinet,
                then use arrows or WASD, Space to act, P to pause. Screen
                objectives, scores, and progress are mirrored in text outside
                the canvas. Touch targets meet the 44-pixel minimum, scanline
                effects are toggleable, and reduced-motion preferences are
                honoured for particle effects.
              </p>
              <p>
                Sign-in is optional: anonymous makers keep their presses in a
                local cabinet in this browser, and signed-in makers keep them
                in a server-side Workshop with shareable cabinet pages and a
                public display case.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link to="/studio">Enter the Studio</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/patterns">Browse the Pattern Book</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Back to the Foundry</Link>
            </Button>
          </div>

          <p className="font-pressing pt-6 text-[10px] tracking-[0.25em] text-muted-foreground">
            THE CARTRIDGE FOUNDRY · PRESSED DAILY · EST. MMXXVI · ORIGINAL WORK ONLY
          </p>
        </div>
      </div>
    </div>
  );
}
