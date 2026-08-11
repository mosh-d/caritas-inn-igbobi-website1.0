import { useOutletContext } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import DatePicker from "../shared/DatePicker";
import Button from "../shared/Button";
import GalleryModal from "../shared/GalleryModal";
import { localTodayISO } from "../../utils/date-utils";

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
} from "react-icons/io5";
import { FaTv } from "react-icons/fa";
import { LuBath } from "react-icons/lu";
import { TbAirConditioning, TbFridge } from "react-icons/tb";

// Desktop room images (landscape)
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

// Mobile room images (portrait)
import mobileStandardImage from "../../assets/mobile-room-images/standard/standard.jpg";
import mobileStandardImage2 from "../../assets/mobile-room-images/standard/standard-2.jpg";
import mobileStandardImage3 from "../../assets/mobile-room-images/standard/standard-3.jpg";
import mobileStandardImage4 from "../../assets/mobile-room-images/standard/standard-4.jpg";
import mobileClassicImage from "../../assets/mobile-room-images/classic/classic.jpg";
import mobileClassicImage2 from "../../assets/mobile-room-images/classic/classic-2.jpg";
import mobileClassicImage3 from "../../assets/mobile-room-images/classic/classic-3.jpg";
import mobileClassicImage4 from "../../assets/mobile-room-images/classic/classic-4.jpg";
import mobileDeluxeImage from "../../assets/mobile-room-images/deluxe/deluxe.jpg";
import mobileDeluxeImage2 from "../../assets/mobile-room-images/deluxe/deluxe-2.jpg";
import mobileDeluxeImage3 from "../../assets/mobile-room-images/deluxe/deluxe-3.jpg";
import mobileDeluxeImage4 from "../../assets/mobile-room-images/deluxe/deluxe-4.jpg";
import mobileExecutiveImage from "../../assets/mobile-room-images/executive/executive.jpg";
import mobileExecutiveImage2 from "../../assets/mobile-room-images/executive/executive-2.jpg";
import mobileExecutiveImage3 from "../../assets/mobile-room-images/executive/executive-3.jpg";
import mobileExecutiveImage4 from "../../assets/mobile-room-images/executive/executive-4.jpg";
import mobileExecutiveImage5 from "../../assets/mobile-room-images/executive/executive-5.jpg";

// Desktop standard room images
const standardRoomImages = [
  standardRoomImage,
  standardRoomImage2,
  standardRoomImage3,
  standardRoomImage4,
];

// Desktop classic room images
const classicRoomImages = [
  classicRoomImage,
  classicRoomImage2,
  classicRoomImage3,
  classicRoomImage4,
];

// Desktop deluxe room images
const deluxeRoomImages = [
  deluxeRoomImage,
  deluxeRoomImage2,
  deluxeRoomImage3,
  deluxeRoomImage4,
];

// Desktop executive room images
const executiveRoomImages = [
  executiveRoomImage,
  executiveRoomImage2,
  executiveRoomImage3,
  executiveRoomImage4,
];

// Mobile standard room images
const mobileStandardImages = [
  mobileStandardImage,
  mobileStandardImage2,
  mobileStandardImage3,
  mobileStandardImage4,
];

// Mobile classic room images
const mobileClassicImages = [
  mobileClassicImage,
  mobileClassicImage2,
  mobileClassicImage3,
  mobileClassicImage4,
];

// Mobile deluxe room images
const mobileDeluxeImages = [
  mobileDeluxeImage,
  mobileDeluxeImage2,
  mobileDeluxeImage3,
  mobileDeluxeImage4,
];

// Mobile executive room images
const mobileExecutiveImages = [
  mobileExecutiveImage,
  mobileExecutiveImage2,
  mobileExecutiveImage3,
  mobileExecutiveImage4,
  mobileExecutiveImage5,
];

const useSharedContext = () => {
  const context = useOutletContext();
  if (!context) {
    console.error("No context available in AvailableRoomsSection");
    throw new Error(
      "Component must be used within a layout providing shared context",
    );
  }
  return context;
};

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

// A stay's actual nightly rate is base_rate + breakfast_rate — breakfast is
// included by default on every reservation (opting out is a staff-side
// override at check-in, not a guest-facing choice here), so quoting
// base_rate alone understates what the guest will actually be charged.
const nightlyRate = (room) => Number(room.base_rate || 0) + Number(room.breakfast_rate || 0);

