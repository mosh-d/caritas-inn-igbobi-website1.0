import { useEffect } from "react";
import { IoClose } from "react-icons/io5";

const WIDTHS = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

/**
 * Shared modal shell for all admin pages.
 * White card, sticky header with title/subtitle + close, scrollable body,
 * optional sticky footer for actions. Closes on ESC and backdrop click.
 */
export default function Modal({
  onClose,
  title,
  subtitle,
  badge,
  children,
  footer,
  size = "lg",
  zIndex = 1000,
  loading = false,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Dialog"}
    >
      <div className={`bg-white rounded-2xl w-full ${WIDTHS[size] || WIDTHS.lg} max-h-[90vh] flex flex-col shadow-2xl font-primary overflow-hidden`}>
        {loading ? (
          <div className="p-20 flex justify-center">{children}</div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 px-8 py-6 border-b border-[color:var(--text-color)]/10 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl font-bold text-[color:var(--black)] leading-tight">{title}</h2>
                  {badge}
                </div>
                {subtitle && <p className="text-xl text-[color:var(--text-color)]/76 mt-1">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="shrink-0 p-2 rounded-lg text-[color:var(--text-color)]/68 hover:text-[color:var(--black)] hover:bg-black/5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[color:var(--emphasis)]"
              >
                <IoClose size={28} />
              </button>
            </div>

            <div className="overflow-y-auto px-8 py-6 flex flex-col gap-8 grow">
              {children}
            </div>

            {footer && (
              <div className="px-8 py-5 border-t border-[color:var(--text-color)]/10 bg-[color:var(--text-color)]/3 flex flex-wrap justify-end items-center gap-3 shrink-0">
                {footer}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
