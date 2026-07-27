import { useState, useEffect, useRef } from "react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function DatePicker({
  label,
  value,           // "YYYY-MM-DD" or ""
  onChange,
  minDate,         // "YYYY-MM-DD"
  maxDate,         // "YYYY-MM-DD" or null — hard ceiling (e.g. day before first blocked date for checkout)
  blockedDates = [], // ["YYYY-MM-DD", ...] — individually greyed out with strikethrough
  placeholder = "Select date",
}) {
  const today = toLocalDateStr(new Date());
  const effectiveMin = minDate || today;

  const startDate = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(startDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(startDate.getMonth());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const blockedSet = new Set(blockedDates);

  // Sync view month when value changes externally (e.g. room type reset clears dates)
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isDisabled = (dateStr) => {
    if (dateStr < effectiveMin) return true;
    if (maxDate && dateStr > maxDate) return true;
    if (blockedSet.has(dateStr)) return true;
    return false;
  };

  const handleSelect = (dateStr) => {
    if (isDisabled(dateStr)) return;
    onChange(dateStr);
    setIsOpen(false);
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOffset = new Date(viewYear, viewMonth, 1).getDay();

  return (
    <div className="relative flex flex-col gap-[.8rem] w-full" ref={containerRef}>
      <label className="text-lg font-semibold text-[color:var(--text-color)]">
        {label}
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="bg-transparent border-b border-[color:var(--text-color)]/50 py-2 text-left text-xl focus:outline-none focus:border-[color:var(--emphasis)] hover:border-[color:var(--emphasis)] transition-colors"
      >
        {value || <span className="text-gray-400 text-xl">{placeholder}</span>}
      </button>

      {/* Dropdown calendar */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl w-[320px] select-none">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              type="button"
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 hover:text-[color:var(--emphasis)] transition-colors text-2xl font-bold"
            >
              ‹
            </button>
            <span className="text-lg font-semibold text-[color:var(--text-color)]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 hover:text-[color:var(--emphasis)] transition-colors text-2xl font-bold"
            >
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-3">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-sm font-semibold text-gray-400 pb-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-3 pb-4 gap-y-1">
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const disabled = isDisabled(dateStr);
              const isBlocked = blockedSet.has(dateStr);
              const isPast = dateStr < effectiveMin;
              const isSelected = dateStr === value;
              const isToday = dateStr === today;

              let cellClass =
                "w-full aspect-square rounded-full text-base flex items-center justify-center transition-colors ";

              if (isSelected) {
                cellClass += "bg-[color:var(--emphasis)] text-white font-bold";
              } else if (disabled) {
                if (isBlocked) {
                  // Specifically booked — grey with strikethrough
                  cellClass += "text-gray-300 line-through cursor-not-allowed";
                } else {
                  // Past or beyond max — plain grey
                  cellClass += "text-gray-200 cursor-not-allowed";
                }
              } else if (isToday) {
                cellClass +=
                  "border border-[color:var(--emphasis)] text-[color:var(--emphasis)] font-semibold hover:bg-[color:var(--emphasis)]/10 cursor-pointer";
              } else {
                cellClass +=
                  "text-[color:var(--text-color)] hover:bg-[color:var(--emphasis)]/10 cursor-pointer";
              }

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelect(dateStr)}
                  disabled={disabled}
                  title={isBlocked ? "Not available — already booked" : undefined}
                  className={cellClass}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-4 pb-3 flex items-center gap-3 border-t border-gray-100 pt-2">
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <span className="inline-block w-3 h-3 rounded-full border border-[color:var(--emphasis)]" />
              Today
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-400">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-200" />
              Unavailable
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
