import { useState } from "react";
import {
  IoKeyOutline,
  IoShieldCheckmarkOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline,
  IoEyeOutline,
  IoEyeOffOutline,
} from "react-icons/io5";
import PageHeading from "../components/shared/PageHeading";
import { btn, field } from "../components/shared/ui";
import { changePassword, getStoredStaffRole, getStoredStaffAccountId, isManager } from "../utils/auth";

const EMPTY_OWN = { current_password: "", new_password: "", confirm_password: "" };
const EMPTY_RESET = { current_password: "", new_password: "", confirm_password: "" };

function PasswordField({ label, value, onChange, autoComplete, minLength, required }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label className={field.label}>{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          className={`${field.input} pr-14`}
          minLength={minLength}
          required={required}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[color:var(--text-color)]/60 hover:text-[color:var(--text-color)] cursor-pointer transition-colors"
        >
          {visible ? <IoEyeOffOutline size={22} /> : <IoEyeOutline size={22} />}
        </button>
      </div>
    </div>
  );
}

export default function AdminAccountPage() {
  const staffRole = getStoredStaffRole();
  const manager = isManager();
  // Reset-someone-else's-password is script-only for individual staff
  // accounts for now (see docs/TERMINAL-SCRIPTS.md in the backend repo) —
  // the backend's changePassword only ever changes the CALLER's own
  // staff_account row on this login path, so this section would be
  // misleading (and silently change the wrong password) if shown here.
  const isIndividualAccount = !!getStoredStaffAccountId();

  return (
    <div data-component="AdminAccount" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[4.5rem]">
      <PageHeading icon={IoKeyOutline}>Account &amp; Security</PageHeading>

      <ChangeOwnPassword staffRole={staffRole} />

      {manager && !isIndividualAccount && <ResetReceptionistPassword />}
    </div>
  );
}

function ChangeOwnPassword({ staffRole }) {
  const [form, setForm] = useState(EMPTY_OWN);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roleLabel = staffRole ? staffRole.charAt(0).toUpperCase() + staffRole.slice(1) : "your";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (form.new_password === form.current_password) {
      setError("New password must be different from your current password.");
      return;
    }

    try {
      setSaving(true);
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess("Your password was updated successfully.");
      setForm(EMPTY_OWN);
    } catch (err) {
      setError(err.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="w-full flex flex-col lg:px-60 gap-4">
      <div>
        <h2 className="text-3xl font-bold text-[color:var(--black)]">Change My Password</h2>
        <p className="text-xl text-[color:var(--text-color)]/76 mt-1">
          Update the password for your {roleLabel} login. You'll need your current password to confirm.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-8 flex flex-col gap-6">
        {error && (
          <p className="flex items-center gap-2 text-xl text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <IoAlertCircleOutline size={20} className="shrink-0" /> {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-xl text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <IoCheckmarkCircle size={20} className="shrink-0" /> {success}
          </p>
        )}

        <PasswordField
          label="Current Password"
          autoComplete="current-password"
          value={form.current_password}
          onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <PasswordField
            label="New Password"
            autoComplete="new-password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            minLength={8}
            required
          />
          <PasswordField
            label="Confirm New Password"
            autoComplete="new-password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            minLength={8}
            required
          />
        </div>
        <p className="text-lg text-[color:var(--text-color)]/60">Minimum 8 characters.</p>

        <button type="submit" disabled={saving} className={`${btn.primary} self-start`}>
          {saving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}

function ResetReceptionistPassword() {
  const [form, setForm] = useState(EMPTY_RESET);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      setSaving(true);
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
        target_role: "receptionist",
      });
      setSuccess("Receptionist password was reset successfully.");
      setForm(EMPTY_RESET);
    } catch (err) {
      setError(err.message || "Failed to reset receptionist password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="w-full flex flex-col lg:px-60 gap-4">
      <div>
        <h2 className="text-3xl font-bold text-[color:var(--black)]">Reset Receptionist Password</h2>
        <p className="text-xl text-[color:var(--text-color)]/76 mt-1 flex items-start gap-2">
          <IoShieldCheckmarkOutline size={22} className="shrink-0 mt-0.5 text-[color:var(--emphasis)]" />
          Manager-only. You don't need to know the receptionist's current password — confirming with
          your own password is enough to set a new one for them.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[color:var(--text-color)]/10 p-8 flex flex-col gap-6">
        {error && (
          <p className="flex items-center gap-2 text-xl text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <IoAlertCircleOutline size={20} className="shrink-0" /> {error}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-2 text-xl text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <IoCheckmarkCircle size={20} className="shrink-0" /> {success}
          </p>
        )}

        <PasswordField
          label="Your Current Password (Manager)"
          autoComplete="current-password"
          value={form.current_password}
          onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <PasswordField
            label="New Receptionist Password"
            autoComplete="new-password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            minLength={8}
            required
          />
          <PasswordField
            label="Confirm New Password"
            autoComplete="new-password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            minLength={8}
            required
          />
        </div>
        <p className="text-lg text-[color:var(--text-color)]/60">Minimum 8 characters.</p>

        <button type="submit" disabled={saving} className={`${btn.primary} self-start`}>
          {saving ? "Resetting..." : "Reset Receptionist Password"}
        </button>
      </form>
    </section>
  );
}
