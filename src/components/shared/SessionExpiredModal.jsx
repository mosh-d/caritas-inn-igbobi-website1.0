import { useEffect } from "react";
import { IoLockClosedOutline } from "react-icons/io5";
import { clearStoredSession } from "../../utils/auth";

// Shown when the session has ended for good and nothing on screen can
// succeed any more (owner, 2026-09-27). One way out, on purpose: there is
// no Close, no backdrop click and no Escape, because dismissing it would
// return the user to a page whose every button now fails — which is the
// confusion this replaces. Deliberately NOT the shared Modal, which closes
// on both Escape and a backdrop click.
//
// The work in progress is not recoverable by us (the request that failed
// carried it), so this says plainly that unsaved changes need redoing
// rather than implying a reload will bring them back.
export default function SessionExpiredModal() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Swallow Escape while this is up — other open dialogs underneath
    // listen for it, and closing them changes nothing about being signed
    // out.
    const swallowEscape = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", swallowEscape, true);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", swallowEscape, true);
    };
  }, []);

  const logInAgain = () => {
    clearStoredSession();
    window.location.href = "/admin?sessionExpired=true";
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 2000 }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-8 flex flex-col items-center gap-5 text-center">
        <span className="w-16 h-16 rounded-full bg-[color:var(--emphasis)]/10 flex items-center justify-center">
          <IoLockClosedOutline className="text-4xl text-[color:var(--emphasis)]" />
        </span>
        <h2 id="session-expired-title" className="text-3xl font-bold text-[color:var(--black)]">
          Your session has ended
        </h2>
        <p className="text-xl text-[color:var(--text-color)]/76">
          You&apos;ve been signed out, so nothing on this page can be saved until you sign in again.
          Anything you had typed and not yet submitted will need to be entered again.
        </p>
        <button onClick={logInAgain} className="px-8 py-4 rounded-lg text-xl font-bold cursor-pointer bg-[color:var(--emphasis)] text-white hover:opacity-90 transition-all">
          Log In Again
        </button>
      </div>
    </div>
  );
}
