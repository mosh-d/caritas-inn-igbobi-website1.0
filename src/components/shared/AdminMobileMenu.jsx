import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FiX } from "react-icons/fi";
import { ADMIN_NAV_ITEMS } from "./adminNavItems";
import { useWebSocketContext } from "../../context/WebSocketContext";

export default function AdminMobileMenu({ isOpen, onClose }) {
  const { alertCount } = useWebSocketContext();

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      } transition-opacity duration-300`}
    >
      <div
        className="fixed inset-0 bg-black/80 transition-opacity duration-300"
        onClick={onClose}
        style={{
          opacity: isOpen ? 1 : 0,
          transition: "opacity 300ms ease-in-out",
        }}
      />
      <div
        className={`fixed inset-0 bg-white flex flex-col items-center justify-center gap-12 p-8 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-gray-700 hover:text-gray-900 transition-colors"
          aria-label="Close menu"
        >
          <FiX size="4rem" />
        </button>

        <nav className="w-full max-w-sm overflow-y-auto max-h-full py-8">
          <ul className="flex flex-col gap-3 text-2xl">
            {ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon, end, showAlertBadge }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-5 pt-[1.1rem] pb-[0.7rem] rounded-xl font-bold tracking-wide cursor-pointer transition-all ${
                      isActive
                        ? "bg-[color:var(--emphasis)] text-white shadow-md"
                        : "text-gray-800 hover:bg-black/5"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={22} className="shrink-0 -mt-1" />
                      <span>{label}</span>
                      {showAlertBadge && alertCount > 0 && (
                        <span
                          className={`ml-auto text-xl font-bold rounded-full px-1 pt-1.5 pb-.7 min-w-[2rem] text-center leading-tight ${
                            isActive ? "bg-white text-[color:var(--emphasis)]" : "bg-red-600 text-white"
                          }`}
                        >
                          {alertCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
