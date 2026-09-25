import { NavLink } from "react-router-dom";
import { IoLockClosedOutline } from "react-icons/io5";
import { adminPageTitle, defaultAdminPath } from "./adminNavItems";
import { btn } from "./ui";

// Shown in place of a page the signed-in role may not open (2026-09-24).
// The sidebar only ever lists what a role can reach, so getting here means
// the page was asked for another way: a typed URL, an old bookmark, a link
// from elsewhere. It names the page that was refused and offers the role's
// own first page, since "go back" may be nowhere useful.
export default function Unauthorized({ path }) {
  const home = defaultAdminPath();
  return (
    <div
      data-component="Unauthorized"
      className="px-[4rem] max-sm:px-[1rem] py-[6rem] flex flex-col items-start gap-[2.4rem]"
    >
      <div className="flex items-center gap-4">
        <span className="w-[5rem] h-[5rem] rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <IoLockClosedOutline size={26} />
        </span>
        <h1 className="text-5xl font-secondary font-bold text-[color:var(--black)]">Not authorized</h1>
      </div>

      <p className="text-2xl text-[color:var(--text-color)]/76 max-w-[64rem]">
        Your role isn&apos;t authorized to open {adminPageTitle(path)}. If you need it for your
        work, ask a manager to grant it or to do it for you.
      </p>

      <NavLink to={home} className={btn.primary}>
        Go to {adminPageTitle(home)}
      </NavLink>
    </div>
  );
}
