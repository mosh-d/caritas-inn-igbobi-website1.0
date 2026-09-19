import { useState, useEffect, useRef } from "react";
import { useScroll, useTransform, useReducedMotion } from "motion/react";
import { MotionDiv, EASE_OUT } from "../shared/motion";
import { Words } from "../shared/guestMotion";
import { NavLink, useOutletContext } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import MobileMenu from "../shared/MobileMenu";
import Button from "../shared/Button";
import ButtonInput from "../shared/ButtonInput";
import hero from "../../assets/HERO.jpg";
import mobileHero from "../../assets/MOBILE-HERO.jpg";
import logo from "../../assets/caritas-logo-2.png";

// Define the context type (optional, for TypeScript; can omit if not using TS)
const useSharedContext = () => {
  const context = useOutletContext();
  if (!context) {
    throw new Error(
      "Component must be used within a layout providing shared context",
    );
  }
  return context;
};

export default function HeroSection() {
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

  // The hero's motion (2026-09-19). On load, one arrival in reading order:
  // the photo settles from a slight zoom while the nav drops in, the welcome
  // rises word by word, then the booking controls - fully in place within
  // ~1.7s, since they're what a visitor came to use. On scroll, the photo
  // drifts down at a quarter of the scroll speed, so the hero reads as a
  // window onto the hotel rather than a flat banner. The drift is a plain
  // scroll-linked style, which reducedMotion doesn't reach - so it's zeroed
  // here for anyone who asks for reduced motion.
  const heroRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", reduceMotion ? "0%" : "25%"]);

  // Access shared state from Outlet context
  const {
    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    numberOfRooms,
    setNumberOfRooms,
    roomType,
    setRoomType,
    totalPayment,
    calculateTotalPayment,
    updateTotalPayment,
  } = useSharedContext();

  return (
    <>
      <div
        ref={heroRef}
        data-component="HeroSection"
        className="relative overflow-hidden h-screen min-h-[80rem]"
      >
        {/* The photo is its own layer so it can zoom and drift without
            moving anything drawn on top of it. */}
        <MotionDiv
          aria-hidden="true"
          className="absolute inset-0 bg-no-repeat bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, hsla(359, 30%, 60%, .9), hsla(359, 30%, 60%, .9)), url(${isMobile ? mobileHero : hero})`,
            backgroundBlendMode: "multiply",
            y: photoY,
          }}
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.4, ease: EASE_OUT }}
        />
        
        <MotionDiv
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.2 }}
          data-component="Navbar"
          className="relative z-10 border-b border-[var(--emphasis)]/30 py-4 px-4 md:px-8"
        >
          <div className="flex justify-between items-center w-full">
            {/* Mobile Menu Button - Only shows on mobile */}
            <button
              onClick={toggleMenu}
              className="md:hidden text-2xl text-white flex-shrink-0 cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <FiX size={28} /> : <FiMenu size={28} />}
            </button>

            {/* Invisible spacer to balance the menu button on the left */}
            <div className="md:hidden w-8 flex-shrink-0"></div>

            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden md:block">
              <ul className="flex gap-8">
                <li className="text-lg lg:text-xl text-white">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `block py-2 cursor-pointer ${
                        isActive
                          ? "text-[color:var(--emphasis)] font-bold"
                          : "hover:text-[color:var(--emphasis)]/80 transition-colors"
                      }`
                    }
                    end
                  >
                    HOME
                  </NavLink>
                </li>
                <li className="text-lg lg:text-xl text-white">
                  <NavLink
                    to="/about"
                    className={({ isActive }) =>
                      `block py-2 cursor-pointer ${
                        isActive
                          ? "text-[color:var(--emphasis)] font-bold"
                          : "hover:text-[color:var(--emphasis)]/80 transition-colors"
                      }`
                    }
                  >
                    ABOUT
                  </NavLink>
                </li>
                <li className="text-lg lg:text-xl text-white">
                  <NavLink
                    to="/contact"
                    className={({ isActive }) =>
                      `block py-2 cursor-pointer ${
                        isActive
                          ? "text-[color:var(--emphasis)] font-bold"
                          : "hover:text-[color:var(--emphasis)]/80 transition-colors"
                      }`
                    }
                  >
                    CONTACT
                  </NavLink>
                </li>
              </ul>
            </nav>
            <div className="">
              <div className="w-[12rem] flex-shrink-0">
                <NavLink to="/">
                  <img src={logo} alt="Ring Ruby Hotel Logo" />
                </NavLink>
              </div>
            </div>
            <div className="max-md:w-[24vw] lg:w-[14vw] w-[18vw]"></div>
          </div>
        </MotionDiv>

        <div
          data-component="QuickCheckIn"
          className="absolute z-10 flex flex-col gap-[2rem] w-[50vw] max-sm:w-[80vw] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <Words
            as="h1"
            onLoad
            delay={0.35}
            text="Welcome to Caritas Inn Igbobi"
            className="font-secondary text-6xl font-[900] text-[color:var(--white)] text-center mb-[8rem]"
          />
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.85 }} data-component="CheckingButtons">
            <ButtonInput
              variant="white"
              className="text-2xl w-[50%] p-[2.5rem_2rem_2rem_2rem]"
              value={checkInDate}
              onChange={setCheckInDate}
            >
              Check in
            </ButtonInput>
            <ButtonInput
              variant="white"
              className="text-2xl w-[50%] p-[2.5rem_2rem_2rem_2rem]"
              value={checkOutDate}
              onChange={setCheckOutDate}
            >
              Check out
            </ButtonInput>
          </MotionDiv>
          <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE_OUT, delay: 1.0 }} data-component="ViewRoomsButton">
            <a href="#available-rooms">
              <Button
                variant="emphasis"
                className="text-3xl font-black w-[100%] p-[2.5rem_2rem_2rem_2rem]"
              >
                View Rooms
              </Button>
            </a>
          </MotionDiv>
        </div>
        {/* Mobile Menu */}
        <MobileMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
        />
      </div>
    </>
  );
}
