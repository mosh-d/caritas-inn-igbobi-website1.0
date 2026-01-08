import Button from "./Button";
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
    if (inputRef.current) {
      // Focus and show picker if available, otherwise just focus
      inputRef.current.focus();
      if (typeof inputRef.current.showPicker === 'function') {
        try {
          inputRef.current.showPicker();
        } catch (err) {
          // If showPicker fails, the browser will handle the click naturally
          inputRef.current.click();
        }
      } else {
        inputRef.current.click();
      }
    }
    if (onClick) onClick();
  };

  return (
    <Button variant={variant} onClick={handleButtonClick} {...buttonProps}>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="date"
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
