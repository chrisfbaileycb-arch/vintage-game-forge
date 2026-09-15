import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";

const STATS: { value: number; fmt: (v: number) => string; label: string; sub: string }[] = [
  {
    value: 1204,
    fmt: (v) => Math.round(v).toLocaleString("en-US"),
    label: "Games in the vault",
    sub: "+26 added this month",
  },
  {
    value: 96402,
    fmt: (v) => Math.round(v).toLocaleString("en-US"),
    label: "Players this week",
    sub: "peak 8,412 concurrent",
  },
  {
    value: 2341870,
    fmt: (v) => Math.round(v).toLocaleString("en-US"),
    label: "Save states written",
    sub: "a lot of paused jump-kicks",
  },
  {
    value: 99.99,
    fmt: (v) => v.toFixed(2) + "%",
    label: "Uptime",
    sub: "last 12 months, cores included",
  },
];

function Num({ value, fmt }: { value: number; fmt: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const mv = useMotionValue(0);
  const text = useTransform(mv, fmt);

  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.9, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [inView, mv, value]);

  return <motion.span ref={ref}>{text}</motion.span>;
}

export default function Stats() {
  return (
    <section id="stats" className="relative border-y border-white/8 bg-panel/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 flex items-center gap-3 font-pixel text-[9px] uppercase tracking-[0.24em] text-neon"
        >
          <span className="inline-block h-px w-8 bg-neon/60" />
          03 — High scores
        </motion.p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="font-vt text-xl uppercase tracking-[0.18em] text-fog">
                {s.label}
              </div>
              <div className="mt-3 font-pixel text-[clamp(1.2rem,2.6vw,1.9rem)] leading-tight text-paper">
                <Num value={s.value} fmt={s.fmt} />
              </div>
              <div className="mt-3 text-xs text-fog/60">{s.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
