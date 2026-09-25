import { useState } from "react";
import { IoShirtOutline } from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import PageTabs from "../components/shared/PageTabs";
import AdminLaundryGuestSales from "./AdminLaundryGuestSales";
import AdminLaundrySales from "./AdminLaundrySales";

// Laundry in one place (owner, 2026-09-24), built the same way F&B Sales is:
// a guest half and a non-guest half, each a tab of its own (2026-09-25). The
// guest half is new - an in-house guest's laundry used to have no home of
// its own at all and had to be typed into the Folios page by hand.
const TABS = [
  { key: "guest", label: "Guest Sales" },
  { key: "non-guest", label: "Non-Guest Sales" },
];

export default function AdminLaundryPage() {
  const [tab, setTab] = useState(TABS[0].key);

  return (
    <div
      data-component="AdminLaundry"
      className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]"
    >
      <PageHeading icon={IoShirtOutline}>Laundry Sales</PageHeading>
      <PageTabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "guest"
        ? <AdminLaundryGuestSales asSection hideTitle />
        : <AdminLaundrySales asSection hideTitle title="Non-Guest Sales" />}
    </div>
  );
}
