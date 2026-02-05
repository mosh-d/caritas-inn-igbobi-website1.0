import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import AdminMobileMenu from "./AdminMobileMenu";

export default function AdminNavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Button - Only shows on mobile */}
      <button
        onClick={toggleMenu}
        className="md:hidden fixed top-10 right-10 z-40 text-2xl text-white bg-[color:var(--emphasis)] p-3 rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      {/* Desktop Sidebar - Hidden on mobile */}
      <nav className="hidden md:block">
        <ul className="flex flex-col px-[3rem] py-[4rem] gap-[3.2rem] h-full items-start bg-[color:var(--accent)]/70">
          <li className="text-3xl font-bold text-[color:var(--black)]">
            <NavLink
              to="/admin/overview"
              className={({ isActive }) =>
                isActive
                  ? "text-[color:var(--emphasis)] font-black border-b-[3px] border-[color:var(--emphasis)]"
                  : ""
              }
              end
            >
              OVERVIEW
            </NavLink>
          </li>
          <li className="text-3xl font-bold text-[color:var(--black)]">
            <NavLink
              to="/admin/bookings"
              className={({ isActive }) =>
                isActive
                  ? "text-[color:var(--emphasis)] font-black border-b-[3px] border-[color:var(--emphasis)]"
                  : ""
              }
            >
              BOOKINGS
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Mobile Menu */}
      <AdminMobileMenu
        isOpen={isMenuOpen && isMobile}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
