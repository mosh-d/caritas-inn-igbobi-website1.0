import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import Button from "../components/shared/Button";
import CustomInput from "../components/shared/CustomInput";
import Footer from "../components/shared/Footer";
import { createReservation, getRoomTypeId } from "../utils/booking-api";
import { toast } from "react-toastify";
import { IoRefresh } from "react-icons/io5";

// Define the context type (optional, for TypeScript; can omit if not using TS)
const useSharedContext = () => {
  const context = useOutletContext();
  if (!context) {
    console.error("No context available in BookingConfirmationPage");
    throw new Error(
      "Component must be used within a layout providing shared context"
    );
  }
  return context;
};

export default function BookingConfirmationPage() {
  const navigate = useNavigate();

  // Access shared state from Outlet context
  const {
    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    numberOfRooms,
    setNumberOfRooms,
    roomType,
    setRoomType,
    roomTypeId,
    branchId,
    totalPayment,
    updateTotalPayment,
    roomTypes,
    isLoadingRooms,
    fetchAvailableRooms, // Function to refresh room availability
  } = useSharedContext();
  
  // Handle refresh button click
  const handleRefresh = async () => {
    try {
      await fetchAvailableRooms(checkInDate, checkOutDate);
      toast.success('Room availability updated');
    } catch (error) {
      console.error('Error refreshing room availability:', error);
      toast.error('Failed to refresh room availability');
    }
  };

  // Get the currently selected room details
  const selectedRoom = roomTypes?.find(room => room.room_type_name === roomType);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reservationData, setReservationData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation and error state
  const [validationError, setValidationError] = useState({ show: false, message: '' });
  
  // Helper to set validation error
  const setFormError = (message = '') => {
    setValidationError({ show: true, message });
  };
  
  // Helper to clear validation error
  const clearFormError = () => {
    setValidationError({ show: false, message: '' });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error when user starts typing
    if (validationError.show) {
      clearFormError();
    }
  };

  // Handle room type change
  const handleRoomTypeChange = (selectedRoomType) => {
    setRoomType(selectedRoomType);
    // Reset number of rooms when room type changes
    setNumberOfRooms('');
    if (validationError.show) {
      clearFormError();
    }
    
    // Update total payment with the new room type
    updateTotalPayment(selectedRoomType, 1); // Default to 1 room when changing room type
  };

  // Handle number of rooms change
  const handleNumberOfRoomsChange = (value) => {
    setNumberOfRooms(value);
    if (validationError.show) {
      clearFormError();
    }
    // Update total payment with the selected room and number of rooms
    updateTotalPayment(roomType, value);
  };

  // Validation logic
  const isFormValid = () => {
    const requiredFields = [
      formData.firstName.trim(),
      formData.lastName.trim(),
      formData.email.trim(),
      formData.phone.trim(),
      roomType,
      numberOfRooms,
      checkInDate,
      checkOutDate,
    ];
    return requiredFields.every(
      (field) => field !== "" && field !== null && field !== undefined
    );
  };

  const getMissingFields = () => {
    const missingFields = [];
    if (!formData.firstName.trim()) missingFields.push("First Name");
    if (!formData.lastName.trim()) missingFields.push("Last Name");
    if (!formData.email.trim()) missingFields.push("Email Address");
    if (!formData.phone.trim()) missingFields.push("Phone Number");
    if (!roomType) missingFields.push("Room Type");
    if (!numberOfRooms) missingFields.push("Number of Rooms");
    if (!checkInDate) missingFields.push("Check-in Date");
    if (!checkOutDate) missingFields.push("Check-out Date");
    return missingFields;
  };

  // Format date to YYYY-MM-DD, handling both YYYY-MM-DD and MM/DD/YYYY formats
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Handle MM/DD/YYYY format from date picker
    if (dateString.includes('/')) {
      const [month, day, year] = dateString.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      
      // Ensure we have a valid date
      if (isNaN(date.getTime())) {
        console.error('Invalid date format:', dateString);
        return '';
      }
      
      // Format as YYYY-MM-DD
      return date.toISOString().split('T')[0];
    }
    
    console.error('Unsupported date format:', dateString);
    return '';
  };

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!isFormValid()) {
      setFormError('Please fill in all required fields');
      return;
    }

    // Get room type ID from the room type name
    const selectedRoomTypeId = getRoomTypeId(roomType);
    
    if (!selectedRoomTypeId) {
      toast.error("Please select a valid room type");
      return;
    }

    try {
      setIsSubmitting(true);

      // Format dates
      const checkIn = formatDate(checkInDate);
      const checkOut = formatDate(checkOutDate);

      if (!checkIn || !checkOut) {
        throw new Error("Invalid date format. Please check your dates and try again.");
      }

      const reservationPayload = {
        branch_id: branchId,
        room_type_id: selectedRoomTypeId, // Use the mapped ID
        guest_name: `${formData.firstName} ${formData.lastName}`.trim(),
        check_in: checkIn,
        check_out: checkOut,
        rooms_booked: parseInt(numberOfRooms, 10),
        email: formData.email,
        phone: formData.phone,
      };

      console.log('Sending reservation payload:', reservationPayload);
      const response = await createReservation(reservationPayload);

      if (response.reservation_id) {
        setReservationData({
          id: response.reservation_id,
          guestName: reservationPayload.guest_name,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          roomType,
          roomsBooked: numberOfRooms,
          totalAmount: totalPayment,
        });
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error("Error creating reservation:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      if (error.response?.status === 409 && 
          (error.response?.data?.message?.includes('Insufficient availability') || 
           error.response?.data?.error?.includes('Insufficient availability'))) {
        setFormError('There are no more rooms for the selected category. Please click the refresh button to see available rooms.');
      } else {
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.message ||
                           "Failed to create reservation. Please check your details and try again.";
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close modal, reset form, and redirect to contact page
  const handleCloseModal = () => {
    setShowSuccessModal(false);
    // Reset form
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    });
    // Redirect to contact page
    navigate("/contact");
  };

  return (
    <>
      <div className="min-h-[100vh] flex flex-col justify-between">
        <div>
          <div className="py-[12rem] px-[6rem] max-lg:px-[12rem] max-sm:px-[2rem] w-full">
            <div className="flex max-sm:flex-col max-sm:gap-[2.4rem] justify-between items-center max-sm:items-start mb-[4.8rem]">
              <h1 className="text-6xl font-secondary font-bold text-[color:var(--text-color)]">
                Booking Confirmation
              </h1>
              <button
                onClick={handleRefresh}
                disabled={isLoadingRooms}
                className="flex items-center text-xl gap-2 px-6 py-4 bg-[color:var(--text-color)] text-white rounded hover:cursor-pointer hover:bg-[color:var(--text-color)]/70 disabled:bg-[color:var(--text-color)]/50"
              >
                <IoRefresh size="1.5rem" className={isLoadingRooms ? 'animate-spin' : ''} />
                {isLoadingRooms ? 'Refreshing...' : 'Refresh Rooms'}
              </button>
            </div>
            <div className="flex max-lg:flex-col gap-[4.8rem] w-full">
              <div
                data-component="Booking Confirmation"
                className="w-[50%] max-lg:w-[100%]"
              >
                {/* Personal Information Form */}
                <div className="flex flex-col w-[full] gap-[2.4rem]">
                  <h2 className="text-4xl font-secondary font-bold text-[color:var(--text-color)]">
                    Personal Information
                  </h2>

                  <div className="flex w-full gap-[2.4rem]">
                    <CustomInput
                      variant="default"
                      type="text"
                      id="firstName"
                      label="First Name"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                    >
                      Enter your first name
                    </CustomInput>

                    <CustomInput
                      variant="default"
                      type="text"
                      id="lastName"
                      label="Last Name"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                    >
                      Enter your last name
                    </CustomInput>
                  </div>

                  <div className="flex flex-row gap-[2.4rem]">
                    <CustomInput
                      variant="default"
                      type="email"
                      id="email"
                      label="Email Address"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    >
                      Enter your email address
                    </CustomInput>

                    <CustomInput
                      variant="default"
                      type="tel"
                      id="phone"
                      label="Phone Number"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    >
                      Enter your phone number
                    </CustomInput>
                  </div>

                  <div className="flex flex-row gap-[2.4rem]">
                    <div className="flex flex-col w-[50%] min-w-[16rem] gap-[.8rem]">
                      <label
                        htmlFor="room-type"
                        className="text-lg font-semibold text-[color:var(--text-color)]"
                      >
                        Room Type
                      </label>
                      {isLoadingRooms ? (
                        <div className="py-2 text-gray-500">
                          Loading room types...
                        </div>
                      ) : (
                        <select
                          id="room-type"
                          value={roomType || ''}
                          onChange={(e) => handleRoomTypeChange(e.target.value)}
                          className="cursor-pointer bg-transparent border-b-[.5px] border-[color:var(--text-color)]/50 py-2 focus:outline-none focus:border-[color:var(--emphasis)] hover:border-[color:var(--emphasis)] focus:bg-[color:var(--emphasis)]/10 text-xl"
                          disabled={isLoadingRooms}
                        >
                          <option value="">Select Room Type</option>
                          {roomTypes.map((room) => (
                            <option
                              key={room.room_type_id}
                              value={room.room_type_name}
                              disabled={room.total_rooms === 0}
                            >
                              {room.room_type_name} (₦{room.base_rate?.toLocaleString()}/night)
                              {room.total_rooms === 0 ? ' - Sold Out' : ` - ${room.total_rooms} available`}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex flex-col w-[50%] gap-[.8rem]">
                      <label
                        htmlFor="number-of-rooms"
                        className="text-lg font-semibold text-[color:var(--text-color)]"
                      >
                        Number of Rooms
                      </label>
                      {isLoadingRooms ? (
                        <div className="py-2 text-gray-500">
                          Loading room availability...
                        </div>
                      ) : !roomType ? (
                        <div className="text-gray-500">
                          Select room type first
                        </div>
                      ) : (
                        <select
                          id="number-of-rooms"
                          value={numberOfRooms || ""}
                          onChange={(e) => handleNumberOfRoomsChange(e.target.value)}
                          className="cursor-pointer bg-transparent border-b-[.5px] border-[color:var(--text-color)]/50 py-2 focus:outline-none focus:border-[color:var(--emphasis)] hover:border-[color:var(--emphasis)] focus:bg-[color:var(--emphasis)]/10 text-xl"
                          disabled={!roomType || isLoadingRooms || !selectedRoom || (selectedRoom && selectedRoom.total_rooms === 0)}
                        >
                          <option value="">Select Number of Rooms</option>
                          {selectedRoom?.total_rooms > 0 ? (
                            Array.from(
                              { length: Math.min(selectedRoom.total_rooms, 10) },
                              (_, i) => {
                                const num = i + 1;
                                const isMax = num === Math.min(selectedRoom.total_rooms, 10);
                                return (
                                  <option key={num} value={num}>
                                    {num} {num === 1 ? "Room" : "Rooms"}
                                    {isMax ? ' (Max)' : ''}
                                  </option>
                                );
                              }
                            )
                          ) : null}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row gap-[2.4rem]">
                    <CustomInput
                      variant="default"
                      label="Check in"
                      id="check-in"
                      type="date"
                      value={checkInDate}
                      onChange={(e) => {
                        setCheckInDate(e.target.value);
                        if (validationError.show) {
                          clearFormError();
                        }
                      }}
                    />
                    <CustomInput
                      variant="default"
                      label="Check out"
                      id="check-out"
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => {
                        setCheckOutDate(e.target.value);
                        if (validationError.show) {
                          clearFormError();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <div
                data-component="Booking Summary"
                className="w-[50%] max-lg:w-[100%]"
              >
                {/* Booking Summary */}
                <div className="bg-white p-[3rem] shadow-lg">
                  <h2 className="text-4xl font-secondary font-bold text-[color:var(--emphasis)] mb-[2rem]">
                    Booking Summary
                  </h2>

                  <div className="space-y-[1.5rem]">
                    <div className="flex justify-between items-center py-2 border-b border-[color:var(--light-gray)]/50">
                      <span className="text-lg font-semibold text-[color:var(--text-color)]">
                        Room Type:
                      </span>
                      <span className="text-lg text-[color:var(--emphasis)]">
                        {roomType || "Please select a room type"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-[color:var(--light-gray)]/50">
                      <span className="text-lg font-semibold text-[color:var(--text-color)]">
                        Number of Rooms:
                      </span>
                      <span className="text-lg text-[color:var(--emphasis)]">
                        {numberOfRooms
                          ? `${numberOfRooms} room${
                              numberOfRooms > 1 ? "s" : ""
                            }`
                          : "Please select number of rooms"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-[color:var(--light-gray)]/50">
                      <span className="text-lg font-semibold text-[color:var(--text-color)]">
                        Check-in Date:
                      </span>
                      <span className="text-lg text-[color:var(--emphasis)]">
                        {checkInDate || "Please select check-in date"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-[color:var(--light-gray)]/50">
                      <span className="text-lg font-semibold text-[color:var(--text-color)]">
                        Check-out Date:
                      </span>
                      <span className="text-lg text-[color:var(--emphasis)]">
                        {checkOutDate || "Please select check-out date"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b-2 border-[color:var(--emphasis)]/50 pt-4">
                      <span className="text-xl font-bold text-[color:var(--text-color)]">
                        Total Payment:
                      </span>
                      <span className="text-2xl font-bold text-[color:var(--emphasis)]">
                        ₦{totalPayment?.toLocaleString() || "0"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant={isFormValid() ? "emphasis" : "disabled"}
                    className={`mt-[3rem] text-xl py-3 ${
                      !isFormValid() ? "cursor-pointer hover:bg-gray-300" : ""
                    }`}
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <IoRefresh className="animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>
                </div>
              </div>

              {/* Validation Error Message */}
            </div>
            {validationError.show && (
              <div className="mt-[2rem] p-[2rem] bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-[1rem]">
                  {validationError.message || 'Please fill in all required fields:'}
                </h3>
                <ul className="text-red-700">
                  {getMissingFields().map((field, index) => (
                    <li key={index} className="mb-[0.5rem]">
                      • {field}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {/* Success Modal */}
        {showSuccessModal && reservationData && (
          <div className="fixed inset-0 bg-black/80 shadow-xl bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-3xl font-bold text-[color:var(--emphasis)] mb-4">
                Booking Confirmed! 🎉
              </h2>

              <div className="space-y-4 mb-6">
                <p className="text-xl">
                  Thank you,{" "}
                  <span className="font-semibold">
                    {reservationData.guestName}
                  </span>
                  ! Your booking has been placed on hold successfully.
                </p>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-2xl mb-2">
                    Reservation Details:
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xl">
                    <div>Reservation ID:</div>
                    <div className="font-mono font-bold">
                      {reservationData.id}
                    </div>

                    <div>Room Type:</div>
                    <div>{reservationData.roomType}</div>

                    <div>Check-in:</div>
                    <div>
                      {new Date(reservationData.checkIn).toLocaleDateString()}
                    </div>

                    <div>Check-out:</div>
                    <div>
                      {new Date(reservationData.checkOut).toLocaleDateString()}
                    </div>

                    <div>Rooms:</div>
                    <div>{reservationData.roomsBooked}</div>

                    <div>Total Amount:</div>
                    <div>₦{reservationData.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-[color:var(--accent)]/30 border-l-4 border-[color:var(--emphasis)] p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-10 w-10 text-yellow-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-xl text-[]">
                        <strong>Important:</strong> This room has been booked on
                        hold for 2 hours. Please proceed to the hotel or contact us to
                        finalize your reservation and make payment.
                        <br />
                        <br />
                        <span className="font-bold">
                          Please save your Reservation ID:{" "}
                          <span className="text-lg">{reservationData.id}</span>
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  onClick={handleCloseModal}
                  variant="light-gray"
                  className="text-xl"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // You could implement print functionality here
                    window.print();
                  }}
                  variant="emphasis"
                  className="text-xl"
                >
                  Print Confirmation
                </Button>
              </div>
            </div>
          </div>
        )}
        <Footer />
      </div>
    </>
  );
}
