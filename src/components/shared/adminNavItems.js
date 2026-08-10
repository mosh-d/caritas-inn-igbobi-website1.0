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
} from "react-icons/io5";
import { getStoredStaffRole } from "../../utils/auth";

// Single source of truth for the admin sidebar + mobile menu.
// `showAlertBadge` marks the item that renders the live alert count.
// `managerOnly` items are hidden from a receptionist session; `accountantOnly`
// items are shown ONLY to an accountant session; `waitstaffOnly` items are
// shown ONLY to a waiter/waitress session; `alwaysVisible` items stay
// visible even in an accountant session, which otherwise sees only
// accountantOnly items — an accountant reviews front-office-sent reports
// (ACCOUNTANT REPORTS, accountantOnly), but can also run their own reports
// and browse the audit trail for their own audits (REPORTS, AUDIT TRAIL,
// both alwaysVisible) — they just never run the front desk itself, so
// nothing else on this list applies to them. `waitstaffVisible` is the same
// idea for waitstaff, who otherwise see nothing but alwaysVisible items —
// their whole job here is posting food/drink charges (FOLIOS), not running
// the front desk either. See visibleAdminNavItems() below, the one place
// both consumers (AdminNavBar.jsx, AdminMobileMenu.jsx) get this filtered
// list from, so they can never drift from each other.
export const ADMIN_NAV_ITEMS = [
  { to: "/admin/overview", label: "OVERVIEW", icon: IoGridOutline, end: true },
  { to: "/admin/rooms", label: "ROOMS", icon: IoBedOutline },
  { to: "/admin/room-chart", label: "ROOM CHART", icon: IoAppsOutline },
  { to: "/admin/reservations", label: "RESERVATIONS", icon: IoCalendarOutline },
  { to: "/admin/guests", label: "GUESTS", icon: IoPeopleOutline },
  // waitstaffVisible: a waiter/waitress needs to find a guest's open folio
  // to post a food/drink charge to it — nothing else on this list applies
  // to them (see AdminFolios.jsx for how the page itself scopes down
  // further for this role: open folios only, no tabs, no Create Folio).
  { to: "/admin/folios", label: "FOLIOS", icon: IoReceiptOutline, waitstaffVisible: true },
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
  { to: "/admin/accountant-reports", label: "ACCOUNTANT REPORTS", icon: IoBarChartOutline, accountantOnly: true },
  // Manager-only, same reasoning as room prices — menu prices are pricing
  // config, not a front-desk/waitstaff editing concern (waitstaff browse the
  // menu through the charge-posting picker itself, not this page).
  { to: "/admin/menu", label: "MENU", icon: IoRestaurantOutline, managerOnly: true },
  { to: "/admin/account", label: "ACCOUNT", icon: IoKeyOutline, alwaysVisible: true },
  { to: "/admin/help", label: "HELP", icon: IoHelpCircleOutline, alwaysVisible: true },
];

export function visibleAdminNavItems() {
  const role = getStoredStaffRole();
  const isDeveloper = role === "developer";
  const isManagerRole = role === "manager" || isDeveloper;
  const isAccountantRole = role === "accountant" || isDeveloper;
  const isWaitstaffRole = role === "waiter" || role === "waitress";

  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.accountantOnly) return isAccountantRole;
    if (role === "accountant") return item.alwaysVisible === true;
    if (isWaitstaffRole) return item.alwaysVisible === true || item.waitstaffVisible === true;
    if (item.managerOnly) return isManagerRole;
    return true;
  });
}
