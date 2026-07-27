import { IoMailOutline, IoCallOutline } from "react-icons/io5";
import CopyIconButton from "./CopyIconButton";

// The clickable call/email portion is a real <a href="mailto:...">/<a
// href="tel:...">, not a JS-triggered navigation — some browsers won't
// dispatch an external protocol handler from a scripted location change,
// but always will from a genuine anchor click. The copy button is a
// sibling, not nested inside the anchor (interactive-in-interactive is
// invalid HTML and unreliable to click).
export default function ContactRow({ type, value }) {
  const isEmail = type === "email";
  const label = isEmail ? "Email" : "Phone";
  const Icon = isEmail ? IoMailOutline : IoCallOutline;
  const hasValue = Boolean(value);
  const href = hasValue ? (isEmail ? `mailto:${value}` : `tel:${value}`) : null;

  const content = (
    <>
      <Icon size={22} className="shrink-0 text-[color:var(--text-color)]/60" />
      <div className="min-w-0">
        <span className="block font-semibold text-[color:var(--text-color)]/68 uppercase tracking-wide text-lg">{label}</span>
        <span className="block font-medium break-all">{value || "N/A"}</span>
      </div>
    </>
  );

  return (
    <div className="flex items-center justify-between gap-4 bg-[color:var(--text-color)]/3 border-1 border-gray-200 rounded-lg text-xl w-full transition-colors">
      {hasValue ? (
        <a
          href={href}
          className="flex items-center gap-3 min-w-0 flex-1 px-5 py-3 rounded-lg hover:bg-[color:var(--text-color)]/6 cursor-pointer transition-colors"
        >
          {content}
        </a>
      ) : (
        <div className="flex items-center gap-3 min-w-0 flex-1 px-5 py-3">{content}</div>
      )}
      {hasValue && (
        <div className="shrink-0 mr-3">
          <CopyIconButton value={value} size={20} />
        </div>
      )}
    </div>
  );
}
