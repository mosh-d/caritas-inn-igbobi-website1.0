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

// Single source of truth for the admin sidebar + mobile menu.
// `showAlertBadge` marks the item that renders the live alert count.
// `managerOnly` items are filtered out for a receptionist session by each
// consumer (AdminNavBar.jsx, AdminMobileMenu.jsx) using isManager() from
// utils/auth.js — which already treats developer as manager-level.
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
  { to: "/admin/account", label: "ACCOUNT", icon: IoKeyOutline },
  { to: "/admin/help", label: "HELP", icon: IoHelpCircleOutline },
];
