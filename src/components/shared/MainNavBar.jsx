import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import MobileMenu from "./MobileMenu";
import logo from "../../assets/caritas-logo.png";

export default function MainNavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 640 : false);

  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <div className="px-4 md:px-8">
        <div className="border-b border-[var(--text-color)]/20 py-4">
          <div className="flex justify-between items-center w-full">
            {/* Mobile Menu Button - Only shows on mobile */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-2xl text-[color:var(--text-color)] flex-shrink-0"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
            </button>

            {/* Invisible spacer to balance the menu button on the left */}
            <div className="md:hidden w-8 flex-shrink-0"></div>

            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden md:block">
              <ul className="flex gap-8">
                <li className="text-lg lg:text-xl text-[color:var(--text-color)]">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      isActive
                        ? "text-[color:var(--emphasis)] font-black"
                        : "hover:text-[color:var(--emphasis)]/80 transition-colors"
                    }
                    end
                  >
                    HOME
                  </NavLink>
                </li>
                <li className="text-lg lg:text-xl text-[color:var(--text-color)]">
                  <NavLink
                    to="/about"
                    className={({ isActive }) =>
                      isActive
                        ? "text-[color:var(--emphasis)] font-black"
                        : "hover:text-[color:var(--emphasis)]/80 transition-colors"
                    }
                  >
                    ABOUT
                  </NavLink>
                </li>
                <li className="text-lg lg:text-xl text-[color:var(--text-color)]">
                  <NavLink
                    to="/contact"
                    className={({ isActive }) =>
                      isActive
                        ? "text-[color:var(--emphasis)] font-black"
                        : "hover:text-[color:var(--emphasis)]/80 transition-colors"
                    }
                  >
                    CONTACT
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Logo - Centered */}
            <div className="w-32 md:w-48 flex-shrink-0">
              <NavLink to="/">
                <img
                  src={logo}
                  alt="Ring Ruby Hotel Logo"
                  className="w-full h-auto"
                />
              </NavLink>
            </div>
            <div className="md:w-[20vw] w-[18vw]"></div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMenuOpen && isMobile}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
