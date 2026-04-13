import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocketContext } from "../context/WebSocketContext";
import axios from "axios";
import { IoRefresh, IoClose, IoFilter } from "react-icons/io5";
import Button from "../components/shared/Button";

const PRODUCTION_URL = "https://five-clover-shared-backend.onrender.com";
const LOCAL_URL = "http://localhost:3000";
let API_BASE_URL = PRODUCTION_URL;

// Determine API base URL based on environment
const testLocalConnection = async () => {
  if (import.meta.env.PROD) return PRODUCTION_URL;
  try {
    const response = await axios.get(LOCAL_URL, { timeout: 1000, validateStatus: () => true });
    if (response.status) return LOCAL_URL;
  } catch (error) { }
  return PRODUCTION_URL;
};

(async () => {
  API_BASE_URL = await testLocalConnection();
})();

export default function AdminBookingsPage() {
  const { subscribe } = useWebSocketContext();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedBooking, setSelectedBooking] = useState(null);
  const modalRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const exportModalRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const bookingsPerPage = 10;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportStatusActive, setExportStatusActive] = useState(true);
  const [exportStatusConfirmed, setExportStatusConfirmed] = useState(true);

  const [isEarlyCheckoutOpen, setIsEarlyCheckoutOpen] = useState(false);
  const [processingEarlyCheckout, setProcessingEarlyCheckout] = useState(false);

  const fetchBookings = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) setLoading(true);
      const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const response = await axios.post(`${baseUrl}/api/bookings`, { room_type_id: [7, 8, 9] },
        { headers: { "Content-Type": "application/json" } }
      );
      setBookings(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load bookings. Please refresh page.");
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const response = await axios.post(`${baseUrl}/api/reservations/cancel`, { reservation_id: reservationId },
        { headers: { "Content-Type": "application/json" } }
      );
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(""), 5000);
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel reservation.");
    }
  };

  const confirmReservation = async (reservationId) => {
    try {
      const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const response = await axios.post(`${baseUrl}/api/reservations/confirm`, { reservation_id: reservationId },
        { headers: { "Content-Type": "application/json" } }
      );
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(""), 5000);
      fetchBookings();
    } catch (err) {
      setError("Failed to confirm reservation.");
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus, reservationId) => {
    try {
      if (newStatus === "confirmed") await confirmReservation(reservationId);
      else if (newStatus === "cancelled") await cancelReservation(reservationId);
      else {
        const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
        await axios.put(`${baseUrl}/api/bookings/${bookingId}`, { status: newStatus },
          { headers: { "Content-Type": "application/json" } }
        );
        fetchBookings();
      }
    } catch (err) {
      setError("Failed to update status.");
    }
  };

  const handleRoomsUpdated = useCallback(() => fetchBookings(true), []);
  useEffect(() => {
    const unsubscribe = subscribe(handleRoomsUpdated, 'rooms');
    return unsubscribe;
  }, [handleRoomsUpdated, subscribe]);

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(() => fetchBookings(true), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isEarlyCheckoutOpen) return;
      if (modalRef.current && !modalRef.current.contains(e.target)) setSelectedBooking(null);
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) setIsFilterOpen(false);
      if (exportModalRef.current && !exportModalRef.current.contains(e.target)) setIsExportModalOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedBooking, isFilterOpen, isExportModalOpen, isEarlyCheckoutOpen]);

  const exportBookingsToCSV = () => {
    const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const statuses = [];
    if (exportStatusActive) statuses.push("active");
    if (exportStatusConfirmed) statuses.push("confirmed");
    let queryParams = `branch_id=3`;
    if (statuses.length > 0) queryParams += `&status=${statuses.join(",")}`;
    if (exportStartDate) queryParams += `&start_date=${exportStartDate}`;
    if (exportEndDate) queryParams += `&end_date=${exportEndDate}`;
    window.location.href = `${baseUrl}/api/bookings/export?${queryParams}`;
    setIsExportModalOpen(false);
  };

  const handleEarlyCheckout = async () => {
    try {
      setProcessingEarlyCheckout(true);
      const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const resId = selectedBooking.reservation_id || selectedBooking.booking_id;
      const response = await axios.post(`${baseUrl}/api/reservations/emergency-checkout`, { reservation_id: resId },
        { headers: { "Content-Type": "application/json" } }
      );
      setSuccessMessage(response.data.message || "Success");
      setTimeout(() => setSuccessMessage(""), 5000);
      setIsEarlyCheckoutOpen(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Error");
      setIsEarlyCheckoutOpen(false);
    } finally {
      setProcessingEarlyCheckout(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (searchType === "name" ? b.guest_name?.toLowerCase().includes(q) : String(b.booking_id).toLowerCase().includes(q));
    const matchesStatus = filterStatus === "all" || b.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const indexOfLast = currentPage * bookingsPerPage;
  const currentBookings = filteredBookings.slice(indexOfLast - bookingsPerPage, indexOfLast);
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

  useEffect(() => setCurrentPage(1), [searchQuery, searchType, filterStatus]);

  const renderActionButtons = (booking) => {
    const resId = booking.reservation_id || booking.booking_id;
    let actions = null;
    if (booking.status.toLowerCase() === "hold") {
      actions = (
        <div className="flex gap-2 text-2xl">
          <Button onClick={() => handleStatusUpdate(booking.booking_id, "confirmed", resId)} variant="emphasis" className="!bg-green-700 !border-green-600 hover:!bg-green-500 text-white">Confirm</Button>
          <span>|</span>
          <Button onClick={() => handleStatusUpdate(booking.booking_id, "cancelled", resId)} variant="emphasis" className="!bg-red-700 !border-red-600 hover:!bg-red-500 text-white">Cancel</Button>
        </div>
      );
    }
    return (
      <div className="flex gap-4 items-center">
        <Button onClick={() => setSelectedBooking(booking)} variant="emphasis" className="!text-xl font-bold">View</Button>
        {actions && <><span>|</span>{actions}</>}
      </div>
    );
  };

  return (
    <>
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded z-50 flex items-center gap-4">
          <span className="text-xl font-bold">{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="text-green-700 hover:text-green-900"><IoClose size={24} /></button>
        </div>
      )}
      <div data-component="AdminBookings" className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[4rem]">
        <div className="w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <h1 className="text-6xl font-secondary font-bold text-[color:var(--black)]">Bookings</h1>

          <div className="relative flex items-center gap-2">
            <input
              type="text"
              placeholder={`Search by ${searchType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-[color:var(--text-color)]/30 rounded-md px-4 py-2 text-xl focus:outline-none focus:border-[color:var(--emphasis)] w-64 max-sm:w-full bg-[color:var(--background-color)]"
            />
            <div className="relative" ref={filterDropdownRef}>
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="p-2 border border-[color:var(--text-color)]/30 rounded-md hover:bg-black/5 transition-colors bg-[color:var(--background-color)]" title="Filter"><IoFilter size={24} className="text-[color:var(--text-color)]" /></button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 shadow-xl z-20 text-2xl overflow-hidden font-primary">
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <p className="text-xl font-bold text-gray-800 uppercase tracking-widest mb-4">Search Mode</p>
                    <div className="flex gap-3">
                       <button onClick={() => setSearchType("name")} className={`flex-1 py-3 rounded-md transition-all text-xl font-bold ${searchType === 'name' ? 'bg-[color:var(--emphasis)] text-white shadow-md' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>Name</button>
                       <button onClick={() => setSearchType("id")} className={`flex-1 py-3 rounded-md transition-all text-xl font-bold ${searchType === 'id' ? 'bg-[color:var(--emphasis)] text-white shadow-md' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>ID</button>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-xl font-bold text-gray-800 uppercase tracking-widest mb-4">Filter Status</p>
                    <div className="grid grid-cols-2 gap-3">
                       {['all', 'confirmed', 'cancelled', 'hold', 'active'].map(s => (
                         <button key={s} onClick={() => { setFilterStatus(s); setIsFilterOpen(false); }} className={`py-3 rounded-md text-xl capitalize transition-all ${filterStatus === s ? 'bg-[color:var(--emphasis)] text-white font-bold shadow-sm' : 'bg-gray-50 text-gray-800 hover:bg-gray-100'}`}>{s}</button>
                       ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full border-collapse text-2xl">
            <thead>
              <tr className="border-b border-[color:var(--text-color)]/25">
                <th className="px-8 py-4 text-left whitespace-nowrap">Name</th>
                <th className="px-8 py-4 text-left whitespace-nowrap hidden md:table-cell">Email</th>
                <th className="px-8 py-4 text-left whitespace-nowrap hidden md:table-cell">ID</th>
                <th className="px-8 py-4 text-left whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (<tr><td colSpan="4" className="px-8 py-8 text-center text-xl">Loading bookings...</td></tr>) : error ? (<tr><td colSpan="4" className="px-8 py-8 text-center text-red-600 text-xl">{error}</td></tr>) : currentBookings.length === 0 ? (<tr><td colSpan="4" className="px-8 py-8 text-center text-xl">No bookings match filter.</td></tr>) : (
                currentBookings.map((b) => (
                  <tr key={b.booking_id} className="border-b border-[color:var(--text-color)]/25 transition-colors hover:bg-black/[0.02]">
                    <td className="px-8 py-4 text-left font-medium">{b.guest_name}</td>
                    <td className="px-8 py-4 text-left hidden md:table-cell">{b.guest_email || "N/A"}</td>
                    <td className="px-8 py-4 text-left hidden md:table-cell">{b.booking_id}</td>
                    <td className="px-8 py-4 text-left">{renderActionButtons(b)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center w-full mt-6 flex-wrap gap-4">
          <div className="flex justify-center items-center gap-4">
            {totalPages > 1 && (
              <>
                <Button variant="emphasis" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1} className={currentPage === 1 ? "opacity-30 cursor-not-allowed" : ""}>Previous</Button>
                <span className="text-lg font-medium">Page {currentPage} of {totalPages}</span>
                <Button variant="emphasis" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages} className={currentPage === totalPages ? "opacity-30 cursor-not-allowed" : ""}>Next</Button>
              </>
            )}
          </div>
          <Button onClick={() => setIsExportModalOpen(true)} variant="emphasis"><p className="font-primary text-2xl px-6">Export Bookings</p></Button>
        </div>
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[1000]">
          <div ref={modalRef} className="bg-[#332924] rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl font-primary border border-[#4A3D35]">
            <div className="bg-white py-10 px-8 text-center border-b-[6px] border-[color:var(--emphasis)]/20">
              <h2 className="text-4xl font-bold text-[#332924] tracking-[0.2em] uppercase">{selectedBooking.guest_name}</h2>
            </div>
            <div className="p-10 flex flex-col gap-2">
              {[
                { label: "EMAIL", value: selectedBooking.guest_email || "N/A" },
                { label: "PHONE NUMBER", value: selectedBooking.phone_number || "N/A" },
                { label: "NO OF ROOMS", value: selectedBooking.no_of_rooms },
                { label: "BOOKING ID", value: selectedBooking.booking_id },
                { label: "CHECK-IN", value: new Date(selectedBooking.check_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                { label: "CHECK-OUT", value: new Date(selectedBooking.check_out_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                { label: "ROOM STATUS", value: selectedBooking.status },
                { label: "ROOM CATEGORY", value: selectedBooking.room_category || "Classic" }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-4 border-b border-[#4A3D35]/50">
                  <span className="text-xl font-bold text-[color:var(--emphasis)] tracking-tighter uppercase">{item.label}</span>
                  <span className="text-xl font-medium text-white">{item.value}</span>
                </div>
              ))}
              <div className="flex gap-6 mt-10 justify-center">
                <Button onClick={() => setSelectedBooking(null)} variant="white" className="!px-10 py-3 !border-white !text-white hover:!bg-white hover:!text-[#332924] text-xl">Close</Button>
                {selectedBooking.status.toLowerCase() !== 'cancelled' && (
                  <Button onClick={() => setIsEarlyCheckoutOpen(true)} variant="emphasis" className="!px-10 py-3 !border-red-600 !text-red-600 hover:!bg-red-600 hover:!text-white text-xl">Early Checkout</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isEarlyCheckoutOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[1100]">
          <div className="bg-white rounded-lg w-full max-w-lg p-12 flex flex-col items-center text-center shadow-2xl relative">
            <div className="text-red-500 mb-6"><svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            <h2 className="text-4xl font-secondary font-bold text-gray-800 mb-4 tracking-tight">Emergency Checkout?</h2>
            <p className="text-xl text-gray-500 leading-relaxed mb-8">Are you sure you want to process an early checkout for this guest? This will finalize their reservation and instantly release their rooms back into the public market.</p>
            <div className="flex gap-4 w-full">
              <button onClick={() => setIsEarlyCheckoutOpen(false)} disabled={processingEarlyCheckout} className="flex-1 py-4 border border-gray-300 text-gray-600 font-bold rounded-md hover:bg-gray-50 text-xl transition-colors">Cancel</button>
              <button onClick={handleEarlyCheckout} disabled={processingEarlyCheckout} className={`flex-1 py-4 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 shadow-lg text-xl transition-all ${processingEarlyCheckout ? 'opacity-50' : ''}`}>{processingEarlyCheckout ? 'Processing...' : 'Confirm Checkout'}</button>
            </div>
          </div>
        </div>
      )}

      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div ref={exportModalRef} className="w-full max-w-lg bg-white shadow-2xl flex flex-col font-secondary rounded-lg overflow-hidden">
            <div className="p-8 text-center bg-[var(--white)] relative">
              <h2 className="font-bold text-3xl tracking-[0.2em] font-primary text-[var(--text-color)]">Export Options</h2>
              <button onClick={() => setIsExportModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-[color:var(--emphasis)] transition-colors"><IoClose size={28} /></button>
            </div>
            <div className="bg-[var(--text-color)] text-[var(--white)] p-8 flex flex-col gap-8 tracking-[0.1em] text-sm font-primary">
              <div className="flex gap-4 max-sm:flex-col">
                <div className="w-full"><label className="block text-2xl font-semibold mb-2 text-[var(--emphasis)]">Start Date</label><input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className="w-full p-3 rounded-md bg-gray-800 text-white text-xl focus:outline-none border-2 border-[color:var(--emphasis)]/30 focus:border-[var(--emphasis)]" style={{ colorScheme: 'dark' }} /></div>
                <div className="w-full"><label className="block text-2xl font-semibold mb-2 text-[var(--emphasis)]">End Date</label><input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className="w-full p-3 rounded-md bg-gray-800 text-white text-xl focus:outline-none border-2 border-[color:var(--emphasis)]/30 focus:border-[var(--emphasis)]" style={{ colorScheme: 'dark' }} /></div>
              </div>
              <div>
                <label className="block text-xl font-semibold mb-4 text-[var(--emphasis)]">Booking Status</label>
                <div className="flex gap-8">
                  {['active', 'confirmed'].map(s => (
                    <label key={s} className="flex items-center gap-3 cursor-pointer text-xl hover:text-[color:var(--emphasis)] transition-colors capitalize">
                      <input type="checkbox" checked={s === 'active' ? exportStatusActive : exportStatusConfirmed} onChange={(e) => s === 'active' ? setExportStatusActive(e.target.checked) : setExportStatusConfirmed(e.target.checked)} className="w-6 h-6 accent-[var(--emphasis)] cursor-pointer" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-[var(--text-color)] p-6 justify-center flex gap-4 border-t border-white/10">
              <Button onClick={() => setIsExportModalOpen(false)} variant="white">Cancel</Button>
              <Button onClick={exportBookingsToCSV} variant="emphasis">Export Data (CSV)</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
