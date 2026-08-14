import { useRef, useEffect } from "react";

// A <textarea> that grows its own height to fit its content as it's typed,
// instead of relying on a manual resize-drag handle or an internal
// scrollbar. `rows` sets the starting (minimum) height, same meaning as on
// a native textarea — every description/notes/remarks-style field in the
// admin uses this instead of a single-line <input> so longer text is
// actually readable while being entered, not scrolled through sideways.
export default function AutoGrowTextarea({ value, rows = 2, className = "", ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return <textarea ref={ref} rows={rows} value={value} className={className} {...rest} />;
}
