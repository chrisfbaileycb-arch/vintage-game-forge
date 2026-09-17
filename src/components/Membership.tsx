import { Check, Crown, Gamepad2, Heart, Sparkles, Star } from "lucide-react";

const PLANS = [
  {
    name: "Free Player",
    price: "$0",
    note: "Forever",
    description: "Jump into the public arcade and find your next favorite game.",
    features: ["Play the featured arcade", "Weekly community picks", "Download .replay cartridges"],
    action: "PLAY FOR FREE",
    href: "#library",
    tone: "border-white/10 bg-panel",
  },
  {
    name: "Founding Player",
    price: "$5",
    note: "per month",
    description: "Help shape the Forge and get the good stuff before everyone else.",
    features: ["Everything in Free Player", "Full vault access", "Cloud save slots", "Founding player badge", "Early access to new games"],
    action: "JOIN THE FOUNDING CREW",
    href: "#join",
    tone: "border-neon/55 bg-gradient-to-b from-neon/15 to-panel shadow-[0_0_45px_rgba(255,46,136,.12)]",
    featured: true,
  },
  {
    name: "Game Maker",
    price: "$12",
    note: "per month",
    description: "For creators who want to build, publish, and grow an audience.",
    features: ["Everything in Founding Player", "Private cartridges", "Creator profile", "Unlimited cloud drafts", "Featured game submissions"],
    action: "BUILD YOUR ARCADE",
    href: "#builder",
    tone: "border-arc/25 bg-panel",
  },
];

export default function Membership() {
  return (
    <section id="membership" className="relative border-y border-white/10 bg-panel/35 py-24 md:py-32">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-25" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[.18em] text-gold"><Crown className="h-3.5 w-3.5" /> Founding membership</div>
          <h2 className="mt-6 font-pixel text-[clamp(1.45rem,3.5vw,2.4rem)] leading-[1.45]">KEEP THE ARCADE<br /><span className="text-glow-neon text-neon">WEIRD &amp; ALIVE</span></h2>
          <p className="mt-5 text-base leading-relaxed text-fog sm:text-lg">The arcade is free to enter. Membership is for players who want to support original games, unlock more ways to play, and help decide what gets forged next.</p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`relative flex flex-col rounded-3xl border p-6 ${plan.tone}`}>
              {plan.featured && <div className="absolute -top-3 left-6 rounded-full bg-neon px-3 py-1 font-pixel text-[8px] tracking-wider text-ink">MOST POPULAR</div>}
              <div className="flex items-start justify-between gap-3"><div><p className="font-pixel text-xs text-paper">{plan.name}</p><p className="mt-3 text-sm leading-relaxed text-fog">{plan.description}</p></div>{plan.featured ? <Heart className="h-5 w-5 shrink-0 fill-neon text-neon" /> : <Gamepad2 className="h-5 w-5 shrink-0 text-arc" />}</div>
              <div className="mt-7 flex items-end gap-2"><span className="font-pixel text-3xl text-paper">{plan.price}</span><span className="pb-1 font-mono text-xs text-fog">{plan.note}</span></div>
              <ul className="mt-7 space-y-3 border-t border-white/10 pt-6">{plan.features.map((feature) => <li key={feature} className="flex items-center gap-2 text-sm text-fog"><Check className="h-4 w-4 shrink-0 text-arc" />{feature}</li>)}</ul>
              <a href={plan.href} className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-center font-pixel text-[9px] tracking-wider transition-all hover:-translate-y-0.5 ${plan.featured ? "bg-neon text-ink hover:bg-arc" : "border border-white/15 text-paper hover:border-arc/60 hover:text-arc"}`}><Sparkles className="h-3.5 w-3.5" />{plan.action}</a>
            </div>
          ))}
        </div>

        <div id="join" className="mx-auto mt-10 max-w-3xl rounded-2xl border border-gold/20 bg-gold/5 p-5 text-center"><p className="font-mono text-xs leading-relaxed text-fog"><Star className="mr-1 inline h-3.5 w-3.5 text-gold" /> Early membership is a promise, not a charge: we’ll share the roadmap, listen to founding players, and only turn on payments when the first premium features are ready.</p></div>
      </div>
    </section>
  );
}
