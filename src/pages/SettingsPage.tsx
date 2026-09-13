import { SiteNav } from "@/components/SiteNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  applyBinding,
  DEFAULT_AUDIO,
  DEFAULT_BINDINGS,
  GAME_ACTIONS,
  keyLabel,
  loadAudio,
  loadControls,
  resetControls,
  saveAudio,
  saveControls,
  type AudioSettings,
  type ControlBindings,
  type GameAction,
} from "@/lib/settings";
import { RotateCcw, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * Settings — remap the cabinet controls and tune the audio, all stored
 * device-local. Changes broadcast to every mounted game cabinet instantly.
 */

export default function SettingsPage() {
  const [bindings, setBindings] = useState<ControlBindings>(loadControls);
  const [capturing, setCapturing] = useState<GameAction | null>(null);
  const [audio, setAudio] = useState<AudioSettings>(loadAudio);

  // Key capture: next keydown binds to the pending action.
  useEffect(() => {
    if (!capturing) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setCapturing(null);
        return;
      }
      setBindings((prev) => {
        const next = applyBinding(prev, capturing, e.key);
        saveControls(next);
        return next;
      });
      setCapturing(null);
      toast.success(`${keyLabel(e.key)} → ${capturing}`);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturing]);

  const updateAudio = (patch: Partial<AudioSettings>) => {
    setAudio((prev) => {
      const next = { ...prev, ...patch };
      saveAudio(next);
      return next;
    });
  };

  return (
    <div className="paper-texture min-h-screen">
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6">
        <SiteNav subtitle="THE CONTROL ROOM" />
        <div className="rule-double" />

        <section className="py-10">
          <div className="flex items-center gap-3">
            <Settings2 className="size-6 text-primary" />
            <h1 className="engraved text-3xl font-semibold">Cabinet settings</h1>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Bindings and audio are kept on this device and applied to every
            cabinet the moment you change them.
          </p>
        </section>

        <Card className="border-2 bg-card/70 paper-lift">
          <CardHeader>
            <CardTitle>Control bindings</CardTitle>
            <CardDescription>
              Press a slot, then press the key you want. A key can only drive
              one action at a time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {GAME_ACTIONS.map(({ action, label, hint }) => {
                const keys = bindings[action];
                return (
                  <li
                    key={action}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <p className="font-pressing text-sm">{label}</p>
                      <p className="small-caps text-xs text-muted-foreground">
                        {hint}
                      </p>
                    </div>
                    <Button
                      variant={capturing === action ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCapturing(action)}
                    >
                      {capturing === action
                        ? "Press a key… (Esc to cancel)"
                        : keys.map(keyLabel).join(" / ")}
                    </Button>
                  </li>
                );
              })}
            </ul>
            <Separator className="my-4" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetControls();
                setBindings({ ...DEFAULT_BINDINGS });
                toast.success("Bindings reset to the house standard.");
              }}
            >
              <RotateCcw className="size-4" /> Reset bindings
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6 border-2 bg-card/70 paper-lift">
          <CardHeader>
            <CardTitle>Audio</CardTitle>
            <CardDescription>
              Chiptune loop and foundry bells, mixed on this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-pressing text-sm">Chiptune loop</p>
                <p className="small-caps text-xs text-muted-foreground">
                  Original foundry loops while a run is live
                </p>
              </div>
              <Switch
                checked={audio.music}
                onCheckedChange={(v) => updateAudio({ music: v })}
                aria-label="Toggle chiptune loop"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-pressing text-sm">Foundry bells</p>
                <p className="small-caps text-xs text-muted-foreground">
                  Default chime state for newly opened cabinets
                </p>
              </div>
              <Switch
                checked={audio.bells}
                onCheckedChange={(v) => updateAudio({ bells: v })}
                aria-label="Toggle foundry bells"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-pressing text-sm">Master volume</p>
                <p className="small-caps text-xs text-muted-foreground">
                  {Math.round(audio.volume * 100)}%
                </p>
              </div>
              <Slider
                value={[audio.volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => updateAudio({ volume: v })}
                aria-label="Master volume"
              />
            </div>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateAudio({ ...DEFAULT_AUDIO });
                  toast.success("Audio returned to house mix.");
                }}
              >
                <RotateCcw className="size-4" /> Reset audio
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground">
          Gamepads need no mapping: D-pad or left stick steers, any face button
          acts, and Start pauses — detected automatically when a pad connects.
        </p>
      </div>
    </div>
  );
}
