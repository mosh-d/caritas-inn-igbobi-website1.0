import { NavLink, useNavigate } from "react-router-dom";
import Logo from "../../assets/caritas-logo-2.png";
import { logout } from "../../utils/auth";

export default function AdminTopBar() {
  const navigate = useNavigate();
  const isLogin = window.location.pathname === "/admin";

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
  };

  if (isLogin) return null;

  return (
    <div
      data-component="AdminTopBar"
      className="w-full flex justify-between items-center bg-[color:var(--text-color)] px-6 py-4 shadow-md"
    >
      <button
        onClick={handleLogout}
        className="cursor-pointer px-4 py-2 text-lg font-medium text-white bg-[color:var(--emphasis)] hover:bg-[color:var(--emphasis)]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--emphasis)] transition-colors"
      >
        Logout
      </button>
      <div className="w-48 flex-shrink-0">
        <NavLink to="/admin/overview" className="block">
          <img
            src={Logo}
            alt="Five Clover Hotel Logo"
            className="w-full h-auto"
          />
        </NavLink>
      </div>
      <div className="w-24"></div> {/* Spacer to balance the layout */}
    </div>
  );
}
