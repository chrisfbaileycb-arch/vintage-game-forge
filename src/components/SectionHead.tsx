import { motion } from "framer-motion";
import type { ReactNode } from "react";

const VP = { once: true, margin: "-90px" } as const;

export default function SectionHead({
  index,
  kicker,
  title,
  desc,
  className = "",
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  desc?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center gap-3 font-pixel text-[9px] uppercase tracking-[0.24em] text-neon"
      >
        <span className="inline-block h-px w-8 bg-neon/60" />
        {index} — {kicker}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VP}
        transition={{ duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 max-w-2xl text-balance font-pixel text-2xl leading-[1.35] md:text-[2rem]"
      >
        {title}
      </motion.h2>
      {desc ? (
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 max-w-xl text-base leading-relaxed text-fog"
        >
          {desc}
        </motion.p>
      ) : null}
    </div>
  );
}
