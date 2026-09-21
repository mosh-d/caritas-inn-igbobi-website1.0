import { NavLink } from 'react-router-dom';
import Logo from '../../assets/caritas-logo-2.png';
import {
  logout,
  getStoredBranch,
  getStoredStaffUsername,
  getDefaultAdminRoute,
  getRealStoredStaffRole,
  getDevRoleOverride,
  setDevRoleOverride,
} from '../../utils/auth';
import StatusBadge from './StatusBadge';

// Roles a developer can "view as" to confirm what each one's UI actually
// looks like, without needing a separate login per role.
const SIMULATABLE_ROLES = ['manager', 'receptionist', 'accountant', 'waitron', 'storekeeper'];

// Branch names in the DB are stored as "<Brand> <Location>" (e.g. "Caritas Inn
// Ilasan") since one branches table spans all three hotel brands. The logo
// above already shows the brand, so strip a known brand prefix here and show
// only the location — otherwise the brand would appear twice on screen.
const KNOWN_BRAND_PREFIXES = ['Five Clover', 'Caritas Inn', 'Ringruby'];
const branchLocationName = (fullName) => {
  if (!fullName) return fullName;
  const match = KNOWN_BRAND_PREFIXES.find((prefix) =>
    fullName.toLowerCase().startsWith(prefix.toLowerCase()),
  );
  return match ? fullName.slice(match.length).trim() : fullName;
};

// One rota's readout: who is on it today, plus the control to correct a
// wrong pick.
function ShiftRow({ shift }) {
  return (
    <div className='flex items-center gap-2 text-lg text-white/70'>
      <span className='max-sm:hidden'>{shift.label}</span>
      <span className='text-xl font-semibold text-white'>{shift.name || 'Not recorded'}</span>
      {shift.onChange && (
        <button
          type='button'
          onClick={shift.onChange}
          className='cursor-pointer rounded-lg border border-white/30 px-3 py-1 text-base font-medium text-white transition-colors hover:bg-white/10'
        >
          {shift.name ? 'Change' : 'Record'}
        </button>
      )}
    </div>
  );
}

export default function AdminTopBar({ shifts = [] }) {
  const isLogin = window.location.pathname === '/admin';
  // Deliberately the real role, not the effective (possibly simulated) one
  // getStoredStaffRole() would return — "Signed in as" states an actual
  // identity, so it should never read "Manager" while the account signed
  // in is really the developer. The separate "Viewing as" control below is
  // where the simulated role belongs.
  const staffRole = getRealStoredStaffRole();
  const branch = getStoredBranch();
  const displayName = getStoredStaffUsername();
  const isRealDeveloper = staffRole === 'developer';
  const roleOverride = getDevRoleOverride();

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
  };

  // Full reload rather than local state — every role check in the app
  // (nav items, page-level permission gates, ...) reads straight from
  // storage at render time with no shared context wiring them together, so
  // a reload is the simplest way to make every already-mounted component
  // re-evaluate against the newly picked role, matching how logout() above
  // already does a full navigation for the same kind of auth-state change.
  const handleRoleOverrideChange = (e) => {
    setDevRoleOverride(e.target.value || null);
    window.location.reload();
  };

  if (isLogin) return null;

  return (
    // relative: the logo block below is `md:absolute`, and needs an actual
    // positioned ancestor to centre against, not whatever happens to be
    // further up the tree. Stacked (flex-col) below `md`, with extra right
    // padding to clear AdminNavBar's own fixed hamburger button in that
    // corner - row + absolute-centred only from `md:` up, where the left
    // column is never wide enough to reach the middle of the screen
    // (2026-09-19: was unconditionally absolute-centred, so a phone-width
    // "Developer (all access)" dropdown and the centred logo were guaranteed
    // to overlap at some point, not just look cramped).
    <div
      data-component='AdminTopBar'
      className='relative w-full min-h-50 flex flex-col md:flex-row md:justify-between md:items-center gap-6 md:gap-0 bg-[color:var(--text-color)] px-6 py-4 max-md:pr-24 shadow-md'
    >
      {/* Below md, the identity, shift, role and logout controls flow in
          wrapped rows rather than a tall stack - stacked, they took ~255px of
          a phone screen before any page content (2026-09-19). */}
      <div className='flex flex-row flex-wrap items-center gap-x-6 gap-y-3 md:flex-col md:items-start md:gap-8'>
        {staffRole && (
          <NavLink
            to='/admin/account'
            className='flex flex-col gap-1 text-lg text-white/70 hover:text-white transition-colors'
          >
            {displayName && (
              <div className='text-xl font-semibold text-white'>{displayName}</div>
            )}
            <div className='flex items-center gap-2'>
              <div className='max-sm:hidden'>Signed in as</div>
              <StatusBadge status={staffRole} />
            </div>
          </NavLink>
        )}
        {/* Whose shift the business day is, from the 6am prompt (ShiftGate).
            Only the rotas themselves, a manager and a developer see this at
            all. Anyone who sees BOTH rotas gets them behind a "Shifts"
            toggle — two more stacked lines made an already tall top bar
            taller — while a rota of your own stays inline, being one line.
            Reopening a row corrects a wrong pick; every change is
            audit-logged. */}
        {shifts.length > 1 ? (
          <details className='text-lg text-white/70'>
            <summary className='cursor-pointer transition-colors hover:text-white'>Shifts</summary>
            <div className='flex flex-col gap-1 pt-2'>
              {shifts.map((shift) => <ShiftRow key={shift.key} shift={shift} />)}
            </div>
          </details>
        ) : (
          shifts.map((shift) => <ShiftRow key={shift.key} shift={shift} />)
        )}
        {isRealDeveloper && (
          <label className='flex items-center gap-2 text-lg text-white/70' onClick={(e) => e.stopPropagation()}>
            <span className='max-sm:hidden'>Viewing as</span>
            <select
              value={roleOverride || ''}
              onChange={handleRoleOverrideChange}
              className={`rounded-lg px-3 py-1.5 text-base font-medium bg-[color:var(--text-color)] text-white border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[color:var(--emphasis)] ${
                roleOverride ? 'border-amber-400' : 'border-white/30'
              }`}
            >
              <option value='' className='text-black'>Developer (all access)</option>
              {SIMULATABLE_ROLES.map((role) => (
                <option key={role} value={role} className='text-black capitalize'>
                  {role}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          onClick={handleLogout}
          className='cursor-pointer rounded-lg px-4 py-2 text-lg font-medium text-white bg-[color:var(--emphasis)] hover:bg-[color:var(--emphasis)]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--emphasis)] transition-colors'
        >
          Logout
        </button>
      </div>
      <div className='w-48 flex-shrink-0 mx-auto md:mx-0 md:absolute md:left-1/2 md:transform md:-translate-x-1/2 flex flex-col items-center'>
        <NavLink
          to={getDefaultAdminRoute()}
          className='block'
        >
          <img
            src={Logo}
            alt='Caritas Inn Logo'
            className='w-full h-auto'
          />
        </NavLink>
        {branch?.name && (
          <div className='text-center font-secondary text-5xl font-bold tracking-wide text-white mt-1'>
            {branchLocationName(branch.name)}
          </div>
        )}
      </div>
    </div>
  );
}
