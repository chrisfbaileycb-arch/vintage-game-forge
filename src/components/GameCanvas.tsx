/**
 * GameCanvas — React wrapper around the cartridge engine.
 *
 * Owns the rAF loop, input (remappable keyboard, scoped so the page is never
 * hijacked; touch; gamepad), the archival HUD strip, foundry bells chimes,
 * and the chiptune music loop — all started/stopped with run state and
 * disposed cleanly on unmount.
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
import { FINISH_OPTIONS, PALETTE_OPTIONS } from "@/lib/game/moulds";
import { createFoundryBells } from "@/lib/game/bells";
import { createFoundryMusic, moodForMould } from "@/lib/game/music";
import {
  loadAudio,
  loadControls,
  subscribeSettings,
  type ControlBindings,
  type GameAction,
} from "@/lib/settings";
import { cn } from "@/lib/utils";
import {
  Gamepad2,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const CANVAS_W = 360;
const CANVAS_H = 480;

const ALL_ACTIONS: GameAction[] = [
  "left",
  "right",
  "up",
  "down",
  "fire",
  "pause",
];

export function GameCanvas({
  spec,
  className,
  showHud = true,
  onSubmitScore,
  onRunEnd,
}: {
  spec: CartridgeSpec;
  className?: string;
  showHud?: boolean;
  onSubmitScore?: (score: number) => void;
  /** Fired once when a run ends (won or lost) with the final score. */
  onRunEnd?: (result: { score: number; outcome: "won" | "lost" }) => void;
}) {
  return (
    <CartridgeView
      key={JSON.stringify(spec)}
      spec={spec}
      className={className}
      showHud={showHud}
      onSubmitScore={onSubmitScore}
      onRunEnd={onRunEnd}
    />
  );
}

