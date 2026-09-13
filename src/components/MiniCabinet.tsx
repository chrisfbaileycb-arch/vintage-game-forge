/**
 * MiniCabinet — a static, one-frame cartridge preview for cards and shelves.
 *
 * Creates the cartridge once, renders a single frame when the card scrolls
 * into view, and stops. No animation loop, no per-frame cost: a hundred
 * pattern cards stay cheap. The full interactive cabinet is GameCanvas.
 */

import { createCartridge } from "@/lib/game/engine";
import type { CartridgeSpec } from "@/lib/game/moulds";
import { useEffect, useRef, useState } from "react";

export function MiniCabinet({ spec, className }: { spec: CartridgeSpec; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(false);
  const cartridgeRef = useRef<ReturnType<typeof createCartridge> | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!cartridgeRef.current) {
      cartridgeRef.current = createCartridge(spec);
    }
    cartridgeRef.current.render(ctx);
  }, [visible, spec]);

  return (
    <canvas
      ref={canvasRef}
      width={360}
      height={480}
      aria-label={`Preview plate for ${spec.title}`}
      className={`block h-auto w-full rounded-sm border border-border/60 bg-black ${className ?? ""}`}
    />
  );
}
