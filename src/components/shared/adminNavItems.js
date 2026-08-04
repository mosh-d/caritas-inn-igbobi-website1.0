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
} from "react-icons/io5";
import { getStoredStaffRole } from "../../utils/auth";

// Single source of truth for the admin sidebar + mobile menu.
// `showAlertBadge` marks the item that renders the live alert count.
// `managerOnly` items are hidden from a receptionist session; `accountantOnly`
// items are shown ONLY to an accountant session; `alwaysVisible` items stay
// visible even in an accountant session (which otherwise sees only
// accountantOnly items — the accountant's whole job here is reviewing sent
// reports, not running the front desk). See visibleAdminNavItems() below,
// the one place both consumers (AdminNavBar.jsx, AdminMobileMenu.jsx) get
// this filtered list from, so they can never drift from each other.
export const ADMIN_NAV_ITEMS = [
  { to: "/admin/overview", label: "OVERVIEW", icon: IoGridOutline, end: true },
  { to: "/admin/rooms", label: "ROOMS", icon: IoBedOutline },
  { to: "/admin/room-chart", label: "ROOM CHART", icon: IoAppsOutline },
  { to: "/admin/reservations", label: "RESERVATIONS", icon: IoCalendarOutline },
  { to: "/admin/guests", label: "GUESTS", icon: IoPeopleOutline },
  { to: "/admin/folios", label: "FOLIOS", icon: IoReceiptOutline },
  { to: "/admin/check-ins", label: "CHECK-INS", icon: IoLogInOutline },
  { to: "/admin/check-outs", label: "CHECK-OUTS", icon: IoLogOutOutline },
  { to: "/admin/in-house", label: "IN-HOUSE", icon: IoHomeOutline },
  { to: "/admin/reports", label: "REPORTS", icon: IoBarChartOutline },
  { to: "/admin/night-audit", label: "NIGHT AUDIT", icon: IoMoonOutline },
  { to: "/admin/alerts", label: "ALERTS", icon: IoNotificationsOutline, showAlertBadge: true },
  { to: "/admin/audit-trail", label: "AUDIT TRAIL", icon: IoDocumentTextOutline, managerOnly: true },
  { to: "/admin/accountant-reports", label: "ACCOUNTANT REPORTS", icon: IoBarChartOutline, accountantOnly: true },
  { to: "/admin/account", label: "ACCOUNT", icon: IoKeyOutline, alwaysVisible: true },
  { to: "/admin/help", label: "HELP", icon: IoHelpCircleOutline, alwaysVisible: true },
];

export function visibleAdminNavItems() {
  const role = getStoredStaffRole();
  const isDeveloper = role === "developer";
  const isManagerRole = role === "manager" || isDeveloper;
  const isAccountantRole = role === "accountant" || isDeveloper;

  return ADMIN_NAV_ITEMS.filter((item) => {
    if (item.accountantOnly) return isAccountantRole;
    if (role === "accountant") return item.alwaysVisible === true;
    if (item.managerOnly) return isManagerRole;
    return true;
  });
}
