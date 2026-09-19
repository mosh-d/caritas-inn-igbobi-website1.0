import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import MobileMenu from "./MobileMenu";
import { MotionDiv, EASE_OUT } from "./motion";
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
      <MotionDiv
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="px-4 md:px-8">
        <div className="border-b border-[var(--text-color)]/20 py-4">
          <div className="flex justify-between items-center w-full">
            {/* Mobile Menu Button - Only shows on mobile. The placeholder holds
                its place in this row; the button itself is fixed to the top-left
                corner so it stays in reach at any scroll depth, and portalled to
                <body> - this navbar is its own stacking context, and a transformed
                ancestor while it animates in, either of which would pin a fixed
                child inside it. z-40 keeps it under every full-screen overlay. */}
            <div className="md:hidden w-[28px] h-[28px] flex-shrink-0" aria-hidden="true" />
            {createPortal(
              <button
                onClick={toggleMenu}
                className="md:hidden fixed top-[12px] left-[12px] z-40 flex items-center justify-center w-[44px] h-[44px] rounded-[12px] bg-[color:var(--emphasis)] text-white shadow-lg shadow-black/25 cursor-pointer transition-transform active:scale-95"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>,
              document.body,
            )}

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
      </MotionDiv>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
