import { NavLink } from "react-router-dom";

export default function AdminNavBar() {
  return (
    <>
      <nav>
        <ul className="flex flex-col px-[3rem] py-[4rem] gap-[3.2rem] h-full items-start bg-[color:var(--accent)]/70">
          <li className="text-3xl font-bold text-[color:var(--black)]">
            <NavLink
              to="/admin/overview"
              className={({ isActive }) =>
                isActive ? "text-[color:var(--emphasis)] font-black border-b-[3px] border-[color:var(--emphasis)]" : ""
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
                isActive ? "text-[color:var(--emphasis)] font-black border-b-[3px] border-[color:var(--emphasis)]" : ""
              }
            >
              BOOKINGS
            </NavLink>
          </li>
        </ul>
      </nav>
    </>
  );
}
