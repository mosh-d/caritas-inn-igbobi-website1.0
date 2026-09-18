import Button from "./Button";
import DateInput from "./DateInput";
import { useRef } from "react";

export default function ButtonInput({
  variant,
  children,
  onClick,
  value,
  onChange,
  ...buttonProps
}) {
  const inputRef = useRef(null);

  const handleButtonClick = (e) => {
    e.preventDefault();
    // A click on the date field itself has already opened the calendar
    // (DateInput). This covers the rest of the button - its padding - so the
    // whole button opens it, as it always has.
    if (inputRef.current && e.target !== inputRef.current) {
      inputRef.current.focus();
      try {
        inputRef.current.showPicker?.();
      } catch {
        // The browser refused; focusing the field is all that is left to do.
      }
    }
    if (onClick) onClick();
  };

  return (
    <Button variant={variant} onClick={handleButtonClick} {...buttonProps}>
      <div className="relative w-full">
        <DateInput
          ref={inputRef}
          min={new Date().toISOString().split('T')[0]}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            border: 'none',
            backgroundColor: 'transparent',
            WebkitAppearance: 'none',
            appearance: 'none',
            zIndex: 1
          }}
          className="[&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-[color:var(--text-color)]"
          value={value}
          onChange={(e) => {
            if (onChange) onChange(e.target.value);
          }}
        />
        <span className="w-full h-full flex items-center justify-center">
          {value || children}
        </span>
      </div>
    </Button>
  );
}
