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
  IoFastFoodOutline,
  IoShirtOutline,
  IoBusinessOutline,
} from "react-icons/io5";
import { getStoredStaffRole } from "../../utils/auth";

// Single source of truth for the admin sidebar + mobile menu, and for every
// other control that leads into one of these pages.
//
// Each item lists the roles that may open it, verbatim from the owner's own
// role/page matrix (2026-09-24). It used to be five overlapping flags
// (managerOnly / alwaysVisible / waitstaffVisible / accountantVisible /
// storekeeperVisible / receptionistHidden) whose combinations had to be
// reasoned through per item to answer "can this role open this page?" — a
// plain list answers it by reading, which is the only way a matrix like
// this can be checked against the one the owner wrote.
//
// A developer session sees everything, the same override RolesGuard applies
// on the server; it is never listed here.
//
// This governs the sidebar, the landing page, the refusal page and every
// disabled link — it is not a security boundary on its own. Each endpoint
// keeps its own @Roles guard, and several pages narrow themselves further
// once opened (AdminMenu's canEdit, AdminReports' visibleTabs).
export const ROLES = ["manager", "receptionist", "accountant", "waitron", "storekeeper"];
const EVERY_ROLE = ROLES;
const OVERSIGHT = ["manager", "receptionist"];
const FRONT_DESK = ["receptionist"];

// `showAlertBadge` marks the item that renders the live alert count.
export const ADMIN_NAV_ITEMS = [
  { to: "/admin/overview", label: "OVERVIEW", icon: IoGridOutline, end: true, roles: OVERSIGHT },
  { to: "/admin/rooms", label: "ROOMS", icon: IoBedOutline, roles: OVERSIGHT },
  { to: "/admin/room-chart", label: "ROOM CHART", icon: IoAppsOutline, roles: FRONT_DESK },
  { to: "/admin/reservations", label: "RESERVATIONS", icon: IoCalendarOutline, roles: FRONT_DESK },
  { to: "/admin/guests", label: "GUESTS", icon: IoPeopleOutline, roles: OVERSIGHT },
  { to: "/admin/folios", label: "GUEST FOLIOS", icon: IoReceiptOutline, roles: OVERSIGHT },
  // The F&B floor's own page: a guest's order goes on their room folio, a
  // walk-in's opens a non-guest folio, both from here. The server refuses a
  // receptionist's guest-folio food/drink charge outright (see
  // FoliosService.addFolioItemsBatch), so there is nothing here they could
  // submit anyway.
  { to: "/admin/fnb-sales", label: "F&B SALES", icon: IoFastFoodOutline, roles: ["waitron"] },
  // Laundry is front-desk work, not F&B floor work (owner, 2026-09-14) —
  // the server refuses a waitron's laundry charge as well.
  { to: "/admin/laundry-sales", label: "LAUNDRY SALES", icon: IoShirtOutline, roles: FRONT_DESK },
  { to: "/admin/check-ins", label: "CHECK-INS", icon: IoLogInOutline, roles: FRONT_DESK },
  { to: "/admin/check-outs", label: "CHECK-OUTS", icon: IoLogOutOutline, roles: FRONT_DESK },
  { to: "/admin/in-house", label: "IN-HOUSE", icon: IoHomeOutline, roles: OVERSIGHT },
  // Every role runs reports, but not the same ones — a waitron and a store
  // keeper see only Food Sales, Drink Sales and Bar Stock, a receptionist
  // sees everything except those. That split lives in AdminReports'
  // visibleTabs(), not here: this page is theirs, its tabs are not all
  // theirs.
  { to: "/admin/reports", label: "REPORTS", icon: IoBarChartOutline, roles: EVERY_ROLE },
  { to: "/admin/night-audit", label: "NIGHT AUDIT", icon: IoMoonOutline, roles: FRONT_DESK },
  { to: "/admin/alerts", label: "ALERTS", icon: IoNotificationsOutline, showAlertBadge: true, roles: OVERSIGHT },
  // Money owed by OTAs rather than by guests.
  { to: "/admin/ota-payments", label: "OTA PAYMENTS", icon: IoBusinessOutline, roles: FRONT_DESK },
  // The whole branch's staff activity log. The API has always been
  // @Roles('manager', 'accountant').
  { to: "/admin/audit-trail", label: "AUDIT TRAIL", icon: IoDocumentTextOutline, roles: ["manager", "accountant"] },
  // The store keeper's remit: the food/drink/laundry catalogue and its
  // pricing, plus drink stock. Their backend permissions already match
  // (@Roles('manager', 'accountant', 'storekeeper') across menu CRUD), so
  // this page is fully theirs, not read-only.
  { to: "/admin/menu", label: "MENU", icon: IoRestaurantOutline, roles: ["storekeeper"] },
  { to: "/admin/account", label: "ACCOUNT", icon: IoKeyOutline, roles: EVERY_ROLE },
  { to: "/admin/help", label: "HELP", icon: IoHelpCircleOutline, roles: EVERY_ROLE },
];

export function visibleAdminNavItems() {
  const role = getStoredStaffRole();
  if (role === "developer") return ADMIN_NAV_ITEMS;
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

// A destination's own path, without the query or hash a deep link carries
// (e.g. /admin/folios?folio_id=12 -> /admin/folios).
const pathOnly = (to) => String(to || "").split("?")[0].split("#")[0].replace(/\/+$/, "");

// Whether the current role can reach a given nav destination at all — same
// filter visibleAdminNavItems() already applies, just queryable for one
// path instead of returning the whole list. Used to gate anything that acts
// like a shortcut INTO a page (a deep link, a disabled button's tooltip,
// AdminRoot's new-reservation popup) without duplicating the role logic.
export const canAccessNavItem = (to) => visibleAdminNavItems().some((item) => item.to === pathOnly(to));

// Whether a path is one of the admin pages at all. Anything else (a typo, a
// dead link) belongs to the router's own NotFound, not to a refusal.
export const isAdminPage = (to) => ADMIN_NAV_ITEMS.some((item) => item.to === pathOnly(to));

// The sidebar label written as a page name, for messages about it:
// "GUEST FOLIOS" -> "Guest Folios", "OTA PAYMENTS" -> "OTA Payments".
const KEEP_UPPERCASE = ["OTA", "PMS"];
export const adminPageTitle = (to) => {
  const item = ADMIN_NAV_ITEMS.find((i) => i.to === pathOnly(to));
  if (!item) return "that page";
  return item.label
    .split(/([ -])/)
    .map((part) => (KEEP_UPPERCASE.includes(part) ? part : part.charAt(0) + part.slice(1).toLowerCase()))
    .join("");
};

// Why this role may not open a destination, or null when it may — the one
// wording used by every control that leads somewhere out of reach (a
// disabled link's tooltip, the refusal page).
export const accessDenial = (to) =>
  canAccessNavItem(to) ? null : `Your role isn't authorized to open ${adminPageTitle(to)}.`;

// Where a session lands after signing in, or on the bare /admin URL: the
// first page of its own sidebar. Derived rather than listed per role
// (2026-09-24), so a role can never land on a page it may not open — which
// is what sent a storekeeper to Overview.
export const defaultAdminPath = () => visibleAdminNavItems()[0]?.to || "/admin/account";

// The report Action columns link into the audit trail, so they are shown only
// to roles that can open it (manager, accountant, developer). For anyone else
// every link would lead to a page that refuses them.
export const canViewAuditTrail = () => canAccessNavItem("/admin/audit-trail");
