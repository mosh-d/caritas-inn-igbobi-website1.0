import { useState } from "react";
import { IoFastFoodOutline } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import PageTabs from "../components/shared/PageTabs";
import AdminGuestSales from "./AdminGuestSales";
import AdminNonGuestSales from "./AdminNonGuestSales";

// Food and drink in one place (owner, 2026-09-24): posting to an in-house
// guest's folio and selling to someone who isn't staying are the same job on
// the same shift, and were two separate pages to click between.
//
// Each half is a tab rather than a section stacked on the other (owner,
// 2026-09-25) - both halves carry a form, a bill table and their own modals,
// so stacking them made the second one a long scroll away and gave the page
// two competing "this is the thing you came for" points. Plain local state,
// the same as Check-Ins' and Reports' own tabs.
const TABS = [
  { key: "guest", label: "Guest Sales" },
  { key: "non-guest", label: "Non-Guest Sales" },
];

export default function AdminFnbSalesPage() {
  const [tab, setTab] = useState(TABS[0].key);

  return (
    <div
      data-component="AdminFnbSales"
      className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]"
    >
      <PageHeading icon={IoFastFoodOutline}>F&amp;B Sales</PageHeading>
      <PageTabs tabs={TABS} active={tab} onChange={setTab} />
      {/* Mounted only while selected: each half fetches its own menus, folios
          and credits, and the hidden one has no reason to be holding stale
          copies of all of it. */}
      {tab === "guest" ? <AdminGuestSales asSection hideTitle /> : <AdminNonGuestSales asSection hideTitle />}
    </div>
  );
}
