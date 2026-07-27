import { useState } from "react";
import { IoCopyOutline, IoCheckmarkOutline } from "react-icons/io5";
import { btn } from "./ui";

// Single shared copy-to-clipboard control, used everywhere something needs a
// "copy this" affordance (payment references, contact details, transaction
// receipts) — icon-only inline by default, or with a text `label` for a
// standalone action (styled like any other secondary button). Always shows
// the same "Copied!" confirmation pill so it reads identically everywhere,
// instead of drifting into a mix of floating tooltips, button-label swaps,
// and plain inline text across call sites.
export default function CopyIconButton({ value, label, size = 16, className = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — the text is still visible to copy by hand.
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        aria-label={label || "Copy to clipboard"}
        className={
          label
            ? `${btn.secondary} flex items-center gap-2 ${className}`
            : `inline-flex items-center justify-center p-1 rounded-md text-[color:var(--text-color)]/50 hover:text-[color:var(--emphasis)] hover:bg-black/5 transition-colors cursor-pointer shrink-0 ${className}`
        }
      >
        {copied ? (
          <IoCheckmarkOutline size={label ? 20 : size} className="text-green-600" />
        ) : (
          <IoCopyOutline size={label ? 20 : size} />
        )}
        {label}
      </button>
      {copied && (
        <span className="text-sm font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full whitespace-nowrap">
          Copied!
        </span>
      )}
    </span>
  );
}
