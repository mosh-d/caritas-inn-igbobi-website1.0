import { useOutletContext } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import CustomInput from "../shared/CustomInput";
import Button from "../shared/Button";
import GalleryModal from "../shared/GalleryModal";

//React icons
import { LiaShowerSolid, LiaToiletPaperSolid } from "react-icons/lia";
import { FaChild } from "react-icons/fa6";
import { IoIosMan } from "react-icons/io";
import {
  MdDesk,
  MdOutlineCoffeeMaker,
  MdOutlineEmojiFoodBeverage,
} from "react-icons/md";
import { RxRulerSquare } from "react-icons/rx";
import { BiDish } from "react-icons/bi";
import {
  IoWifiOutline,
  IoBedOutline,
  IoCardOutline,
  IoPersonOutline,
  IoRefresh,
} from "react-icons/io5";
import { FaTv } from "react-icons/fa";
import { LuBath } from "react-icons/lu";
import { TbAirConditioning, TbFridge } from "react-icons/tb";

//Room images
import standardRoomImage from "../../assets/room-images/standard/standard.jpg";
import standardRoomImage2 from "../../assets/room-images/standard/standard-2.jpg";
import standardRoomImage3 from "../../assets/room-images/standard/standard-3.jpg";
import standardRoomImage4 from "../../assets/room-images/standard/standard-4.jpg";
import classicRoomImage from "../../assets/room-images/classic/classic.jpg";
import classicRoomImage2 from "../../assets/room-images/classic/classic-2.jpg";
import classicRoomImage3 from "../../assets/room-images/classic/classic-3.jpg";
import classicRoomImage4 from "../../assets/room-images/classic/classic-4.jpg";
import deluxeRoomImage from "../../assets/room-images/deluxe/deluxe.jpg";
import deluxeRoomImage2 from "../../assets/room-images/deluxe/deluxe-2.jpg";
import deluxeRoomImage3 from "../../assets/room-images/deluxe/deluxe-3.jpg";
import deluxeRoomImage4 from "../../assets/room-images/deluxe/deluxe-4.jpg";
import executiveRoomImage from "../../assets/room-images/executive/executive.jpg";
import executiveRoomImage2 from "../../assets/room-images/executive/executive-2.jpg";
import executiveRoomImage3 from "../../assets/room-images/executive/executive-3.jpg";
import executiveRoomImage4 from "../../assets/room-images/executive/executive-4.jpg";

// standard room images
const standardRoomImages = [
  standardRoomImage,
  standardRoomImage2,
  standardRoomImage3,
  standardRoomImage4,
];

// classic room images
const classicRoomImages = [
  classicRoomImage,
  classicRoomImage2,
  classicRoomImage3,
  classicRoomImage4,
];

// deluxe room images
const deluxeRoomImages = [
  deluxeRoomImage,
  deluxeRoomImage2,
  deluxeRoomImage3,
  deluxeRoomImage4,
];

// executive room images
const executiveRoomImages = [
  executiveRoomImage,
  executiveRoomImage2,
  executiveRoomImage3,
  executiveRoomImage4,
];

// Room type to gallery images mapping
const roomGalleryImages = {
  Standard: standardRoomImages,
  Classic: classicRoomImages,
  Deluxe: deluxeRoomImages,
  Executive: executiveRoomImages,
};

// Room type to image mapping
const roomTypeImages = {
  Standard: standardRoomImage,
  Classic: classicRoomImage,
  Deluxe: deluxeRoomImage,
  Executive: executiveRoomImage,
};

const useSharedContext = () => {
  const context = useOutletContext();
  if (!context) {
    console.error("No context available in AvailableRoomsSection");
    throw new Error(
      "Component must be used within a layout providing shared context"
    );
  }
  return context;
};

const API_BASE_URL = "https://five-clover-shared-backend.onrender.com";

const amenityIcons = {
  free_wifi: <IoWifiOutline size="2.5rem" />,
  ac: <TbAirConditioning size="2.5rem" />,
  shower: <LiaShowerSolid size="2.5rem" />,
  workstation: <MdDesk size="2.5rem" />,
  breakfast: <BiDish size="2.5rem" />,
  private_bathroom: <LuBath size="2.5rem" />,
  toiletries: <LiaToiletPaperSolid size="2.5rem" />,
  king_size_bed: <IoBedOutline size="2.5rem" />,
  smart_tv: <FaTv size="2.5rem" />,
  coffee_station: <MdOutlineCoffeeMaker size="2.5rem" />,
  fridge: <TbFridge size="2.5rem" />,
  balcony: <RxRulerSquare size="2.5rem" />,
  coffee_maker: <MdOutlineCoffeeMaker size="2.5rem" />,
  electric_key: <IoCardOutline size="2.5rem" />,
  complimentary_drinks: <MdOutlineEmojiFoodBeverage size="2.5rem" />,
};

