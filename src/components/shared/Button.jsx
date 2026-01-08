export default function Button({ className, variant, children, ...props }) {
  const base =
    "tracking-widest outline p-[1rem_2rem_.6rem_2rem] hover:cursor-pointer";

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
