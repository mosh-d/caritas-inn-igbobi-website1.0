import { useLocation } from "react-router-dom";
import { IoArrowForward, IoSwapHorizontalOutline } from "react-icons/io5";
import Logo from "../components/shared/Logo";
import { adminPageTitle, isAdminPage } from "../components/shared/adminNavItems";
import { btn } from "../components/shared/ui";

// The PMS moved to the group website (2026-09-28): every branch in one
// place, at fivecloverhotels.com/pms, with the same usernames and
// passwords. Every /admin address here now says so and opens the same page
// there - query included, so a bookmark or a link to one booking
// (?reservation_id=...) still lands on it, after signing in if need be.
const GROUP_PMS_URL = "https://fivecloverhotels.com/pms";

// Old addresses that became sections of another page.
const RENAMED = { "guest-sales": "fnb-sales", "non-guest-sales": "fnb-sales" };

export default function AdminMovedToPms() {
  const { pathname, search } = useLocation();
  const slug = pathname.replace(/\/+$/, "").split("/")[2] || "";
  const target = RENAMED[slug] || slug;
  const page = target && isAdminPage(`/admin/${target}`) ? `/admin/${target}` : null;
  const title = page ? adminPageTitle(page) : null;
  const href = page ? `${GROUP_PMS_URL}/${target}${search}` : GROUP_PMS_URL;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[color:var(--background-color)] px-4 py-16">
      <div className="w-full max-w-3xl flex flex-col items-center gap-10">
        <Logo />
        <div className="w-full bg-white rounded-2xl border border-[color:var(--text-color)]/15 shadow-sm p-10 max-sm:p-6 flex flex-col gap-8">
          <div className="flex items-start gap-5">
            <IoSwapHorizontalOutline size={30} className="shrink-0 mt-1 text-[color:var(--emphasis)]" />
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-semibold text-[color:var(--black)]">
                {title ? `${title} has moved to the new PMS.` : "The PMS has moved."}
              </h1>
              <p className="text-xl text-[color:var(--text-color)]/76">
                Every branch&apos;s PMS is now in one place, at fivecloverhotels.com/pms. Sign in there with your usual username and password.
              </p>
            </div>
          </div>
          <a href={href} className={`${btn.primary} self-start inline-flex items-center gap-3`}>
            {title ? `Open ${title} in the new PMS` : "Open the new PMS"}
            <IoArrowForward size={20} />
          </a>
        </div>
      </div>
    </main>
  );
}
