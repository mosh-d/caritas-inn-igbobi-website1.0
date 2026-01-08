import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FiX } from "react-icons/fi";

export default function MobileMenu({ isOpen, onClose }) {
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

        <nav className="w-full">
          <ul className="flex flex-col items-center gap-8 text-2xl">
            <li>
              <NavLink
                to="/"
                onClick={onClose}
                className={({ isActive }) =>
                  `block py-2 cursor-pointer ${
                    isActive
                      ? "text-[color:var(--emphasis)] font-bold"
                      : "text-gray-800"
                  }`
                }
                end
              >
                HOME
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/about"
                onClick={onClose}
                className={({ isActive }) =>
                  `block py-2 cursor-pointer ${
                    isActive
                      ? "text-[color:var(--emphasis)] font-bold"
                      : "text-gray-800"
                  }`
                }
              >
                ABOUT
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/contact"
                onClick={onClose}
                className={({ isActive }) =>
                  `block py-2 cursor-pointer ${
                    isActive
                      ? "text-[color:var(--emphasis)] font-bold"
                      : "text-gray-800"
                  }`
                }
              >
                CONTACT
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