function CartridgeView({
  spec,
  className,
  showHud,
  onSubmitScore,
  onRunEnd,
}: {
  spec: CartridgeSpec;
  className?: string;
  showHud: boolean;
  onSubmitScore?: (score: number) => void;
  onRunEnd?: (result: { score: number; outcome: "won" | "lost" }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<EngineInput>(emptyInput());
  const gamepadRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
  });
  const pauseEdgeRef = useRef(false);
  const gamepadActiveRef = useRef(false);
  const [hud, setHud] = useState<HudState | null>(null);
  const [muted, setMuted] = useState(!loadAudio().bells);
  const [scanlines, setScanlines] = useState(true);
  const [gamepadActive, setGamepadActive] = useState(false);

  const [cartridge] = useState(() => createCartridge(spec));

  // ---- Settings ----------------------------------------------------------

  const controlsRef = useRef<ControlBindings>(loadControls());
  const audioRef = useRef(loadAudio());
  useEffect(() => {
    return subscribeSettings(() => {
      controlsRef.current = loadControls();
      audioRef.current = loadAudio();
      setMuted(!audioRef.current.bells);
      // Live-update the music engine: volume always, stop if the loop is
      // switched off mid-run, and start an engine if it was off at mount.
      if (audioRef.current.music && !musicRef.current) {
        const music = createFoundryMusic();
        music.setVolume(audioRef.current.volume);
        musicRef.current = music;
      } else if (musicRef.current) {
        musicRef.current.setVolume(audioRef.current.volume);
        if (!audioRef.current.music) musicRef.current.stop();
      }
    });
  }, []);

  const mutedRef = useRef(true);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Latest-callback refs so the rAF loop sees fresh handlers without restart.
  const onRunEndRef = useRef(onRunEnd);
  useEffect(() => {
    onRunEndRef.current = onRunEnd;
  }, [onRunEnd]);

  // ---- Bells (chiptune chimes on engine events) ---------------------------

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

  // ---- Music loop ---------------------------------------------------------

  const musicRef = useRef<ReturnType<typeof createFoundryMusic> | null>(null);
  useEffect(() => {
    if (!audioRef.current.music) return;
    const music = createFoundryMusic();
    musicRef.current = music;
    music.setVolume(audioRef.current.volume);
    return () => {
      music.stop();
      music.dispose();
      musicRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- rAF loop -----------------------------------------------------------

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    cartridge.setScanlines(scanlines);
    let lastHud: HudState | null = null;
    let prevState: string | null = null;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (pauseEdgeRef.current) {
        pauseEdgeRef.current = false;
        cartridge.togglePause();
      }
      const merged = mergedInput(inputRef.current, gamepadRef.current);
      cartridge.update(dt, merged);
      cartridge.render(ctx);
      // Music follows run state.
      const st = cartridge.hud.state;
      const music = musicRef.current;
      if (music) {
        if (st === "playing") {
          music.start(moodForMould(spec.mould));
        } else {
          music.stop();
        }
      }
      // Detect a finished run exactly once (playing → won/lost transition).
      if (prevState === "playing" && (st === "won" || st === "lost")) {
        onRunEndRef.current?.({ score: cartridge.hud.score, outcome: st });
      }
      prevState = st;
      if (cartridge.hud !== lastHud) {
        lastHud = cartridge.hud;
        setHud(lastHud);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      musicRef.current?.stop();
    };
  }, [cartridge, spec.mould]);

  // ---- Scanline toggle ----------------------------------------------------

  useEffect(() => {
    cartridge.setScanlines(scanlines);
  }, [cartridge, scanlines]);

  // ---- Input: remappable keyboard, scoped to the focused cabinet ----------

  const cabinetRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) return;
    const setKey = (e: KeyboardEvent, down: boolean) => {
      const input = inputRef.current;
      const b = controlsRef.current;
      let handled = false;
      for (const action of ALL_ACTIONS) {
        if (b[action].includes(e.key)) {
          if (action === "pause") {
            if (down) cartridge.togglePause();
          } else {
            input[action] = down;
          }
          handled = true;
          break;
        }
      }
      if (handled) e.preventDefault();
    };
    const onDown = (e: KeyboardEvent) => setKey(e, true);
    const onUp = (e: KeyboardEvent) => setKey(e, false);
    const onBlur = () => {
      const input = inputRef.current;
      input.left = false;
      input.right = false;
      input.up = false;
      input.down = false;
      input.fire = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      onBlur();
    };
  }, [cartridge, focused]);

  // ---- Input: gamepad polling (first connected pad; D-pad + face button) --

  useEffect(() => {
    let rafGp = 0;
    let lastPause = false;
    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let pad: Gamepad | null = null;
      for (const p of pads) {
        if (p && p.connected) {
          pad = p;
          break;
        }
      }
      const gp = gamepadRef.current;
      if (pad) {
        const ax = pad.axes[0] ?? 0;
        const dx = Math.abs(ax) > 0.5 ? Math.sign(ax) : 0;
        const ay = pad.axes[1] ?? 0;
        const dy = Math.abs(ay) > 0.5 ? Math.sign(ay) : 0;
        const btn = (i: number) => Boolean(pad!.buttons[i]?.pressed);
        gp.left = dx < 0 || btn(14);
        gp.right = dx > 0 || btn(15);
        gp.up = dy < 0 || btn(12);
        gp.down = dy > 0 || btn(13);
        gp.fire = btn(0) || btn(1) || btn(2) || btn(3);
        const pauseNow = btn(9);
        if (pauseNow && !lastPause) pauseEdgeRef.current = true;
        lastPause = pauseNow;
        if (!gamepadActiveRef.current) {
          gamepadActiveRef.current = true;
          setGamepadActive(true);
        }
      } else {
        gp.left = gp.right = gp.up = gp.down = gp.fire = false;
        if (gamepadActiveRef.current) {
          gamepadActiveRef.current = false;
          setGamepadActive(false);
        }
      }
      rafGp = requestAnimationFrame(poll);
    };
    rafGp = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafGp);
  }, []);

  // ---- Input: touch -------------------------------------------------------

  const touchActive = useRef(false);
  const touchMode = useRef<"steer" | "look" | null>(null);
  const lastPointerX = useRef(0);
  const lastPointerY = useRef(0);
  const isLookMould = spec.mould === "maze" || spec.mould === "flyer";

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      touchActive.current = true;
      lastPointerX.current = x;
      lastPointerY.current = y;
      touchMode.current = isLookMould ? "look" : "steer";
      const input = inputRef.current;
      if (isLookMould) {
        input.fire = false;
      } else {
        input.fire = true;
        input.left = x < 0.5;
        input.right = x >= 0.5;
      }
    },
    [isLookMould],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!touchActive.current) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const input = inputRef.current;
      if (touchMode.current === "look") {
        const dx = x - lastPointerX.current;
        const dy = y - lastPointerY.current;
        lastPointerX.current = x;
        lastPointerY.current = y;
        input.left = dx < -0.01;
        input.right = dx > 0.01;
        input.up = dy < -0.02 || Math.abs(dx) > 0.02;
        input.down = dy > 0.02;
        if (spec.mould === "flyer") input.up = true;
        return;
      }
      const onLeft = x < 0.5;
      input.left = onLeft;
      input.right = !onLeft;
    },
    [spec.mould],
  );

  const onPointerUp = useCallback(() => {
    touchActive.current = false;
    touchMode.current = null;
    const input = inputRef.current;
    input.fire = false;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
  }, []);

  // ---- Virtual d-pad helpers (touch, maze-like moulds) ---------------------

  const dpadPress = (action: "left" | "right" | "up" | "down", down: boolean) => {
    inputRef.current[action] = down;
  };

  const paletteLabel = PALETTE_OPTIONS.find((p) => p.id === spec.palette)?.label;
  const finishLabel = FINISH_OPTIONS.find((f) => f.id === spec.finish)?.label;

  const showDpad =
    showHud &&
    (spec.mould === "maze" || spec.mould === "burrower" || spec.mould === "scaffolding");

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
              {gamepadActive && (
                <span className="flex items-center gap-1 font-pressing text-[10px] text-muted-foreground">
                  <Gamepad2 className="size-3" /> gamepad
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 font-pressing text-sm">{hud.objective}</p>
          <p className="font-pressing text-xs text-muted-foreground">
            {hud.progressLabel} · score {hud.score} · seals {hud.seals}
          </p>
          {hud.message && (
            <p className="mt-1 font-pressing text-xs text-primary">{hud.message}</p>
          )}
        </div>
      )}

      <div
        ref={cabinetRef}
        tabIndex={0}
        role="application"
        aria-label={`${spec.title} — game cabinet. Click or tab here, then play with keyboard, touch, or gamepad.`}
        className="crt-curve bezel-riveted paper-lift relative mx-auto w-full max-w-[420px] touch-none select-none rounded-md border-2 bg-black p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
        }}
        onPointerDown={(e) => {
          cabinetRef.current?.focus();
          onPointerDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block h-auto w-full"
        />
      </div>

      {/* Virtual d-pad for maze-like moulds on touch devices */}
      {showDpad && (
        <div className="mx-auto grid w-56 grid-cols-3 gap-2 sm:hidden">
          <span />
          <Button
            variant="outline"
            aria-label="Up"
            onPointerDown={() => dpadPress("up", true)}
            onPointerUp={() => dpadPress("up", false)}
            onPointerLeave={() => dpadPress("up", false)}
          >
            ↑
          </Button>
          <span />
          <Button
            variant="outline"
            aria-label="Left"
            onPointerDown={() => dpadPress("left", true)}
            onPointerUp={() => dpadPress("left", false)}
            onPointerLeave={() => dpadPress("left", false)}
          >
            ←
          </Button>
          <Button
            variant="outline"
            aria-label="Down"
            onPointerDown={() => dpadPress("down", true)}
            onPointerUp={() => dpadPress("down", false)}
            onPointerLeave={() => dpadPress("down", false)}
          >
            ↓
          </Button>
          <Button
            variant="outline"
            aria-label="Right"
            onPointerDown={() => dpadPress("right", true)}
            onPointerUp={() => dpadPress("right", false)}
            onPointerLeave={() => dpadPress("right", false)}
          >
            →
          </Button>
        </div>
      )}

      {showHud && hud && (
        <div className="mx-auto flex w-full max-w-[420px] flex-wrap items-center justify-center gap-2">
          {onSubmitScore && (hud.state === "won" || hud.state === "lost") && (
            <Button size="sm" variant="outline" onClick={() => onSubmitScore(hud.score)}>
              File score to the ledger
            </Button>
          )}
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
          <Button size="sm" variant="ghost" onClick={() => setScanlines((s) => !s)}>
            <ScanLine className="size-4" />
            {scanlines ? "Grille on" : "Grille off"}
          </Button>
          <p className="font-pressing w-full text-center text-xs text-muted-foreground">
            {isLookMould
              ? "← → turn · ↑ walk · SPACE start · P pause"
              : "← → steer · SPACE fire / tap · P pause"}
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

/** Merge keyboard/touch state with live gamepad state. */
function mergedInput(
  base: EngineInput,
  pad: { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean },
): EngineInput {
  if (!pad.left && !pad.right && !pad.up && !pad.down && !pad.fire) {
    return base;
  }
  return {
    left: base.left || pad.left,
    right: base.right || pad.right,
    up: base.up || pad.up,
    down: base.down || pad.down,
    fire: base.fire || pad.fire,
  };
}
