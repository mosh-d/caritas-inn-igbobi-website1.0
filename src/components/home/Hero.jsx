import { useState, useEffect, useRef } from "react";
import { NavLink, useOutletContext } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import MobileMenu from "../shared/MobileMenu";
import Button from "../shared/Button";
import ButtonInput from "../shared/ButtonInput";
import hero from "../../assets/HERO.jpg";
// import heroVideo from "../../assets/HERO-VIDEO.mp4";
import logo from "../../assets/caritas-logo-2.png";

// Define the context type (optional, for TypeScript; can omit if not using TS)
const useSharedContext = () => {
  const context = useOutletContext();
  if (!context) {
    throw new Error(
      "Component must be used within a layout providing shared context"
    );
  }
  return context;
};

export default function HeroSection() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const videoRef = useRef(null);

  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check if video is already loaded (cached) and force play for Safari
  useEffect(() => {
    if (videoRef.current) {
      // Safari requires the muted property to be set on the DOM element
      videoRef.current.muted = true;

      // Attempt to play programmatically
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Auto-play was prevented:", error);
        });
      }
    }

    if (videoRef.current && videoRef.current.readyState >= 3) {
      setVideoLoaded(true);
    }
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
        data-component="HeroSection"
        className="relative bg-no-repeat bg-cover bg-center h-screen min-h-[80rem]"
        style={{
          backgroundImage: !videoLoaded
            ? `linear-gradient(to bottom, hsla(359, 30%, 60%, .9), hsla(359, 30%, 60%, .9)), url(${hero})`
            : "none",
          backgroundBlendMode: "multiply",
        }}
      >
        {/* Background Video */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
        >
          {/* commented out because video was not ready */}
          {/* <source src={heroVideo} type="video/mp4" /> */}
        </video>

        {/* Dark overlay for video */}
        <div
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(to bottom, hsla(359, 30%, 20%, .9), hsla(359, 30%, 20%, .9))",
            mixBlendMode: "multiply",
          }}
        />
        <div
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
        </div>

        <div
          data-component="QuickCheckIn"
          className="absolute z-10 flex flex-col gap-[2rem] w-[50vw] max-sm:w-[80vw] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <h1 className="font-secondary text-6xl font-[900] text-[color:var(--white)] text-center mb-[8rem]">
            Welcome to Caritas Inn Igbobi
          </h1>
          <div data-component="CheckingButtons">
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
          </div>
          <div data-component="ViewRoomsButton">
            <a href="#available-rooms">
              <Button
                variant="emphasis"
                className="text-3xl font-black w-[100%] p-[2.5rem_2rem_2rem_2rem]"
              >
                View Rooms
              </Button>
            </a>
          </div>
        </div>
        {/* Mobile Menu */}
        <MobileMenu
          isOpen={isMenuOpen && isMobile}
          onClose={() => setIsMenuOpen(false)}
        />
      </div>
    </>
  );
}
