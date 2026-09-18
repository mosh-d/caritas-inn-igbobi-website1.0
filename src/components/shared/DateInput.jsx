// The one date field for every form, on the guest site and in the PMS alike
// (owner, 2026-09-18). It is the browser's own date input, so a phone still
// gets its native picker, but a click anywhere on it opens the calendar - not
// only the small calendar icon at its edge. showPicker() is in every current
// browser; where it is missing, or refused (a disabled or read-only field),
// the click simply does what it always did.
export default function DateInput({ className = "", onClick, ...props }) {
  const openCalendar = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || props.disabled || props.readOnly) return;
    try {
      e.currentTarget.showPicker?.();
    } catch {
      // Not allowed here (a cross-origin frame, say): leave the click alone.
    }
  };

  return (
    <input
      type="date"
      {...props}
      className={`${className} cursor-pointer`.trim()}
      onClick={openCalendar}
    />
  );
}
