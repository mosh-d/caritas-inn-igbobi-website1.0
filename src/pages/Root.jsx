import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { fetchRoomDetails } from "../utils/room-data";
import MainNavBar from "../components/shared/MainNavBar";
import axios from "axios";
import { generateHotelSchema } from "../utils/seoUtils";
import SEO from "../components/seo/SEO";
import SafeHelmet from "../components/seo/SafeHelmet";

const API_BASE_URL = "https://five-clover-shared-backend.onrender.com";

// Generate structured data for the hotel
const hotelStructuredData = generateHotelSchema();

export default function RootLayout() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAbout = location.pathname === "/about";
  const isContact = location.pathname === "/contact";

  // Shared state for dates
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("1");

  // Booking state
  const [roomType, setRoomType] = useState("");
  const [roomTypeId, setRoomTypeId] = useState(null);
  const [totalPayment, setTotalPayment] = useState(0);
  const [roomPrices, setRoomPrices] = useState({});
  const [branchId] = useState(3); // Caritas Inn Igbobi branch ID
  const [roomTypes, setRoomTypes] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // Validated setter for check-in date
  const handleSetCheckInDate = (date) => {
    const today = new Date().toISOString().split("T")[0];
    const selected = new Date(date);
    const todayDate = new Date(today);

    if (selected < todayDate) {
      setCheckInDate(today);
    } else {
      setCheckInDate(date);
      // If check-out is set and is before or equal to new check-in, adjust it
      if (checkOutDate && new Date(checkOutDate) <= selected) {
        const nextDay = new Date(selected);
        nextDay.setDate(nextDay.getDate() + 1);
        setCheckOutDate(nextDay.toISOString().split("T")[0]);
      }
    }
  };

  // Validated setter for check-out date
  const handleSetCheckOutDate = (date) => {
    const selected = new Date(date);
    const currentCheckIn = checkInDate ? new Date(checkInDate) : new Date();

    if (selected <= currentCheckIn) {
      // Set to the day after check-in
      const nextDay = new Date(currentCheckIn);
      nextDay.setDate(nextDay.getDate() + 1);
      setCheckOutDate(nextDay.toISOString().split("T")[0]);
    } else {
      setCheckOutDate(date);
    }
  };
  const calculateTotalPayment = (roomType, numberOfRooms) => {
    // Find the selected room to get the most up-to-date price
    const selectedRoom = roomTypes.find(
      (room) => room.room_type_name === roomType
    );
    const pricePerNight = selectedRoom?.base_rate || roomPrices[roomType] || 0;

    // Calculate number of nights, default to 1 if dates aren't set
    const nights =
      checkInDate && checkOutDate
        ? Math.max(
            1,
            Math.ceil(
              (new Date(checkOutDate) - new Date(checkInDate)) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 1;

    // Ensure we have valid numbers for calculation
    const numRooms = Math.max(1, parseInt(numberOfRooms || 1));
    const total = pricePerNight * numRooms * nights;

    // Add a sanity check to prevent unreasonably large numbers
    if (total > 10000000) {
      // If total exceeds 10 million Naira
      console.warn("Suspiciously high total payment calculated:", total);
      return 0; // Return 0 or handle this case appropriately
    }

    return total;
  };

  // Update total payment when room type or number of rooms change
  const updateTotalPayment = (newRoomType, numberOfRoomsToUse) => {
    const rooms =
      numberOfRoomsToUse !== undefined ? numberOfRoomsToUse : numberOfRooms;
    const total = calculateTotalPayment(newRoomType, rooms);
    setTotalPayment(total);
    return total;
  };

  // Function to fetch available rooms
  const fetchAvailableRooms = async (checkIn, checkOut) => {
    try {
      setIsLoadingRooms(true);
      // Ensure API_BASE_URL doesn't end with a slash to prevent double slashes
      const baseUrl = API_BASE_URL.endsWith("/")
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      const response = await axios.post(`${baseUrl}/api/rooms/details`, {
        branch_id: branchId,
        check_in_date: checkIn || checkInDate,
        check_out_date: checkOut || checkOutDate,
      });
      const data = response.data;
      if (data?.room_types?.length) {
        setRoomTypes(data.room_types);

        // Update room prices
        const prices = {};
        data.room_types.forEach((room) => {
          prices[room.room_type_name] = room.base_rate;
        });
        setRoomPrices(prices);

        // Update current room type if it's no longer available
        if (
          roomType &&
          !data.room_types.some((room) => room.room_type_name === roomType)
        ) {
          setRoomType("");
          setRoomTypeId(null);
        }
      }
      return data;
    } catch (error) {
      console.error("Error fetching room details:", error);
      throw error;
    } finally {
      setIsLoadingRooms(false);
    }
  };

  // Fetch room data on component mount
  useEffect(() => {
    fetchAvailableRooms(checkInDate, checkOutDate);
  }, []);

  // Update total payment when relevant state changes
  useEffect(() => {
    if (roomType && Object.keys(roomPrices).length > 0) {
      updateTotalPayment(roomType, numberOfRooms);
    }
  }, [roomType, numberOfRooms, checkInDate, checkOutDate, roomPrices]);
  // Update room type and room type ID together
  const handleSetRoomType = (type) => {
    setRoomType(type);
    if (type) {
      const selectedRoom = roomTypes.find(
        (room) => room.room_type_name === type
      );
      if (selectedRoom) {
        setRoomTypeId(selectedRoom.room_type_id);
      }
    } else {
      setRoomTypeId(null);
    }
  };

  const contextValue = {
    checkInDate,
    setCheckInDate: handleSetCheckInDate,
    checkOutDate,
    setCheckOutDate: handleSetCheckOutDate,
    numberOfRooms,
    setNumberOfRooms,
    roomType,
    setRoomType: handleSetRoomType,
    roomTypeId,
    branchId,
    totalPayment,
    calculateTotalPayment,
    updateTotalPayment,
    roomTypes,
    isLoadingRooms,
    fetchAvailableRooms,
  };

  // Get current page metadata
  const getPageMetadata = () => {
    const baseUrl = "https://caritasinnigbobi.fivecloverhotels.com";
    const defaultMetadata = {
      title: "Caritas Inn Igbobi | Luxury Accommodation in Yaba, Lagos",
      description:
        "Experience luxury and comfort at Caritas Inn Igbobi. Book your stay at our premium hotel in Yaba, Lagos.",
      url: `${baseUrl}${location.pathname}`,
      type: "website",
      image: "/ring-ruby-logo.webp",
    };

    const pageMetadata = {
      "/": {
        title: "Caritas Inn Igbobi | Luxury Accommodation in Yaba, Lagos",
        description:
          "Experience luxury and comfort at Caritas Inn Igbobi. Book your stay at our premium hotel in Yaba, Lagos.",
      },
      "/about": {
        title: "About Us | Caritas Inn Igbobi",
        description:
          "Discover the story behind Caritas Inn Igbobi and our commitment to providing exceptional hospitality in Yaba, Lagos.",
      },
      "/rooms": {
        title: "Our Rooms | Caritas Inn Igbobi",
        description:
          "Explore our luxurious rooms at Caritas Inn Igbobi, designed for your comfort and relaxation.",
      },
      "/gallery": {
        title: "Photo Gallery | Caritas Inn Igbobi",
        description:
          "View our photo gallery showcasing the luxurious facilities and comfortable accommodations at Caritas Inn Igbobi.",
      },
      "/contact": {
        title: "Contact Us | Caritas Inn Igbobi",
        description:
          "Get in touch with Caritas Inn Igbobi. Our friendly staff is ready to assist with your booking and inquiries.",
      },
      "/booking": {
        title: "Book Your Stay | Caritas Inn Igbobi",
        description:
          "Book your luxurious stay at Caritas Inn Igbobi. Best rates guaranteed for our premium accommodations in Yaba.",
      },
    };

    return { ...defaultMetadata, ...(pageMetadata[location.pathname] || {}) };
  };

  const metadata = getPageMetadata();

  return (
    <div className="min-h-screen flex flex-col">
      {/* SEO Component */}
      <SafeHelmet>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta property="og:title" content={metadata.title} />
        <meta property="og:description" content={metadata.description} />
        <meta property="og:url" content={metadata.url} />
        <meta property="og:type" content={metadata.type} />
        <meta property="og:image" content={metadata.image} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Hotel",
            name: "Caritas Inn Igbobi",
            description:
              "Experience luxury and comfort at Caritas Inn Igbobi. Book your stay at our premium hotel in Yaba, Lagos.",
            image:
              "https://caritasinnigbobi.fivecloverhotels.com/caritas%20logo.webp",
            url: "https://caritasinnigbobi.fivecloverhotels.com",
            address: {
              "@type": "PostalAddress",
              streetAddress:
                "Igbobi College Road, Beside First Bank, WAEC Bus-stop, Yaba",
              addressLocality: "Yaba",
              addressRegion: "Lagos",
              postalCode: "100001",
              addressCountry: "NG",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: 6.521371272421725,
              longitude: 3.3715264111270296,
            },
            priceRange: "₦₦",
            starRating: {
              "@type": "Rating",
              ratingValue: "4.5",
              bestRating: "5",
            },
            telephone: "+2348126955544",
            email: "info@caritasinnigbobihotel.com",
            sameAs: [
              "https://www.facebook.com/RingrubyHotel?_rdc=1&_rdr#",
              "https://www.instagram.com/ringruby_hotel/",
              "https://twitter.com/fivecloverhotel",
            ],
          })}
        </script>
      </SafeHelmet>
      <header>{!isHome && <MainNavBar />}</header>
      <main>
        <Outlet context={contextValue} />
      </main>
    </div>
  );
}
