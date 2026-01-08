import React, { useState, useEffect } from "react";
import axios from "axios";
import { IoRefresh } from "react-icons/io5";
import { IoClose } from "react-icons/io5";

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
      "⚠️ AdminBookings: Local server not available, falling back to production"
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

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const baseUrl = API_BASE_URL.endsWith("/")
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      console.log("AdminBookings: Fetching bookings from:", baseUrl);
      const response = await axios.post(
        `${baseUrl}/api/bookings`,
        {
          room_type_id: [6, 7, 8, 9],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
      setBookings(response.data);
      setError(null);
    } catch (err) {
      console.error("AdminBookings: Error fetching bookings:", err);
      setError("Failed to load bookings. Please try again later.");
    } finally {
      setLoading(false);
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
        }
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
        reservationId
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
        }
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
          "Failed to cancel reservation. Please try again."
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
          }
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
  }, []);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const renderActionButtons = (booking) => {
    const reservationId = booking.reservation_id || booking.booking_id;
    console.log("Booking data:", booking);
    console.log("Using reservation ID:", reservationId);

    switch (booking.status.toLowerCase()) {
      case "hold":
        return (
          <div className="flex gap-2">
            <button
              onClick={() =>
                handleStatusUpdate(
                  booking.booking_id,
                  "confirmed",
                  reservationId
                )
              }
              className="text-green-600 hover:underline cursor-pointer"
            >
              Confirm
            </button>
            <span>|</span>
            <button
              onClick={() =>
                handleStatusUpdate(
                  booking.booking_id,
                  "cancelled",
                  reservationId
                )
              }
              className="text-red-600 hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        );
      case "confirmed":
        return (
          <button
            onClick={() =>
              handleStatusUpdate(booking.booking_id, "cancelled", reservationId)
            }
            className="text-red-600 hover:underline cursor-pointer"
          >
            Cancel
          </button>
        );
      default:
        return null;
    }
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
        className="px-[4rem] py-[4rem] flex flex-col items-start gap-[4rem]"
      >
        <div className="w-full flex justify-between items-center">
          <h1 className="text-6xl font-secondary font-bold text-[color:var(--black)]">
            Bookings
          </h1>
          <div className="w-56 flex justify-end">
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="flex items-center justify-center gap-2 text-xl w-56 py-4 bg-[color:var(--text-color)] text-white rounded cursor-pointer hover:bg-[color:var(--text-color)]/70 disabled:bg-[color:var(--text-color)]"
              title="Refresh bookings"
            >
              <IoRefresh
                size="1.5rem"
                className={loading ? "animate-spin" : ""}
              />
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full border-collapse text-2xl">
            <thead>
              <tr className="border-b border-[color:var(--text-color)]">
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Guest Name
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Booking ID
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Check In Date
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Check Out Date
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Room Category
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  No of Rooms
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Status
                </th>
                <th className="px-8 py-4 text-left whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-8 py-8 text-center">
                    Loading bookings...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-8 py-8 text-center text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-8 py-8 text-center">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr
                    key={booking.booking_id}
                    className="border-b border-[color:var(--text-color)]"
                  >
                    <td className="px-8 py-4 text-left">
                      {booking.guest_name}
                    </td>
                    <td className="px-8 py-4 text-left">
                      {booking.booking_id}
                    </td>
                    <td className="px-8 py-4 text-left">
                      {formatDate(booking.check_in_date)}
                    </td>
                    <td className="px-8 py-4 text-left">
                      {formatDate(booking.check_out_date)}
                    </td>
                    <td className="px-8 py-4 text-left">
                      {booking.room_category}
                    </td>
                    <td className="px-8 py-4 text-left">
                      {booking.no_of_rooms}
                    </td>
                    <td className="px-8 py-4 text-left capitalize">
                      {booking.status.toLowerCase()}
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
      </div>
    </>
  );
}
