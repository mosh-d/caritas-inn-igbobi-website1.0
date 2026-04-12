import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { IoRefresh, IoClose, IoFilter } from "react-icons/io5";
import Button from "../components/shared/Button";

const PRODUCTION_URL = "https://five-clover-shared-backend.onrender.com";

const LOCAL_URL = "http://localhost:3000";

let API_BASE_URL = PRODUCTION_URL;

// Try to connect to local server first, fall back to production

const testLocalConnection = async () => {
  try {
    // Try to connect to the root endpoint

    const response = await axios.get(LOCAL_URL, {
      timeout: 1000,

      // Don't throw on non-2xx status codes

      validateStatus: () => true,
    });

    // If we get any response, the server is up

    if (response.status) {
      console.log("✅ AdminBookings: Connected to local development server");

      return LOCAL_URL;
    }
  } catch (error) {
    console.log(
      "⚠️ AdminBookings: Local server not available, falling back to production",
    );
  }

  return PRODUCTION_URL;
};

// Initialize the base URL

(async () => {
  API_BASE_URL = await testLocalConnection();

  console.log(`AdminBookings: Using API base URL: ${API_BASE_URL}`);
})();

export default function AdminBookingsPage() {
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
  const [searchType, setSearchType] = useState("name"); // "name" or "id"
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportStatusActive, setExportStatusActive] = useState(true);
  const [exportStatusConfirmed, setExportStatusConfirmed] = useState(true);

  const fetchBookings = async (isBackgroundRefresh = false) => {
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      const baseUrl = API_BASE_URL.endsWith("/")
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      console.log("AdminBookings: Fetching bookings from:", baseUrl);
      const response = await axios.post(
        `${baseUrl}/api/bookings`,
        {
          room_type_id: [7, 8, 9],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );

      setBookings(response.data);

      setError(null);
    } catch (err) {
      console.error("AdminBookings: Error fetching bookings:", err);
      setError("Failed to load bookings. Please refresh page.");
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const confirmReservation = async (reservationId) => {
    try {
      const baseUrl = API_BASE_URL.endsWith("/")
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;

      console.log("AdminBookings: Confirming reservation:", reservationId);

      const response = await axios.post(
        `${baseUrl}/api/reservations/confirm`,

        {
          reservation_id: reservationId,
        },

        {
          headers: {
            "Content-Type": "application/json",
          },

          withCredentials: true,
        },
      );

      // Show success message

      setSuccessMessage(response.data.message);

      setTimeout(() => setSuccessMessage(""), 5000);

      // Refresh the bookings list
      fetchBookings();
    } catch (err) {
      console.error("Error confirming reservation:", err);
      setError("Failed to confirm reservation. Please try again.");
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      console.log(
        "AdminBookings: Sending cancel request for reservation ID:",
        reservationId,
      );
      const payload = {
        reservation_id: reservationId,
      };
      console.log("Request payload:", JSON.stringify(payload, null, 2));
      const baseUrl = API_BASE_URL.endsWith("/")
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      const response = await axios.post(
        `${baseUrl}/api/reservations/cancel`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );
      console.log("Cancel response:", response.data);

      // Show success message
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(""), 5000);

      // Refresh the bookings list
      fetchBookings();
    } catch (err) {
      console.error("Error cancelling reservation:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers,
      });

      setError(
        err.response?.data?.message ||
          "Failed to cancel reservation. Please try again.",
      );
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus, reservationId) => {
    try {
      if (newStatus === "confirmed") {
        await confirmReservation(reservationId);
      } else if (newStatus === "cancelled") {
        await cancelReservation(reservationId);
      } else {
        const baseUrl = API_BASE_URL.endsWith("/")
          ? API_BASE_URL.slice(0, -1)
          : API_BASE_URL;

        await axios.put(
          `${baseUrl}/api/bookings/${bookingId}`,

          { status: newStatus },

          {
            headers: {
              "Content-Type": "application/json",
            },

            withCredentials: true,
          },
        );

        // Refresh the bookings list after update

        fetchBookings();
      }
    } catch (err) {
      console.error("Error updating booking status:", err);

      setError("Failed to update booking status.");
    }
  };

  useEffect(() => {
    fetchBookings();

    const interval = setInterval(() => fetchBookings(true), 30000);

    return () => clearInterval(interval);
  }, []);

  // Handle click outside modal

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setSelectedBooking(null);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
      if (exportModalRef.current && !exportModalRef.current.contains(event.target)) {
        setIsExportModalOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedBooking, isFilterOpen, isExportModalOpen]);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // 1. Export function
  const exportBookingsToCSV = () => {
    const baseUrl = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;

    // Building status array based on checkboxes
    const statuses = [];
    if (exportStatusActive) statuses.push("active");
    if (exportStatusConfirmed) statuses.push("confirmed");
    const statusQuery = statuses.length > 0 ? `status=${statuses.join(",")}` : "";
    
    // Igbobi branch id is 3, appending it to ensure data segregation
    let queryParams = `branch_id=3`;
    if (statusQuery) queryParams += `&${statusQuery}`;
    if (exportStartDate) queryParams += `&start_date=${exportStartDate}`;
    if (exportEndDate) queryParams += `&end_date=${exportEndDate}`;

    // You can dynamically build this URL string with any filters you desire.
    const exportUrl = `${baseUrl}/api/bookings/export?${queryParams}`;

    // This triggers the native browser download instantly.
    window.location.href = exportUrl;
    setIsExportModalOpen(false);
  };

  // Filter bookings based on search
  const filteredBookings = bookings.filter((booking) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    if (searchType === "name") {
      return booking.guest_name?.toLowerCase().includes(query);
    } else if (searchType === "id") {
      return String(booking.booking_id).toLowerCase().includes(query);
    }
    return true;
  });

  // Pagination calculations
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking);
  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

  // Reset to page 1 if search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchType]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderActionButtons = (booking) => {
    const reservationId = booking.reservation_id || booking.booking_id;
    console.log("Booking data:", booking);
    console.log("Using reservation ID:", reservationId);

    const actionButtons = (() => {
      switch (booking.status.toLowerCase()) {
        case "hold":
          return (
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  handleStatusUpdate(
                    booking.booking_id,
                    "confirmed",
                    reservationId,
                  )
                }
                variant="emphasis"
              >
                Confirm
              </Button>

              <span>|</span>

              <Button
                onClick={() =>
                  handleStatusUpdate(
                    booking.booking_id,
                    "cancelled",
                    reservationId,
                  )
                }
                variant="emphasis"
              >
                Cancel
              </Button>
            </div>
          );

        case "confirmed":
          return (
            <Button
              onClick={() =>
                handleStatusUpdate(
                  booking.booking_id,
                  "cancelled",
                  reservationId,
                )
              }
              variant="emphasis"
            >
              Cancel
            </Button>
          );

        default:
          return null;
      }
    })();

    return (
      <div className="flex gap-4 items-center">
        <Button onClick={() => setSelectedBooking(booking)} variant="emphasis">
          View
        </Button>

        {actionButtons && <span>|</span>}

        {actionButtons}
      </div>
    );
  };

  return (
    <>
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded z-50 flex items-center gap-4">
          <span>{successMessage}</span>

          <button
            onClick={() => setSuccessMessage("")}
            className="text-green-700 hover:text-green-900"
          >
            <IoClose size={20} />
          </button>
        </div>
      )}

      <div
        data-component="AdminBookings"
        className="px-[4rem] max-sm:px-[1rem] py-[4rem] flex flex-col items-start gap-[4rem]"
      >
        <div className="w-full flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4">
          <h1 className="text-6xl font-secondary font-bold text-[color:var(--black)]">
            Bookings
          </h1>

          {/* Search and Filter */}
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              placeholder={`Search by ${searchType === "name" ? "name" : "ID"}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-[color:var(--text-color)]/30 rounded-md px-4 py-2 text-xl focus:outline-none focus:border-[color:var(--emphasis)] w-64 max-sm:w-full bg-[color:var(--background-color)]"
            />
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="p-2 border border-[color:var(--text-color)]/30 rounded-md hover:bg-black/5 transition-colors bg-[color:var(--background-color)]"
                title="Filter"
              >
                <IoFilter size={24} className="text-[color:var(--text-color)]" />
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 shadow-xl z-10 text-xl overflow-hidden font-primary">
                  <div 
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-100 ${searchType === "name" ? "bg-gray-50 font-bold text-[color:var(--emphasis)]" : "text-[color:var(--text-color)]"}`}
                    onClick={() => { setSearchType("name"); setIsFilterOpen(false); }}
                  >
                    Search by name
                  </div>
                  <div 
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-100 ${searchType === "id" ? "bg-gray-50 font-bold text-[color:var(--emphasis)]" : "text-[color:var(--text-color)]"}`}
                    onClick={() => { setSearchType("id"); setIsFilterOpen(false); }}
                  >
                    Search by ID
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full border-collapse text-2xl">
            <thead>
              <tr className="border-b border-[color:var(--text-color)]/50">
                {/* Desktop view - show name, email, id, action */}
                {/* Mobile/Tablet view - show name, action only */}
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Name
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap hidden md:table-cell">
                  Email
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap hidden md:table-cell">
                  ID
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-8 text-center text-xl">
                    Loading bookings...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-8 py-8 text-center text-red-600 text-xl"
                  >
                    {error}
                  </td>
                </tr>
              ) : currentBookings.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-8 text-center text-xl">
                    {searchQuery 
                      ? `No bookings match your description for ${searchType === "name" ? "name" : "ID"}.` 
                      : "No bookings found."}
                  </td>
                </tr>
              ) : (
                currentBookings.map((booking) => (
                  <tr
                    key={booking.booking_id}
                    className="border-b border-[color:var(--text-color)]/50"
                  >
                    {/* Desktop view - show name, email, id, action */}
                    {/* Mobile/Tablet view - show name, action only */}
                    <td className="px-8 py-4 text-left">
                      {booking.guest_name}
                    </td>
                    <td className="px-8 py-4 text-left hidden md:table-cell">
                      {booking.guest_email || "N/A"}
                    </td>
                    <td className="px-8 py-4 text-left hidden md:table-cell">
                      {booking.booking_id}
                    </td>
                    <td className="px-8 py-4 text-left">
                      {renderActionButtons(booking)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination and Export Controls */}
        <div className="flex justify-between items-center w-full mt-6 flex-wrap gap-4">
          <div className="flex justify-center items-center gap-4">
            {totalPages > 1 && (
              <>
                <Button
                  variant="emphasis"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`${
                    currentPage === 1
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 active:bg-gray-300 active:border-gray-300 active:text-gray-500"
                      : ""
                  }`}
                >
                  <p className="text-xl">Previous</p>
                </Button>

                <span className="text-lg font-medium">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="emphasis"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`${
                    currentPage === totalPages
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed hover:bg-gray-300 active:bg-gray-300 active:border-gray-300 active:text-gray-500"
                      : ""
                  }`}
                >
                  <p className="text-xl">Next</p>
                </Button>
              </>
            )}
          </div>
          
          <Button onClick={() => setIsExportModalOpen(true)} variant="emphasis">
            <p className="font-primary text-2xl px-4">Export Bookings</p>
          </Button>
        </div>
      </div>

      {/* Guest Info Modal */}

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="w-full max-w-2xl bg-white shadow-2xl flex flex-col font-secondary rounded-lg overflow-hidden"
          >
            {/* Header */}

            <div className="p-8 text-center bg-[var(--white)]">
              <h2 className="font-bold text-3xl tracking-[0.2em] font-primary text-[var(--text-color)]">
                {selectedBooking.guest_name}
              </h2>
            </div>

            {/* Body */}

            <div className="bg-[var(--text-color)] text-[var(--white)] p-8 flex flex-col gap-6 tracking-[0.1em] text-sm font-primary">
              <div className="flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-2">
                <span className="font-semibold uppercase text-xl text-[var(--emphasis)]">Email</span>
                <span className="text-xl">{selectedBooking.guest_email || "N/A"}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-2">
                <span className="font-semibold uppercase text-xl text-[var(--emphasis)]">
                  Phone Number
                </span>
                <span className="text-xl">{selectedBooking.phone_number || "N/A"}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-2">
                <span className="font-semibold uppercase text-xl text-[var(--emphasis)]">
                  No of Rooms
                </span>
                <span className="text-xl">{selectedBooking.no_of_rooms}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-2">
                <span className="font-semibold uppercase text-xl text-[var(--emphasis)]">
                  Booking Id
                </span>

                <span className="text-xl">{selectedBooking.booking_id}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-2">
                <span className="font-semibold uppercase text-xl text-[var(--emphasis)]">
                  Check-in
                </span>

                <span className="text-xl">{formatDate(selectedBooking.check_in_date)}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-2">
                <span className="font-semibold uppercase text-xl text-[var(--emphasis)]">
                  Check-out
                </span>
                <span className="text-xl">{formatDate(selectedBooking.check_out_date)}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-2">
                <span className="font-semibold uppercase text-xl text-[var(--emphasis)]">
                  Room Status
                </span>
                <span className="text-xl capitalize">
                  {selectedBooking.status.toLowerCase()}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-[var(--emphasis)]/30 pb-2">
                <span className="font-semibold uppercase text-xl text-[var(--emphasis)]">
                  Room Category
                </span>
                <span className="text-xl">{selectedBooking.room_category}</span>
              </div>
            </div>

            {/* Footer */}

            <div className="bg-[var(--text-color)] p-6 justify-center flex">
              <Button
                onClick={() => setSelectedBooking(null)}
                variant="white"
              >
                <p className="font-primary text-xl">Close</p>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Export Options Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div ref={exportModalRef} className="w-full max-w-lg bg-white shadow-2xl flex flex-col font-secondary rounded-lg overflow-hidden">
            <div className="p-8 text-center bg-[var(--white)] relative">
              <h2 className="font-bold text-3xl tracking-[0.2em] font-primary text-[var(--text-color)]">
                Export Options
              </h2>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="absolute top-6 right-6 text-[color:var(--text-color)]/50 hover:text-[color:var(--emphasis)] transition-colors"
                aria-label="Close modal"
              >
                <IoClose size={28} />
              </button>
            </div>
            
            <div className="bg-[var(--text-color)] text-[var(--white)] p-8 flex flex-col gap-8 tracking-[0.1em] text-sm font-primary">
              <div className="flex gap-4 max-sm:flex-col">
                <div className="w-full">
                  <label className="block text-2xl font-semibold mb-2 text-[var(--emphasis)]">Start Date</label>
                  <input 
                    type="date" 
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full p-3 rounded-md bg-gray-800 text-white text-xl focus:outline-none border-2 border-transparent focus:border-[var(--emphasis)] placeholder:text-white"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="w-full">
                  <label className="block text-2xl font-semibold mb-2 text-[var(--emphasis)]">End Date</label>
                  <input 
                    type="date" 
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full p-3 rounded-md bg-gray-800 text-white text-xl focus:outline-none border-2 border-transparent focus:border-[var(--emphasis)] placeholder:text-white"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xl font-semibold mb-4 text-[var(--emphasis)]">Booking Status</label>
                <div className="flex gap-8">
                  <label className="flex items-center gap-3 cursor-pointer text-xl hover:text-gray-300 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={exportStatusActive}
                      onChange={(e) => setExportStatusActive(e.target.checked)}
                      className="w-6 h-6 accent-[var(--emphasis)] cursor-pointer"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer text-xl hover:text-gray-300 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={exportStatusConfirmed}
                      onChange={(e) => setExportStatusConfirmed(e.target.checked)}
                      className="w-6 h-6 accent-[var(--emphasis)] cursor-pointer"
                    />
                    Confirmed
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-[var(--text-color)] p-6 justify-center flex gap-4 border-t border-[var(--white)]/10">
              <Button onClick={() => setIsExportModalOpen(false)} variant="white">
                <p className="font-primary text-xl">Cancel</p>
              </Button>
              <Button onClick={exportBookingsToCSV} variant="emphasis">
                <p className="font-primary text-xl">Export Data (CSV)</p>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