const getAmenityDisplayName = (amenity) => {
  return amenity
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function AvailableRoomsSection() {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState({});
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentGalleryImages, setCurrentGalleryImages] = useState([]);

  const handleViewImages = (images) => {
    if (!images || images.length === 0) return;

    const formattedImages = images.map((img, index) => ({
      src: img,
      alt: `Room Image ${index + 1}`,
    }));
    setCurrentGalleryImages(formattedImages);
    setIsGalleryOpen(true);
  };

  const {
    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    setNumberOfRooms,
    setRoomType,
    updateTotalPayment,
    branchId,
  } = useSharedContext();

  const fetchRoomData = useCallback(async () => {
    try {
      // Ensure API_BASE_URL doesn't end with a slash to prevent double slashes
      const baseUrl = API_BASE_URL.endsWith("/")
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      const response = await axios.post(`${baseUrl}/api/rooms/details`, {
        branch_id: branchId,
      });

      console.log("API Response:", response.data);

      if (response.data && response.data.room_types) {
        setRoomTypes(response.data.room_types);

        const initialSelectedRooms = {};
        response.data.room_types.forEach((room) => {
          initialSelectedRooms[room.room_type_id] = "0"; // Default to 0 rooms selected
        });
        setSelectedRooms((prev) => ({
          ...prev,
          ...initialSelectedRooms,
        }));
      }
    } catch (err) {
      console.error("Error fetching room data:", err);
      setError("Failed to load room data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchRoomData();
  }, [fetchRoomData, lastUpdated]);

  const refreshData = () => {
    setLastUpdated(Date.now());
    setLoading(true);
    setError(null);
  };

  const handleRoomsChange = (roomTypeId, value) => {
    setSelectedRooms((prev) => ({
      ...prev,
      [roomTypeId]: value,
    }));
  };

  const handleBookRoom = (room) => {
    const selectedRoomCount = parseInt(selectedRooms[room.room_type_id] || "0");
    if (selectedRoomCount <= 0) return; // Don't proceed if no rooms selected

    setRoomType(room.room_type_name);
    setNumberOfRooms(selectedRoomCount.toString());
    updateTotalPayment(
      room.room_type_name,
      selectedRoomCount // Just pass the number of rooms, not the total price
    );
    // Scroll to top before navigating
    window.scrollTo(0, 0);
    navigate("/booking-confirmation");
  };

  const renderAmenities = (amenities) => {
    if (!amenities) return null;

    return amenities.split(", ").map((amenity, index) => {
      const icon = amenityIcons[amenity] || null;
      return (
        <div
          key={index}
          className="flex items-center gap-2 p-[.5rem] text-white"
          title={getAmenityDisplayName(amenity)}
        >
          {icon && <span className="text-white">{icon}</span>}
          <span className="text-lg text-white">
            {getAmenityDisplayName(amenity)}
          </span>
        </div>
      );
    });
  };

  const renderCapacityIcons = (adults, children) => {
    return (
      <div className="flex flex-col max-sm:flex-row items-center max-sm:items-end gap-4">
        <div className="flex items-start">
          <IoIosMan size="4rem" title="Adults" />
          <span className="text-2xl">{adults}</span>
        </div>
        {children > 0 && (
          <div className="flex items-start">
            <FaChild size="2.5rem" title="Children" />
            <span className="text-2xl">{children}</span>
          </div>
        )}
      </div>
    );
  };

  if (loading && roomTypes.length === 0) {
    return <div className="p-12 text-center">Loading room information...</div>;
  }

  return (
    <div
      id="available-rooms"
      className="py-[12rem] max-sm:py-[0] px-[2rem] lg:px-[12rem] w-full flex flex-col gap-[4.8rem]"
    >
      <div className="flex max-sm:flex-col max-sm:gap-[2.4rem] justify-between items-center max-sm:items-start">
        <h2 className="text-6xl font-secondary font-bold">Available Rooms</h2>
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex text-xl gap-2 px-6 py-4 gap-[1.2rem] bg-[color:var(--text-color)] text-white rounded hover:cursor-pointer hover:bg-[color:var(--text-color)]/70 disabled:bg-[color:var(--text-color)]"
        >
          <IoRefresh size="1.5rem" className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing..." : "Refresh Rooms"}
        </button>
      </div>

      {error && (
        <div className="p-4 text-xl text-center text-red-500 bg-red-50 rounded">
          {error}
          <button
            onClick={refreshData}
            className="ml-4 text-xl text-[color:var(--text-color)] hover:underline"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="flex w-full max-sm:flex-col max-sm:gap-[2.4rem] gap-[6rem] justify-between">
        <div className="flex gap-[4.8rem]">
          <CustomInput
            label="Check in"
            id="check-in"
            type="date"
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            style={{ cursor: "text" }}
          />
          <CustomInput
            label="Check out"
            id="check-out"
            type="date"
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
            style={{ cursor: "text" }}
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead className="text-white bg-[color:var(--text-color)]">
            <tr>
              <th className="text-xl font-bold p-4 text-left">Room type</th>
              <th className="text-xl font-bold p-4 text-left">Room capacity</th>
              <th className="text-xl font-bold p-4 text-left">
                Number of Rooms
              </th>
              <th className="text-xl font-bold p-4 text-left">Today's Price</th>
              <th className="text-xl font-bold p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="text-[color:var(--light-gray)]">
            {roomTypes.map((room) => (
              <tr key={`desktop-${room.room_type_id}`}>
                <td
                  className="flex flex-col p-4 border border-[color:var(--background-color)] border-1 bg-cover bg-center relative"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, hsla(359, 50%, 7%, .85), hsla(359, 50%, 7%, .85)), url(${
                      roomTypeImages[room.room_type_name] || standardRoomImage
                    })`,
                    // backgroundBlendMode: 'multiply'
                  }}
                >
                  <div className="relative z-10 gap-[4rem] flex flex-col py-[2rem]">
                    <div className="flex justify-between">
                      <h4 className="text-5xl font-secondary font-bold text-white">
                        {room.room_type_name}
                      </h4>
                      <button
                        className="text-[color:var(--emphasis)] text-xl cursor-pointer border-b py-[.5rem]"
                        onClick={() =>
                          handleViewImages(
                            roomGalleryImages[room.room_type_name]
                          )
                        }
                      >
                        View Images
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {renderAmenities(room.amenities)}
                    </div>
                  </div>
                </td>
                <td className="p-4 border border-[color:var(--text-color)]/20">
                  {renderCapacityIcons(
                    room.adult_capacity,
                    room.child_capacity
                  )}
                </td>
                <td className="p-4 border border-[color:var(--text-color)]/20">
                  <select
                    value={selectedRooms[room.room_type_id] || "0"}
                    onChange={(e) =>
                      handleRoomsChange(room.room_type_id, e.target.value)
                    }
                    className="w-full p-2 border rounded focus:outline-none hover:cursor-pointer text-xl"
                    disabled={loading || !room.total_rooms}
                  >
                    <option value="0" className="text-xl">
                      0
                    </option>
                    {Array.from({ length: room.total_rooms || 0 }, (_, i) => (
                      <option
                        key={i + 1}
                        value={i + 1}
                        className="text-xl hover:cursor-pointer"
                      >
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4 border border-[color:var(--text-color)]/20">
                  <div className="flex flex-col gap-6">
                    <span className="text-xl font-bold">
                      {room.currency_symbol || "₦"}
                      {room.base_rate?.toLocaleString()} per night
                    </span>
                    {parseInt(selectedRooms[room.room_type_id] || "1") > 1 && (
                      <>
                        <hr />
                        <span className="text-2xl font-bold text-[color:var(--emphasis)]">
                          {room.currency_symbol || "₦"}
                          {(
                            room.base_rate *
                            parseInt(selectedRooms[room.room_type_id] || "1")
                          ).toLocaleString()}{" "}
                          total
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="p-4 border border-[color:var(--text-color)]/20">
                  <Button
                    variant="emphasis"
                    onClick={() => handleBookRoom(room)}
                    className="w-full text-xl"
                    disabled={
                      loading ||
                      !parseInt(selectedRooms[room.room_type_id] || "0")
                    }
                  >
                    {parseInt(selectedRooms[room.room_type_id] || "0")
                      ? "Book"
                      : "Select rooms first"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-6">
        {roomTypes.map((room) => (
          <div
            key={`mobile-${room.room_type_id}`}
            className="bg-cover bg-center relative text-[color:var(--white)] border border-[color:var(--white)] rounded-lg overflow-hidden"
            style={{
              backgroundImage: `linear-gradient(to bottom, hsla(359, 50%, 7%, .9), hsla(359, 50%, 7%, .9)), url(${
                roomTypeImages[room.room_type_name] || standardRoomImage
              })`,
            }}
          >
            {/* Room Type Header */}
            <div className="p-4">
              <div className="relative z-10">
                <div className="flex justify-between">
                  <h4 className="text-4xl font-secondary font-bold">
                    {room.room_type_name}
                  </h4>
                  <button
                    className="text-[color:var(--emphasis)] text-xl cursor-pointer border-b py-[.5rem]"
                    onClick={() =>
                      handleViewImages(roomGalleryImages[room.room_type_name])
                    }
                  >
                    View Images
                  </button>
                </div>
              </div>
            </div>

            {/* Room Content */}
            <div className="p-4 space-y-4 flex flex-col gap-4">
              {/* Amenities */}
              <div className="border border-[color:var(--white)]/20 p-[1rem]">
                <h5 className="text-xl font-semibold mb-2">Amenities</h5>
                <div className="grid grid-cols-2 gap-2">
                  {renderAmenities(room.amenities)}
                </div>
              </div>

              {/* Capacity */}
              <div className="border border-[color:var(--white)]/20 p-[1rem]">
                <h5 className="text-xl font-semibold mb-2">Capacity</h5>
                <div className="flex items-center gap-4">
                  {renderCapacityIcons(
                    room.adult_capacity,
                    room.child_capacity
                  )}
                </div>
              </div>

              {/* Number of Rooms */}
              <div className="border border-[color:var(--white)]/20 p-[1rem]">
                <h5 className="text-xl font-semibold mb-2">Number of Rooms</h5>
                <select
                  value={selectedRooms[room.room_type_id] || "0"}
                  onChange={(e) =>
                    handleRoomsChange(room.room_type_id, e.target.value)
                  }
                  className="w-full p-2 border rounded focus:outline-none cursor-pointer text-lg text-white"
                  disabled={loading || !room.total_rooms}
                >
                  <option
                    value="0"
                    className="text-lg cursor-pointer text-[color:var(--text-color)]"
                  >
                    0 (Select rooms)
                  </option>
                  {Array.from({ length: room.total_rooms || 0 }, (_, i) => (
                    <option
                      key={i + 1}
                      value={i + 1}
                      className="text-lg cursor-pointer text-[color:var(--text-color)]"
                    >
                      {i + 1} Room{i !== 0 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="border border-[color:var(--white)]/20 p-[1rem]">
                <h5 className="text-xl font-semibold mb-2">Price</h5>
                <div className="space-y-2">
                  <div className="text-lg">
                    {room.currency_symbol || "₦"}
                    {room.base_rate?.toLocaleString()} per night
                  </div>
                  {parseInt(selectedRooms[room.room_type_id] || "1") > 1 && (
                    <div className="text-xl font-bold text-[color:var(--emphasis)]">
                      {room.currency_symbol || "₦"}
                      {(
                        room.base_rate *
                        parseInt(selectedRooms[room.room_type_id] || "1")
                      ).toLocaleString()}{" "}
                      total for {selectedRooms[room.room_type_id] || "1"} room
                      {parseInt(selectedRooms[room.room_type_id] || "1") > 1
                        ? "s"
                        : ""}
                    </div>
                  )}
                </div>
              </div>

              {/* Book Button */}
              <div className="pt-2">
                <Button
                  variant="emphasis"
                  onClick={() => handleBookRoom(room)}
                  className="w-full text-lg py-3"
                  disabled={
                    loading ||
                    !parseInt(selectedRooms[room.room_type_id] || "0")
                  }
                >
                  {parseInt(selectedRooms[room.room_type_id] || "0")
                    ? "Book Now"
                    : "Select rooms first"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={currentGalleryImages}
        currentImageIndex={0}
      />
    </div>
  );
}
