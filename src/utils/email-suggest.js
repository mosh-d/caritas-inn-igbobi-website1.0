// "Did you mean ada@gmail.com?" - catching a mistyped email domain on the
// booking form (owner, 2026-09-28), the commonest way a real guest ends up
// with an address nothing can be delivered to. Only a suggestion: the guest
// taps it or ignores it. The server makes its own checks either way.

// Domains most guests use, plus real look-alikes (mail.com, gmx.com) so a
// guest who genuinely uses one isn't nudged towards gmail.com.
const KNOWN_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "live.com", "ymail.com",
  "aol.com", "yahoo.co.uk", "hotmail.co.uk", "outlook.co.uk", "googlemail.com", "rocketmail.com",
  "protonmail.com", "proton.me", "me.com", "msn.com", "mail.com", "gmx.com", "email.com", "zoho.com",
];

// How many single-letter edits turn one string into the other.
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

// The corrected address, or null when the domain is fine or nothing is close.
export function suggestEmail(email) {
  const match = String(email || "").trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+\.[^@\s]+)$/);
  if (!match) return null;
  const [, local, domain] = match;
  if (KNOWN_DOMAINS.includes(domain)) return null;
  let best = null;
  let bestDistance = 3;
  for (const known of KNOWN_DOMAINS) {
    const distance = editDistance(domain, known);
    if (distance < bestDistance) {
      best = known;
      bestDistance = distance;
    }
  }
  return best ? `${local}@${best}` : null;
}
