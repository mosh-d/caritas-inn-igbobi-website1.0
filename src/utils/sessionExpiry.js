// One place that knows a session has ended for good, so the whole admin can
// say so the same way (owner, 2026-09-27: "anytime a token is expired, make
// sure to add a popup with the only option to log in again").
//
// Before this, an expired session surfaced as whatever the page happened to
// be doing when the request failed — the raw server wording "Authentication
// failed" in the middle of an Early Checkout dialog, with the dialog's own
// buttons still inviting another try that could never work. Nothing said
// the session was the problem.
//
// Deliberately a module-level emitter rather than React context: the thing
// that discovers the expiry is the axios interceptor, which is plain
// module code with no component to dispatch from.

let expired = false;
const listeners = new Set();

// Idempotent: several requests usually 401 together as a token lapses, and
// they must not stack up notifications.
export const notifySessionExpired = () => {
  if (expired) return;
  expired = true;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error("Session-expiry listener failed:", err);
    }
  });
};

export const onSessionExpired = (fn) => {
  listeners.add(fn);
  // A listener that mounts after the expiry was announced still needs to
  // know — otherwise the modal never appears for whichever page mounted
  // last.
  if (expired) fn();
  return () => listeners.delete(fn);
};

export const isSessionExpired = () => expired;
