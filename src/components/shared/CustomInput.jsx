import { useState, useEffect } from "react";
import { IoEyeOffOutline, IoEyeOutline } from "react-icons/io5";

export default function CustomInput({
  variant,
  label,
  id,
  type,
  children,
  value,
  onFocus,
  onBlur,
  className = "",
  ...props
}) {
  const isTextarea = type === "textarea";
  const isPasswordInput = type === "password";
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleFocus = (e) => {
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    if (onBlur) onBlur(e);
  };

  const handleClick = (e) => {
    if (type === "date") {
      // Prevent default behavior to stop the browser from treating it like a text input (zooming, keyboard)
      e.preventDefault();

      // Ensure it's a date input
      e.target.type = "date";

      // Ensure focus (ButtonInput does this)
      e.target.focus();

      try {
        if (e.target.showPicker) {
          e.target.showPicker();
        }
      } catch (err) {
        console.warn("Failed to show picker:", err);
      }
    }
  };

  const placeholder = children || (type === "date" ? "dd/mm/yyyy" : undefined);
  const resolvedInputType = isPasswordInput
    ? isPasswordVisible
      ? "text"
      : "password"
    : type;
  const inputClassName = `w-full text-lg focus:outline-none focus:ring-0 border-b border-b-[color:var(--text-color)]/50 ${
    isPasswordInput ? "pr-12" : ""
  } ${className}`.trim();

  return (
    <>
      <div className="flex w-full flex-col gap-[1rem]">
        {variant === "default" ? (
          <label htmlFor={id} className="block text-xl font-bold">
            {label}
          </label>
        ) : variant === "largeDefault" ? (
          <label
            htmlFor={id}
            className="block text-2xl font-bold text-[color:var(--emphasis)]"
          >
            {label}
          </label>
        ) : (
          <label
            htmlFor={id}
            className="block text-xl font-bold text-[color:var(--emphasis)]"
          >
            {label}
          </label>
        )}
        {isTextarea ? (
          <textarea
            id={id}
            className={`w-full text-lg focus:outline-none focus:ring-0 border-b border-b-[color:var(--text-color)]/50 resize-none ${className}`.trim()}
            placeholder={placeholder}
            style={{
              verticalAlign: "top",
              height: "10rem",
              border: "1px solid var(--text-color)",
              padding: "1rem",
            }}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
        ) : (
          <div className="relative">
            <input
              type={resolvedInputType}
              id={id}
              className={inputClassName}
              placeholder={placeholder}
              value={value}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onClick={handleClick}
              {...props}
            />
            {isPasswordInput && (
              <button
                type="button"
                onClick={() => setIsPasswordVisible((current) => !current)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={
                  isPasswordVisible ? "Hide password" : "Show password"
                }
              >
                {isPasswordVisible ? (
                  <IoEyeOffOutline size={20} />
                ) : (
                  <IoEyeOutline size={20} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