export default function AvailableRoomsSection() {
  const navigate = useNavigate();
  const [selectedRooms, setSelectedRooms] = useState({});
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentGalleryImages, setCurrentGalleryImages] = useState([]);

  const today = localTodayISO();

  // Room type to gallery images mapping (Desktop)
  const desktopRoomGalleryImages = {
    Standard: standardRoomImages,
    Classic: classicRoomImages,
    Deluxe: deluxeRoomImages,
    Executive: executiveRoomImages,
  };

  // Room type to gallery images mapping (Mobile)
  const mobileRoomGalleryImages = {
    Standard: mobileStandardImages,
    Classic: mobileClassicImages,
    Deluxe: mobileDeluxeImages,
    Executive: mobileExecutiveImages,
  };

  // Room type to primary image mapping (Desktop)
  const desktopRoomTypeImages = {
    Standard: standardRoomImage,
    Classic: classicRoomImage,
    Deluxe: deluxeRoomImage,
    Executive: executiveRoomImage,
  };

  // Room type to primary image mapping (Mobile)
  const mobileRoomTypeImages = {
    Standard: mobileStandardImage,
    Classic: mobileClassicImage,
    Deluxe: mobileDeluxeImage,
    Executive: mobileExecutiveImage,
  };

  const roomGalleryImages = desktopRoomGalleryImages;
  const roomPrimaryImages = desktopRoomTypeImages;

  const handleViewImages = (images) => {
    if (!images || images.length === 0) return;

    const formattedImages = images
      .filter((img) => img !== undefined)
      .map((img, index) => ({
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
    roomTypes,
    isLoadingRooms,
  } = useSharedContext();

  const minCheckOutDate = useMemo(() => {
    if (!checkInDate) return today;
    const d = new Date(checkInDate + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, [checkInDate, today]);

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
      selectedRoomCount, // Just pass the number of rooms, not the total price
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

  if (isLoadingRooms && roomTypes.length === 0) {
    return <div className="p-12 text-center">Loading room information...</div>;
  }

  return (
    <div
      id="available-rooms"
      className="py-[12rem] max-sm:py-[0] px-[2rem] lg:px-[12rem] w-full flex flex-col gap-[4.8rem]"
    >
      <div className="flex max-sm:flex-col max-sm:gap-[2.4rem] justify-between items-center max-sm:items-start">
        <h2 className="text-6xl font-secondary font-bold">Available Rooms</h2>
      </div>

      <div className="flex w-full max-sm:flex-col max-sm:gap-[2.4rem] gap-[6rem] justify-between">
        <div className="flex gap-[4.8rem] max-sm:flex-col max-sm:gap-[2.4rem]">
          <DatePicker
            label="Check in"
            value={checkInDate}
            onChange={setCheckInDate}
            minDate={today}
            placeholder="Select check-in"
          />
          <DatePicker
            label="Check out"
            value={checkOutDate}
            onChange={setCheckOutDate}
            minDate={minCheckOutDate}
            placeholder="Select check-out"
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
                  className="flex flex-col p-4 border-[color:var(--background-color)] border-1 bg-cover bg-center relative"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, hsla(359, 50%, 7%, .85), hsla(359, 50%, 7%, .85)), url(${
                      roomPrimaryImages[room.room_type_name] ||
                      standardRoomImage
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
                            roomGalleryImages[room.room_type_name],
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
                    room.child_capacity,
                  )}
                </td>
                <td className="p-4 border border-[color:var(--text-color)]/20">
                  <select
                    value={selectedRooms[room.room_type_id] || "0"}
                    onChange={(e) =>
                      handleRoomsChange(room.room_type_id, e.target.value)
                    }
                    className="w-full p-2 border rounded focus:outline-none hover:cursor-pointer text-xl"
                    disabled={isLoadingRooms || !room.total_rooms}
                  >
                    <option value="0" className="text-xl">
                      {room.total_rooms === 0 ? "Unavailable" : "0"}
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
                    <span className="text-3xl font-bold">
                      {room.currency_symbol || "₦"}
                      {nightlyRate(room).toLocaleString()} per night
                    </span>
                    {parseInt(selectedRooms[room.room_type_id] || "1") > 1 && (
                      <>
                        <hr />
                        <span className="text-3xl font-bold text-[color:var(--emphasis)]">
                          {room.currency_symbol || "₦"}
                          {(
                            nightlyRate(room) *
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
                      isLoadingRooms ||
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
                roomPrimaryImages[room.room_type_name] || standardRoomImage
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
                    room.child_capacity,
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
                  disabled={isLoadingRooms || !room.total_rooms}
                >
                  <option
                    value="0"
                    className="text-lg cursor-pointer text-[color:var(--text-color)]"
                  >
                    {room.total_rooms === 0
                      ? "Unavailable"
                      : "0 (Select rooms)"}
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
                  <div className="text-2xl">
                    {room.currency_symbol || "₦"}
                    {nightlyRate(room).toLocaleString()} per night
                  </div>
                  {parseInt(selectedRooms[room.room_type_id] || "1") > 1 && (
                    <div className="text-2xl font-bold text-[color:var(--emphasis)]">
                      {room.currency_symbol || "₦"}
                      {(
                        nightlyRate(room) *
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
                    isLoadingRooms ||
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
