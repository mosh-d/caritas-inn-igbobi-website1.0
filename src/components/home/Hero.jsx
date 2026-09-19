import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { animate, useScroll, useTransform, useReducedMotion } from "motion/react";
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

  // "View Rooms" glides down to the rooms instead of jumping (2026-09-19):
  // ease-in-out, over a duration that grows with the distance, so a long trip
  // doesn't feel abrupt and a short one doesn't drag. Any wheel, touch or key
  // from the visitor takes over at once rather than fighting them. Reduced
  // motion jumps straight there. On small screens it stops short of the
  // heading by the fixed burger's height, so the burger doesn't cover it.
  const glideToRooms = (event) => {
    const target = document.getElementById("available-rooms");
    if (!target) return; // still loading - let the plain anchor handle it
    event.preventDefault();
    const clearance = window.innerWidth < 768 ? 72 : 0;
    const to = target.getBoundingClientRect().top + window.scrollY - clearance;
    if (reduceMotion) {
      window.scrollTo(0, to);
      return;
    }
    const from = window.scrollY;
    const controls = animate(from, to, {
      duration: Math.min(1.6, Math.max(0.7, Math.abs(to - from) / 1400)),
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (y) => window.scrollTo(0, y),
    });
    const takeOver = ["wheel", "touchstart", "keydown"];
    const release = () => takeOver.forEach((type) => window.removeEventListener(type, stop));
    const stop = () => {
      controls.stop();
      release();
    };
    takeOver.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    controls.then(release);
  };

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
            <a href="#available-rooms" onClick={glideToRooms}>
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
