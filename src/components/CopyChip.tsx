import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyChip({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable in this context */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      onClick={doCopy}
      className={
        "group inline-flex cursor-pointer items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-5 py-3 font-mono text-sm text-fog transition-all hover:border-arc/50 hover:text-paper " +
        className
      }
    >
      <span className="text-arc">$</span>
      {text}
      {copied ? (
        <Check className="h-4 w-4 text-arc" />
      ) : (
        <Copy className="h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}
