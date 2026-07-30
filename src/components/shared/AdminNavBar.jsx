import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import AdminMobileMenu from "./AdminMobileMenu";
import { ADMIN_NAV_ITEMS } from "./adminNavItems";
import { useWebSocketContext } from "../../context/WebSocketContext";
import { isManager } from "../../utils/auth";

function AlertCountBadge({ count, active }) {
  if (!count) return null;
  return (
    <span
      className={`ml-auto text-2xl font-bold rounded-full px-3 pt-1 lg:pb-1 min-w-[2rem] text-center leading-tight ${
        active ? "bg-white text-[color:var(--emphasis)]" : "bg-red-600 text-white"
      }`}
    >
      {count}
    </span>
  );
}

export default function AdminNavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { alertCount, refreshAlertCount, disconnectedRefreshTick } = useWebSocketContext();

  // The sidebar only renders inside the authenticated admin layout, so this
  // re-syncs the badge after login (the provider's mount-time fetch happens
  // before auth and fails silently).
  useEffect(() => {
    refreshAlertCount();
  }, [refreshAlertCount]);

  // Fallback: if the socket stays disconnected, keep refreshing the badge
  // via plain HTTP every 30s anyway (see WebSocketContext.jsx) — otherwise
  // an alerts_updated event missed during an outage leaves this badge stale
  // indefinitely, since it's only ever pushed, never polled.
  useEffect(() => {
    if (disconnectedRefreshTick === 0) return;
    refreshAlertCount();
  }, [disconnectedRefreshTick, refreshAlertCount]);

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

      {/* Desktop Sidebar - Hidden on mobile. The background lives on <nav>
          itself (not the <ul>) so it always fills the full sidebar box no
          matter how tall the item list is relative to the viewport — with
          the color on the inner <ul>, its height depended on flex-stretch
          reaching every child correctly, which is what let the last item
          (e.g. Account) render against the wrong background whenever content
          height and viewport height were close. `md:flex` lets <nav> stretch
          to the full height of the layout row even when the page content is
          shorter than the viewport. The layout row is pinned to the viewport
          (AdminRoot), so the sidebar stays put while the main body scrolls;
          overflow-y-auto lets the nav scroll itself if items ever overflow. */}
      <nav className="hidden md:flex overflow-y-auto shrink-0 bg-[color:var(--accent)]/70">
        <ul className="flex flex-col px-[1.6rem] py-[3rem] gap-[0.6rem] min-w-[26rem] w-full">
          {/* `Icon` is used below as the JSX tag <Icon .../>; ESLint's no-unused-vars doesn't
              detect JSX-only usage of a destructured function-parameter binding. */}
          {/* eslint-disable-next-line no-unused-vars */}
          {ADMIN_NAV_ITEMS.filter((item) => !item.managerOnly || isManager()).map(({ to, label, icon: Icon, end, showAlertBadge }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 pt-[1.1rem] pb-[0.7rem] rounded-xl text-2xl font-bold tracking-wide transition-all ${
                    isActive
                      ? "bg-[color:var(--emphasis)] text-white shadow-md"
                      : "text-[color:var(--black)] hover:bg-white/60"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={22} className="shrink-0 -mt-1" />
                    <span>{label}</span>
                    {showAlertBadge && <AlertCountBadge count={alertCount} active={isActive} />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mobile Menu */}
      <AdminMobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
