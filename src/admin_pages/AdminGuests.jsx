import { useState, useEffect, useRef, useCallback } from 'react';
import { IoClose, IoFilter, IoPeopleOutline } from 'react-icons/io5';
import Button from '../components/shared/Button';
import Modal from '../components/shared/Modal';
import PageHeading from '../components/shared/PageHeading';
import StatusBadge from '../components/shared/StatusBadge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { btn, field, table } from '../components/shared/ui';
import {
  fetchGuests,
  fetchGuestReservations,
  createGuest,
  updateGuest,
  updateGuestStatus,
  fetchGuestNotes,
  addGuestNote,
  deleteGuestNote,
} from '../utils/guests-api';
import { isManager } from '../utils/auth';
import { useWebSocketContext } from '../context/WebSocketContext';

const GUEST_TYPES = ['walk-in', 'corporate', 'group', 'VIP'];
const money = (v) => `₦${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// Ordinary contact-info fields, saved via PUT /api/guests/:id (any staff).
// Blacklist status/reason are saved separately via PATCH /:id/status
// (manager-only on the backend) — see handleSaveEdit below.
const CONTACT_INFO_FIELDS = [
  'first_name', 'last_name', 'email', 'phone', 'address', 'city', 'country',
  'id_type', 'id_number', 'date_of_birth', 'nationality', 'guest_type',
  'company_name', 'tax_id',
];

const emptyGuestForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  id_type: '',
  id_number: '',
  guest_type: '',
  company_name: '',
  is_blacklisted: false,
  blacklist_reason: '',
};

export default function AdminGuestsPage() {
  const canManageGuestStatus = isManager();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const [searchQuery, setSearchQuery] = useState('');
  const [guestTypeFilter, setGuestTypeFilter] = useState('all');
  const [blacklistFilter, setBlacklistFilter] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  const [selectedGuest, setSelectedGuest] = useState(null);
  const [selectedGuestReservations, setSelectedGuestReservations] = useState(
    [],
  );
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [guestNotes, setGuestNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [notesError, setNotesError] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyGuestForm);
  const [creating, setCreating] = useState(false);

  const loadGuests = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (guestTypeFilter !== 'all') params.guest_type = guestTypeFilter;
      if (blacklistFilter !== 'all')
        params.is_blacklisted = blacklistFilter === 'blacklisted';

      const result = await fetchGuests(params);
      setGuests(result.data || []);
      setTotalPages(result.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(
        (err.response?.data?.message || 'Failed to load guests.') +
          ' Please refresh the page.',
      );
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, guestTypeFilter, blacklistFilter]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  useEffect(() => setPage(1), [searchQuery, guestTypeFilter, blacklistFilter]);

  // Re-fetch whenever the socket (re)connects (e.g. after a backend
  // restart), same pattern as AdminOverview.jsx/AdminRooms.jsx.
  const { isConnected } = useWebSocketContext();
  useEffect(() => {
    if (!isConnected) return;
    loadGuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openGuestDetail = async (guest) => {
    setSelectedGuest(guest);
    setEditForm({ ...emptyGuestForm, ...guest });
    setSelectedGuestReservations([]);
    setGuestNotes([]);
    setNewNoteText('');
    setNotesError('');
    try {
      const reservations = await fetchGuestReservations(guest.id);
      setSelectedGuestReservations(
        Array.isArray(reservations) ? reservations : [],
      );
    } catch {
      setSelectedGuestReservations([]);
    }
    try {
      const notes = await fetchGuestNotes(guest.id);
      setGuestNotes(Array.isArray(notes) ? notes : []);
    } catch {
      setGuestNotes([]);
    }
  };

  const closeGuestDetail = () => {
    setSelectedGuest(null);
    setEditForm(null);
    setSelectedGuestReservations([]);
    setGuestNotes([]);
    setNewNoteText('');
    setNotesError('');
  };

  const handleAddNote = async () => {
    if (!selectedGuest || !newNoteText.trim()) return;
    try {
      setAddingNote(true);
      setNotesError('');
      const note = await addGuestNote(selectedGuest.id, newNoteText.trim());
      setGuestNotes((prev) => [note, ...prev]);
      setNewNoteText('');
    } catch (err) {
      setNotesError(err.response?.data?.message || 'Failed to add note.');
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!selectedGuest) return;
    try {
      setDeletingNoteId(noteId);
      setNotesError('');
      await deleteGuestNote(selectedGuest.id, noteId);
      setGuestNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setNotesError(err.response?.data?.message || 'Failed to delete note.');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedGuest) return;
    try {
      setSavingEdit(true);
      const contactInfo = {};
      for (const key of CONTACT_INFO_FIELDS) {
        contactInfo[key] = editForm[key];
      }
      await updateGuest(selectedGuest.id, contactInfo);
      if (canManageGuestStatus) {
        await updateGuestStatus(selectedGuest.id, {
          is_blacklisted: editForm.is_blacklisted,
          blacklist_reason: editForm.blacklist_reason,
        });
      }
      setSuccessMessage('Guest profile updated.');
      setTimeout(() => setSuccessMessage(''), 5000);
      closeGuestDetail();
      loadGuests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update guest.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateGuest = async () => {
    try {
      setCreating(true);
      await createGuest(createForm);
      setSuccessMessage('Guest profile created.');
      setTimeout(() => setSuccessMessage(''), 5000);
      setIsCreateOpen(false);
      setCreateForm(emptyGuestForm);
      loadGuests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create guest.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {successMessage && (
        <div className='fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl z-50 flex items-center gap-4 shadow-lg'>
          <span className='text-xl font-bold'>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage('')}
            className='text-green-700 hover:text-green-900 cursor-pointer'
          >
            <IoClose size={24} />
          </button>
        </div>
      )}

      <div
        data-component='AdminGuests'
        className='px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[3rem]'
      >
        <div className='w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4'>
          <PageHeading icon={IoPeopleOutline}>Guests</PageHeading>

          <div className='relative flex flex-col items-start gap-3'>
            <input
              type='text'
              placeholder='Search by name (partial), or full email/phone...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${field.input} text-xl! w-72 max-sm:w-full`}
            />
            <div className='flex gap-3'>
              <div
                className='relative'
                ref={filterDropdownRef}
              >
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`bg-white border-1 border-gray-300 rounded-3xl py-2.5 px-6 flex items-center gap-2`}
                  title='Filter'
                >
                  <IoFilter size={22} /> Filters
                </button>
                {isFilterOpen && (
                  <div className='absolute right-0 mt-2 w-96 bg-white border border-[color:var(--text-color)]/15 rounded-xl shadow-xl z-20 overflow-hidden font-primary'>
                    <div className='p-6 border-b border-[color:var(--text-color)]/10'>
                      <p className='text-lg font-bold text-[color:var(--text-color)]/84 uppercase tracking-widest mb-4'>
                        Guest Type
                      </p>
                      <div className='grid grid-cols-2 gap-3'>
                        {['all', ...GUEST_TYPES].map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              setGuestTypeFilter(t);
                              setIsFilterOpen(false);
                            }}
                            className={`py-3 rounded-lg text-xl capitalize cursor-pointer transition-all ${guestTypeFilter === t ? 'bg-[color:var(--emphasis)] text-white font-bold' : 'bg-black/4 text-[color:var(--text-color)] hover:bg-black/8'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className='p-6'>
                      <p className='text-lg font-bold text-[color:var(--text-color)]/84 uppercase tracking-widest mb-4'>
                        Blacklist Status
                      </p>
                      <div className='grid grid-cols-2 gap-3'>
                        {[
                          { key: 'all', label: 'All' },
                          { key: 'blacklisted', label: 'Blacklisted' },
                          { key: 'not_blacklisted', label: 'Not Blacklisted' },
                        ].map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => {
                              setBlacklistFilter(opt.key);
                              setIsFilterOpen(false);
                            }}
                            className={`py-3 rounded-lg text-xl cursor-pointer transition-all ${blacklistFilter === opt.key ? 'bg-[color:var(--emphasis)] text-white font-bold' : 'bg-black/4 text-[color:var(--text-color)] hover:bg-black/8'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className={`${btn.primary} whitespace-nowrap`}
              >
                + Add Guest
              </button>
            </div>
          </div>
        </div>

        <div className={table.card}>
          <div className={table.scroll}>
            <table className={table.el}>
              <thead>
                <tr className={table.headRow}>
                  <th className={table.th}>Name</th>
                  <th className={`${table.th} hidden md:table-cell`}>Email</th>
                  <th className={`${table.th} hidden md:table-cell`}>Phone</th>
                  <th className={`${table.th} hidden md:table-cell`}>Type</th>
                  <th className={`${table.th} hidden md:table-cell`}>Stays</th>
                  <th className={table.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ?
                  <tr>
                    <td
                      colSpan='6'
                      className='px-8 py-10 text-center text-xl'
                    >
                      <LoadingSpinner />
                    </td>
                  </tr>
                : error ?
                  <tr>
                    <td
                      colSpan='6'
                      className='px-8 py-10 text-center text-red-600 text-xl'
                    >
                      {error}
                    </td>
                  </tr>
                : guests.length === 0 ?
                  <tr>
                    <td
                      colSpan='6'
                      className='px-8 py-10 text-center text-xl text-[color:var(--text-color)]/68'
                    >
                      No guests match filter.
                    </td>
                  </tr>
                : guests.map((g) => (
                    <tr
                      key={g.id}
                      className={table.row}
                    >
                      <td className={`${table.td} font-medium`}>
                        <div className='flex items-center gap-3 flex-wrap'>
                          {g.first_name} {g.last_name}
                          {g.is_blacklisted && (
                            <span className='text-sm font-bold uppercase tracking-wide text-red-700 bg-red-100 px-2 py-1 rounded-full whitespace-nowrap'>
                              Blacklisted
                            </span>
                          )}
                          {Number(g.outstanding_balance) > 0 && (
                            <span className='text-sm font-bold uppercase tracking-wide text-orange-700 bg-orange-100 px-2 py-1 rounded-full whitespace-nowrap'>
                              Owing {money(g.outstanding_balance)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${table.td} hidden md:table-cell`}>
                        {g.email || 'N/A'}
                      </td>
                      <td className={`${table.td} hidden md:table-cell`}>
                        {g.phone || 'N/A'}
                      </td>
                      <td
                        className={`${table.td} hidden md:table-cell capitalize`}
                      >
                        {g.guest_type || 'N/A'}
                      </td>
                      <td className={`${table.td} hidden md:table-cell`}>
                        {g.total_stays}
                      </td>
                      <td className={table.td}>
                        <div className={table.actions}>
                          <button
                            onClick={() => openGuestDetail(g)}
                            className={btn.rowPrimary}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        <div className='flex justify-center items-center gap-4 w-full mt-6'>
          {totalPages > 1 && (
            <>
              <Button
                variant='emphasis'
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className={page === 1 ? 'opacity-30 cursor-not-allowed' : ''}
              >
                Previous
              </Button>
              <span className='text-lg font-medium'>
                Page {page} of {totalPages}
              </span>
              <Button
                variant='emphasis'
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className={
                  page === totalPages ? 'opacity-30 cursor-not-allowed' : ''
                }
              >
                Next
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ==== Guest Detail / Edit Modal ==== */}
      {selectedGuest && editForm && (
        <Modal
          onClose={closeGuestDetail}
          title={`${selectedGuest.first_name} ${selectedGuest.last_name}`}
          subtitle={selectedGuest.email || undefined}
          badge={
            selectedGuest.is_blacklisted && (
              <span className='inline-block px-3 py-1 rounded-full text-lg font-bold leading-tight whitespace-nowrap bg-red-100 text-red-700'>
                Blacklisted
              </span>
            )
          }
          size='lg'
          footer={
            <>
              <button
                onClick={closeGuestDetail}
                className={btn.secondary}
              >
                Close
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className={btn.primary}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          }
        >
          <section className='grid grid-cols-2 gap-4 max-sm:grid-cols-1'>
            <LabeledInput
              label='First Name'
              value={editForm.first_name || ''}
              onChange={(v) => setEditForm({ ...editForm, first_name: v })}
            />
            <LabeledInput
              label='Last Name'
              value={editForm.last_name || ''}
              onChange={(v) => setEditForm({ ...editForm, last_name: v })}
            />
            <LabeledInput
              label='Email'
              value={editForm.email || ''}
              onChange={(v) => setEditForm({ ...editForm, email: v })}
            />
            <LabeledInput
              label='Phone'
              value={editForm.phone || ''}
              onChange={(v) => setEditForm({ ...editForm, phone: v })}
            />
            <LabeledInput
              label='Address'
              value={editForm.address || ''}
              onChange={(v) => setEditForm({ ...editForm, address: v })}
            />
            <LabeledInput
              label='City'
              value={editForm.city || ''}
              onChange={(v) => setEditForm({ ...editForm, city: v })}
            />
            <LabeledInput
              label='Country'
              value={editForm.country || ''}
              onChange={(v) => setEditForm({ ...editForm, country: v })}
            />
            <div className='flex flex-col gap-2'>
              <label className={field.label}>Guest Type</label>
              <select
                value={editForm.guest_type || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, guest_type: e.target.value })
                }
                className={field.select}
              >
                <option value=''>—</option>
                {GUEST_TYPES.map((t) => (
                  <option
                    key={t}
                    value={t}
                  >
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className='flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6'>
            {canManageGuestStatus ? (
              <>
                <label className='flex items-center gap-3 text-xl cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={!!editForm.is_blacklisted}
                    onChange={(e) =>
                      setEditForm({ ...editForm, is_blacklisted: e.target.checked })
                    }
                    className='w-6 h-6 accent-[var(--emphasis)] cursor-pointer'
                  />
                  Blacklisted
                </label>
                {editForm.is_blacklisted && (
                  <div className='flex flex-col gap-2'>
                    <label className={field.label}>Blacklist Reason</label>
                    <textarea
                      value={editForm.blacklist_reason || ''}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          blacklist_reason: e.target.value,
                        })
                      }
                      className={field.textarea}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className='text-xl text-[color:var(--text-color)]/76'>
                {editForm.is_blacklisted
                  ? `Blacklisted${editForm.blacklist_reason ? `: ${editForm.blacklist_reason}` : ''}`
                  : 'Not blacklisted.'}{' '}
                <span className='text-lg text-[color:var(--text-color)]/50'>(Only managers can change blacklist status.)</span>
              </p>
            )}
          </section>

          <section className='flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6'>
            <label className={field.label}>Notes</label>
            <p className='text-lg text-[color:var(--text-color)]/60 -mt-1'>
              Independent notes about this guest (e.g. "VIP", "Fish allergy") — separate from any single stay's request, which is recorded on the reservation itself and shows on the Manifest report.
            </p>
            {notesError && (
              <p className='text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3'>{notesError}</p>
            )}
            {guestNotes.length === 0 ? (
              <p className='text-xl text-[color:var(--text-color)]/76'>No notes yet.</p>
            ) : (
              <div className='flex flex-col gap-2'>
                {guestNotes.map((n) => (
                  <div key={n.id} className='flex justify-between items-center gap-4 bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl'>
                    <span className='break-words'>{n.note}</span>
                    <button
                      type='button'
                      onClick={() => handleDeleteNote(n.id)}
                      disabled={deletingNoteId === n.id}
                      className='p-1 text-[color:var(--text-color)]/50 hover:text-red-600 transition-colors cursor-pointer shrink-0'
                      aria-label='Delete note'
                    >
                      <IoClose size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className='flex gap-3 items-center flex-wrap'>
              <input
                type='text'
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }}
                placeholder='e.g. VIP'
                className={`${field.input} w-auto flex-1 min-w-[16rem]`}
              />
              <button
                type='button'
                onClick={handleAddNote}
                disabled={addingNote || !newNoteText.trim()}
                className={btn.secondary}
              >
                {addingNote ? 'Adding...' : '+ Add Note'}
              </button>
            </div>
          </section>

          <section className='flex flex-col gap-3 border-t border-[color:var(--text-color)]/10 pt-6'>
            <h3 className='text-2xl font-bold text-[color:var(--black)]'>
              Reservations
            </h3>
            {selectedGuestReservations.length === 0 ?
              <p className='text-xl text-[color:var(--text-color)]/76'>
                No reservations for this guest yet.
              </p>
            : <div className='flex flex-col gap-2'>
                {selectedGuestReservations.map((r) => (
                  <div
                    key={r.id}
                    className='flex justify-between items-center gap-4 bg-[color:var(--text-color)]/3 rounded-lg px-5 py-3 text-xl'
                  >
                    <span className='truncate'>
                      {r.booking_reference || r.id}
                      <span className='text-[color:var(--text-color)]/68 ml-3'>
                        {new Date(r.check_in).toLocaleDateString(undefined, { timeZone: "Africa/Lagos" })} –{' '}
                        {new Date(r.check_out).toLocaleDateString(undefined, { timeZone: "Africa/Lagos" })}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            }
          </section>
        </Modal>
      )}

      {/* ==== Create Guest Modal ==== */}
      {isCreateOpen && (
        <Modal
          onClose={() => setIsCreateOpen(false)}
          title='Add Guest'
          subtitle='Create a new guest profile.'
          size='md'
          footer={
            <>
              <button
                onClick={() => setIsCreateOpen(false)}
                className={btn.secondary}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGuest}
                disabled={
                  creating ||
                  !createForm.first_name ||
                  !createForm.last_name ||
                  !createForm.phone
                }
                className={btn.primary}
              >
                {creating ? 'Creating...' : 'Create Guest'}
              </button>
            </>
          }
        >
          <section className='grid grid-cols-2 gap-4 max-sm:grid-cols-1'>
            <LabeledInput
              label='First Name *'
              value={createForm.first_name}
              onChange={(v) => setCreateForm({ ...createForm, first_name: v })}
            />
            <LabeledInput
              label='Last Name *'
              value={createForm.last_name}
              onChange={(v) => setCreateForm({ ...createForm, last_name: v })}
            />
            <LabeledInput
              label='Email'
              value={createForm.email}
              onChange={(v) => setCreateForm({ ...createForm, email: v })}
            />
            <LabeledInput
              label='Phone *'
              value={createForm.phone}
              onChange={(v) => setCreateForm({ ...createForm, phone: v })}
            />
            <div className='flex flex-col gap-2'>
              <label className={field.label}>Guest Type</label>
              <select
                value={createForm.guest_type}
                onChange={(e) =>
                  setCreateForm({ ...createForm, guest_type: e.target.value })
                }
                className={field.select}
              >
                <option value=''>—</option>
                {GUEST_TYPES.map((t) => (
                  <option
                    key={t}
                    value={t}
                  >
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <LabeledInput
              label='Company Name'
              value={createForm.company_name}
              onChange={(v) =>
                setCreateForm({ ...createForm, company_name: v })
              }
            />
          </section>
        </Modal>
      )}
    </>
  );
}

function LabeledInput({ label, value, onChange, type = 'text' }) {
  return (
    <div className='flex flex-col gap-2'>
      <label className={field.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={field.input}
      />
    </div>
  );
}
