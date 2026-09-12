/**
 * GameCanvas — React wrapper around the cartridge engine.
 *
 * Owns the rAF loop, keyboard + touch input, the archival HUD strip, and the
 * foundry bells (chiptune chimes wired to engine events when the cartridge
 * was pressed with bells: true).
 */

import { Button } from "@/components/ui/button";
import {
  createCartridge,
  emptyInput,
  type CartridgeHandle,
  type EngineInput,
  type HudState,
} from "@/lib/game/engine";
import type { CartridgeSpec } from "@/lib/game/moulds";
import { FINISH_OPTIONS, FRAME_OPTIONS, PALETTE_OPTIONS } from "@/lib/game/moulds";
import { createFoundryBells } from "@/lib/game/bells";
import { cn } from "@/lib/utils";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const CANVAS_W = 360;
const CANVAS_H = 480;

export function GameCanvas({
  spec,
  className,
  showHud = true,
}: {
  spec: CartridgeSpec;
  className?: string;
  showHud?: boolean;
}) {
  return (
    <CartridgeView
      key={JSON.stringify(spec)}
      spec={spec}
      className={className}
      showHud={showHud}
    />
  );
}

function CartridgeView({
  spec,
  className,
  showHud,
}: {
  spec: CartridgeSpec;
  className?: string;
  showHud: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<EngineInput>(emptyInput());
  const [hud, setHud] = useState<HudState | null>(null);
  const [muted, setMuted] = useState(true);

  const [cartridge] = useState(() => createCartridge(spec));

  // Wire the foundry bells to engine events (only when the spec asks for them).
  useEffect(() => {
    if (!spec.bells) return;
    const bells = createFoundryBells();
    const off = cartridge.onEvent((event) => {
      if (!mutedRef.current) bells.play(event);
    });
    return () => {
      off();
      bells.dispose();
    };
  }, [cartridge, spec.bells]);

  const mutedRef = useRef(true);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // rAF loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastHud: HudState | null = null;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      cartridge.update(dt, inputRef.current);
      cartridge.render(ctx);
      if (cartridge.hud !== lastHud) {
        lastHud = cartridge.hud;
        setHud(lastHud);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cartridge]);

  // Keyboard: arrows/WASD steer, Space/Enter fires, P pauses.
  useEffect(() => {
    const setKey = (e: KeyboardEvent, down: boolean) => {
      const input = inputRef.current;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          input.left = down;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          input.right = down;
          break;
        case "ArrowUp":
        case "w":
        case "W":
          input.up = down;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          input.down = down;
          break;
        case " ":
          input.fire = down;
          break;
        case "Enter":
          input.fire = down;
          break;
        case "p":
        case "P":
          if (down) cartridge.togglePause();
          return;
        default:
          return;
      }
      e.preventDefault();
    };
    const onDown = (e: KeyboardEvent) => setKey(e, true);
    const onUp = (e: KeyboardEvent) => setKey(e, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [cartridge]);

  // Touch: hold left/right half to steer, press to fire.
  const touchActive = useRef(false);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    touchActive.current = true;
    inputRef.current.fire = true;
    inputRef.current.left = x < 0.5;
    inputRef.current.right = x >= 0.5;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!touchActive.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    inputRef.current.left = x < 0.5;
    inputRef.current.right = x >= 0.5;
  }, []);

  const onPointerUp = useCallback(() => {
    touchActive.current = false;
    inputRef.current.fire = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
  }, []);

  const paletteLabel = PALETTE_OPTIONS.find((p) => p.id === spec.palette)?.label;
  const finishLabel = FINISH_OPTIONS.find((f) => f.id === spec.finish)?.label;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {showHud && hud && (
        <div className="rounded-md border bg-card/70 px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="stamp text-[10px]">{spec.mould} mould</p>
            <div className="flex items-baseline gap-3">
              {hud.combo >= 2 && (
                <span className="font-pressing text-xs font-bold text-primary">
                  COMBO ×{hud.combo}
                </span>
              )}
              <p className="font-pressing text-xs tracking-widest text-muted-foreground">
                BEST {String(hud.best).padStart(5, "0")}
              </p>
            </div>
          </div>
          <p className="mt-1 font-pressing text-sm">{hud.objective}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.round(hud.progress * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {hud.progressLabel} · {hud.seals} seal{hud.seals === 1 ? "" : "s"}{" "}
            remaining
          </p>
        </div>
      )}

      <div
        className="bezel-riveted paper-lift relative mx-auto w-full max-w-[420px] touch-none select-none rounded-md border-2 bg-secondary/40 p-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block h-auto w-full rounded-sm"
        />
      </div>

      {showHud && hud && (
        <div className="mx-auto flex w-full max-w-[420px] flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={() => cartridge.start()}>
            <Play className="size-4" />
            {hud.state === "playing" ? "Restart" : "Press Play"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => cartridge.togglePause()}
            disabled={hud.state !== "playing" && hud.state !== "paused"}
          >
            <Pause className="size-4" />
            {hud.state === "paused" ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => cartridge.reset()}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
          {spec.bells && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={muted ? "Ring the foundry bells" : "Silence the bells"}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              {muted ? "Bells off" : "Bells on"}
            </Button>
          )}
          <p className="font-pressing w-full text-center text-xs text-muted-foreground">
            ← → steer · SPACE fire / tap · P pause
            {hud.message ? ` · ${hud.message}` : ""}
          </p>
          <p className="small-caps w-full text-center text-[11px] text-muted-foreground">
            {paletteLabel} · {finishLabel}
          </p>
        </div>
      )}
    </div>
  );
}
