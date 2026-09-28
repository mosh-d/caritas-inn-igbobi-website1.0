// A guest's tags - their types (several at once: a corporate VIP) plus the
// blacklist flag - printed beside their name wherever staff meet it, so a
// VIP or a blacklisted guest is recognised on every screen (owner,
// 2026-09-28). The server attaches them to each guest-linked record as
// `guest_tags`, Blacklisted first; see GuestTagsInterceptor in the backend.
// Nothing a guest sees (receipts, emails) carries them.

export const GUEST_TAG_META = {
  blacklisted: { label: "Blacklisted", className: "bg-red-100 text-red-700" },
  vip: { label: "VIP", className: "bg-amber-100 text-amber-800" },
  corporate: { label: "Corporate", className: "bg-blue-100 text-blue-700" },
  group: { label: "Group", className: "bg-purple-100 text-purple-700" },
  "walk-in": { label: "Walk-in", className: "bg-gray-100 text-gray-700" },
};

// The types staff can tick on a guest's profile, in display order. The
// blacklist is set separately (manager-only, with a reason).
export const GUEST_TYPES = ["vip", "corporate", "group", "walk-in"];

export const guestTagLabel = (tag) => GUEST_TAG_META[tag]?.label || tag;

// For places that only take text - a <select> option, a tooltip.
export const withGuestTags = (name, tags) =>
  tags?.length ? `${name} (${tags.map(guestTagLabel).join(", ")})` : name;
