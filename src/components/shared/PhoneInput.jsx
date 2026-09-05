import { useState } from "react";
import { COUNTRY_OPTIONS, NG_DIAL, composePhone, parsePhone } from "../../utils/phone-format";

/**
 * A phone field that collects the country code explicitly, defaulting to
 * Nigeria (+234). Emits a single string like "+2348148216795" through
 * onChange, so every call site keeps storing one value exactly as before —
 * the split is purely how it is entered.
 *
 * The point is guest identity: the backend matches guests on a hash of the
 * phone number (see utils/phone-format.js), so "08148216795" typed on one
 * visit and "+234 814 821 6795" on the next used to create two profiles for
 * one person. Collecting the code instead of guessing it stops new splits
 * at the source.
 *
 * Styling is passed in rather than baked in, because this is used both in
 * the admin PMS (ui.js `field` classes) and on the public booking form
 * (CustomInput's underlined look), which share no visual language.
 */
export default function PhoneInput({
  value,
  onChange,
  id,
  placeholder = "8012345678",
  disabled = false,
  required = false,
  selectClassName = "",
  inputClassName = "",
  className = "",
  onFocus,
  onBlur,
}) {
  const parsed = parsePhone(value);
  // Remembers the chosen country while the number itself is empty — with
  // nothing to parse, the dial code would otherwise snap back to Nigeria
  // the moment a foreign guest cleared the field to retype it.
  const [lastDial, setLastDial] = useState(parsed.dial);
  const dial = parsed.national ? parsed.dial : lastDial;

  const handleDialChange = (nextDial) => {
    setLastDial(nextDial);
    onChange(composePhone(nextDial, parsed.national));
  };

  const handleNationalChange = (raw) => {
    // A pasted full international number carries its own country code, so
    // honour it rather than jamming it onto the currently selected one.
    if (raw.trim().startsWith("+") || raw.trim().startsWith("00")) {
      const next = parsePhone(raw);
      setLastDial(next.dial);
      onChange(composePhone(next.dial, next.national));
      return;
    }
    let digits = raw.replace(/\D/g, "");
    // The trunk 0 in "0801..." is a domestic-dialling prefix, not part of
    // the number — keeping it would produce +2340801... and match nothing.
    if (dial === NG_DIAL) digits = digits.replace(/^0+/, "");
    onChange(composePhone(dial, digits));
  };

  return (
    <div className={`flex gap-2 items-stretch ${className}`.trim()}>
      <select
        aria-label="Country code"
        title="Country code"
        value={dial}
        onChange={(e) => handleDialChange(e.target.value)}
        disabled={disabled}
        className={`shrink-0 max-w-[13rem] ${selectClassName}`.trim()}
      >
        {COUNTRY_OPTIONS.map((country) => (
          <option key={country.dial} value={country.dial}>
            {country.label}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        id={id}
        value={parsed.national}
        onChange={(e) => handleNationalChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`flex-1 min-w-0 ${inputClassName}`.trim()}
      />
    </div>
  );
}
