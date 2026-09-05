import {
  IoGridOutline,
  IoBedOutline,
  IoCalendarOutline,
  IoAppsOutline,
  IoPeopleOutline,
  IoReceiptOutline,
  IoLogInOutline,
  IoLogOutOutline,
  IoHomeOutline,
  IoBarChartOutline,
  IoMoonOutline,
  IoNotificationsOutline,
  IoDocumentTextOutline,
  IoKeyOutline,
  IoHelpCircleOutline,
  IoRestaurantOutline,
  IoCartOutline,
  IoFastFoodOutline,
} from "react-icons/io5";
import { getStoredStaffRole } from "../../utils/auth";

// Single source of truth for the admin sidebar + mobile menu.
// `showAlertBadge` marks the item that renders the live alert count.
// `managerOnly` items are hidden from a receptionist session; `alwaysVisible`
// items stay visible even in an accountant session, which otherwise sees
// nothing at all. An accountant runs reports and browses the audit trail for
// their own audits (REPORTS, AUDIT TRAIL, both alwaysVisible) — they never
// run the front desk itself, so nothing else on this list applies to them.
// (There used to be an ACCOUNTANT REPORTS page fed by a "Send to Accountant"
// hand-off; reports now carry their own per-staff attribution, so an
// accountant generates them directly and the hand-off is gone.)
// `waitstaffVisible` is the same
// idea for waitstaff, who otherwise see nothing but alwaysVisible items —
// their whole job here is posting food/drink charges (GUEST SALES,
// NON-GUEST SALES), not running the front desk either. `receptionistHidden`
// hides an item from receptionist specifically while leaving every other
// role's access alone — used where the backend itself restricts that one
// role (see GUEST SALES below); developer still sees it, same as every
// other restriction here. See visibleAdminNavItems() below, the one place
// both consumers (AdminNavBar.jsx, AdminMobileMenu.jsx) get this filtered
// list from, so they can never drift from each other.
export const ADMIN_NAV_ITEMS = [
  { to: "/admin/overview", label: "OVERVIEW", icon: IoGridOutline, end: true },
  { to: "/admin/rooms", label: "ROOMS", icon: IoBedOutline },
  { to: "/admin/room-chart", label: "ROOM CHART", icon: IoAppsOutline },
  { to: "/admin/reservations", label: "RESERVATIONS", icon: IoCalendarOutline },
  { to: "/admin/guests", label: "GUESTS", icon: IoPeopleOutline },
  // GUEST FOLIOS no longer posts food/drink (that moved to GUEST SALES
  // below) — a waitron has no reason to be here anymore, so this
  // lost its waitstaffVisible flag; receptionist/manager still use it for
  // everything else a folio needs (payments, room/laundry/other charges).
  { to: "/admin/folios", label: "GUEST FOLIOS", icon: IoReceiptOutline },
  // waitstaffVisible: this is now the only way to post a food/drink charge
  // to a guest folio — an in-house-guest picker instead of hunting for a
  // folio first, plus the printed receipt. Not shown to receptionist: the
  // backend blocks that role from guest-folio food/drink specifically (see
  // FoliosService.addFolioItemsBatch), so a page that's exclusively
  // food/drink has nothing they could actually submit — same
  // defense-in-depth reasoning AdminGuestSales.jsx's own canAccess check
  // applies. No such restriction on non-guest sales (see below), so that
  // one's still open to receptionist/manager pinch-hitting.
  { to: "/admin/guest-sales", label: "GUEST SALES", icon: IoFastFoodOutline, waitstaffVisible: true, receptionistHidden: true },
  // waitstaffVisible: waitrons record these directly; no
  // managerOnly, so receptionist/manager see it too (they can also ring in
  // a non-guest order, e.g. covering the bar when no waitstaff is on duty) —
  // accountant is the only role that never sees it, same as GUEST FOLIOS.
  { to: "/admin/non-guest-sales", label: "NON-GUEST SALES", icon: IoCartOutline, waitstaffVisible: true },
  { to: "/admin/check-ins", label: "CHECK-INS", icon: IoLogInOutline },
  { to: "/admin/check-outs", label: "CHECK-OUTS", icon: IoLogOutOutline },
  { to: "/admin/in-house", label: "IN-HOUSE", icon: IoHomeOutline },
  // alwaysVisible: an accountant runs their own reports for audits too, not
  // just the front-office-sent snapshots on ACCOUNTANT REPORTS.
  { to: "/admin/reports", label: "REPORTS", icon: IoBarChartOutline, alwaysVisible: true },
  { to: "/admin/night-audit", label: "NIGHT AUDIT", icon: IoMoonOutline },
  { to: "/admin/alerts", label: "ALERTS", icon: IoNotificationsOutline, showAlertBadge: true },
  // managerOnly still hides this from receptionist; alwaysVisible additionally
  // shows it to an accountant (the two flags don't conflict — see
  // visibleAdminNavItems()'s accountant branch, which never even reaches
  // managerOnly).
  { to: "/admin/audit-trail", label: "AUDIT TRAIL", icon: IoDocumentTextOutline, managerOnly: true, alwaysVisible: true },
  // managerOnly still keeps pricing/items add-edit-delete out of a
  // receptionist's reach; waitstaffVisible (2026-08-31) lets a waitron view
  // the menu and adjust drink stock here too, now that this page can render
  // for them — see AdminMenu.jsx's own canEdit split for what stays
  // manager-only within the page itself.
  { to: "/admin/menu", label: "MENU", icon: IoRestaurantOutline, managerOnly: true, waitstaffVisible: true },
  { to: "/admin/account", label: "ACCOUNT", icon: IoKeyOutline, alwaysVisible: true },
  { to: "/admin/help", label: "HELP", icon: IoHelpCircleOutline, alwaysVisible: true },
];

export function visibleAdminNavItems() {
  const role = getStoredStaffRole();
  const isDeveloper = role === "developer";
  const isManagerRole = role === "manager" || isDeveloper;
  const isWaitstaffRole = role === "waitron";

  return ADMIN_NAV_ITEMS.filter((item) => {
    if (role === "accountant") return item.alwaysVisible === true;
    if (isWaitstaffRole) return item.alwaysVisible === true || item.waitstaffVisible === true;
    if (item.managerOnly) return isManagerRole;
    // Developer still sees everything, same as it overrides every other
    // role restriction on this list.
    if (item.receptionistHidden && role === "receptionist") return false;
    return true;
  });
}

// Whether the current role can reach a given nav destination at all — same
// filter visibleAdminNavItems() already applies, just queryable for one
// path instead of returning the whole list. Used to gate things that act
// like a shortcut INTO a page (e.g. AdminRoot's new-reservation popup)
// without duplicating the role logic a third time.
export const canAccessNavItem = (to) => visibleAdminNavItems().some((item) => item.to === to);
