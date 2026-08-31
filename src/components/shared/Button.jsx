export default function Button({ className, variant, children, ...props }) {
  // disabled:* applies purely from the native `disabled` attribute (the
  // `disabled` prop, spread via ...props below) — independent of `variant`,
  // so every disabled button gets a visible dimmed/not-allowed state even
  // though nothing ever actually passes variant="disabled" in practice
  // (every caller hardcodes its own visual variant like "secondary" and
  // controls enabled/disabled purely via the `disabled` prop). Without
  // this, a disabled button was 100% visually identical to an enabled one
  // — genuinely inert (clicks correctly did nothing), but with no cue why,
  // which read as "the button doesn't work" (see the Reports export
  // buttons that require a Shift selection first).
  const base =
    "tracking-widest outline p-[1rem_2rem_.6rem_2rem] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:cursor-not-allowed disabled:pointer-events-none";

  let variantClasses;

  switch (variant) {
    case "white":
      variantClasses =
        "text-[color:var(--white)] hover:bg-[color:var(--white)]/20 active:bg-[color:var(--white)] active:text-[color:var(--black)] active:outline-[color:var(--white)]";
      break;

    case "emphasis":
      variantClasses =
        "text-[color:var(--emphasis)] hover:bg-[color:var(--emphasis)]/20 active:bg-[color:var(--emphasis)] active:text-[color:var(--white)] active:outline-[color:var(--emphasis)]";
      break;

    case "light-gray":
      variantClasses =
        "text-[color:var(--light-gray)] hover:bg-[color:var(--light-gray)]/20 active:bg-[color:var(--light-gray)] active:text-[color:var(--white)] active:outline-[color:var(--light-gray)]";
      break;

    case "disabled":
      variantClasses =
        "text-gray-500 bg-gray-200 cursor-not-allowed opacity-50";
      break;
  }

  return (
    <button className={`${base} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}
