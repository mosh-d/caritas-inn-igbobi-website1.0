import { useState, useEffect } from "react";
import { fetchRoomDetails } from "../utils/room-data";
import axios from "axios";
import Button from "../components/shared/Button";
import { IoRefresh } from "react-icons/io5";

const API_BASE_URL = "https://five-clover-shared-backend.onrender.com";

const ROOM_TYPE_MAP = {
  standard: 6,
  classic: 7,
  deluxe: 8,
  executive: 9,
};

export default function AdminOverviewPage() {
  const [roomType, setRoomType] = useState("standard");
  const [roomDetails, setRoomDetails] = useState({
    maxCapacity: 0,
    totalAvailableRooms: 0,
    activeBookings: 0,
    expiredBookings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [tempRoomCount, setTempRoomCount] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRoomData = async () => {
    try {
      setIsLoading(true);
      const roomTypeId = ROOM_TYPE_MAP[roomType];
      const data = await fetchRoomDetails();

      // Find the room type in the response
      const roomTypeData =
        data.room_types?.find((rt) => rt.room_type_id === roomTypeId) || {};

      setRoomDetails({
        maxCapacity: roomTypeData.max_capacity || 0,
        totalAvailableRooms: roomTypeData.available_rooms || 0,
        activeBookings: 0,
        expiredBookings: 0,
      });
      setTempRoomCount(roomTypeData.available_rooms?.toString() || "0");
    } catch (error) {
      console.error("Error loading room data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoomData();
  }, [roomType]);

  const validateInput = (value) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      setErrorMessage("Please enter a valid number");
      return false;
    }
    if (numValue < 0) {
      setErrorMessage("Room count cannot be less than 0");
      return false;
    }
    if (numValue > roomDetails.maxCapacity) {
      setErrorMessage(
        `Cannot exceed maximum capacity of ${roomDetails.maxCapacity} rooms`
      );
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleUpdateRoomCount = async () => {
    if (!validateInput(tempRoomCount)) {
      return;
    }

    try {
      const roomTypeId = ROOM_TYPE_MAP[roomType];
      const newCount = parseInt(tempRoomCount, 10);

      // Ensure API_BASE_URL doesn't end with a slash to prevent double slashes
      const baseUrl = API_BASE_URL.endsWith("/")
        ? API_BASE_URL.slice(0, -1)
        : API_BASE_URL;
      const response = await axios.post(
        `${baseUrl}/api/rooms/manual-update`,
        {
          room_type_id: roomTypeId,
          new_room_count: newCount,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );

      setUpdateMessage(response.data.message);
      setIsEditing(false);
      await loadRoomData(); // Refresh the data

      // Clear the message after 3 seconds
      setTimeout(() => setUpdateMessage(""), 5000);
    } catch (error) {
      console.error("Error updating room count:", error);
      setUpdateMessage(
        error.response?.data?.message || "Failed to update room count"
      );
      setTimeout(() => setUpdateMessage(""), 5000);
    }
  };

  return (
    <>
      <div
        data-component="AdminOverview"
        className="px-[4rem] py-[4rem] flex flex-col items-start gap-[4rem]"
      >
        <div className="w-full flex justify-between items-center">
          <h1 className="text-6xl font-secondary font-bold text-[color:var(--black)]">
            Overview
          </h1>
          <div className="w-56 flex justify-end">
            <button
              onClick={loadRoomData}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 text-xl w-56 py-4 bg-[color:var(--text-color)] text-white rounded cursor-pointer hover:bg-[color:var(--text-color)]/70 disabled:bg-[color:var(--text-color)]"
              title="Refresh room data"
            >
              <IoRefresh
                size="1.5rem"
                className={isLoading ? "animate-spin" : ""}
              />
              {isLoading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>
        <menu className="flex gap-[4rem] text-xl text-[color:var(--emphasis)]">
          {roomType === "standard" ? (
            <li className="bg-[color:var(--emphasis)] text-[color:var(--white)] px-2 py-1 cursor-pointer">
              STANDARD
            </li>
          ) : (
            <li
              className="border-b-[1px] border-[color:var(--emphasis)] cursor-pointer"
              onClick={() => setRoomType("standard")}
            >
              STANDARD
            </li>
          )}
          {roomType === "classic" ? (
            <li className="bg-[color:var(--emphasis)] text-[color:var(--white)] px-2 py-1 cursor-pointer">
              CLASSIC
            </li>
          ) : (
            <li
              className="border-b-[1px] border-[color:var(--emphasis)] cursor-pointer"
              onClick={() => setRoomType("classic")}
            >
              CLASSIC
            </li>
          )}
          {roomType === "deluxe" ? (
            <li className="bg-[color:var(--emphasis)] text-[color:var(--white)] px-2 py-1 cursor-pointer">
              DELUXE
            </li>
          ) : (
            <li
              className="border-b-[1px] border-[color:var(--emphasis)] cursor-pointer"
              onClick={() => setRoomType("deluxe")}
            >
              DELUXE
            </li>
          )}
          {roomType === "executive" ? (
            <li className="bg-[color:var(--emphasis)] text-[color:var(--white)] px-2 py-1 cursor-pointer">
              EXECUTIVE
            </li>
          ) : (
            <li
              className="border-b-[1px] border-[color:var(--emphasis)] cursor-pointer"
              onClick={() => setRoomType("executive")}
            >
              EXECUTIVE
            </li>
          )}
        </menu>
        {isLoading ? (
          <div className="w-full flex justify-center py-12">
            <p>Loading room data...</p>
          </div>
        ) : (
          <div
            data-component="AdminOverviewRoomDetails"
            className="w-full flex flex-wrap gap-[2rem] text-3xl"
          >
            <div
              data-component="AdminOverviewRoomDetailsItem"
              className="w-[25%] min-w-[40rem]"
            >
              <div className="flex flex-col gap-[4rem] bg-[color:var(--white)] p-[1rem] shadow-lg h-full justify-between">
                <p>Max Capacity</p>
                <div className="w-full flex justify-end">
                  <p className="font-black text-5xl">
                    {roomDetails.maxCapacity}
                  </p>
                </div>
              </div>
            </div>
            <div
              data-component="AdminOverviewRoomDetailsItem"
              className="w-[25%] min-w-[40rem]"
            >
              <div className="flex flex-col gap-[4rem] bg-[color:var(--white)] p-[1rem] shadow-lg h-full justify-between">
                <p>Total Available Rooms</p>
                <div className="w-full flex flex-col items-end gap-2">
                  {isEditing ? (
                    <>
                      <div className="flex flex-col items-end gap-2 text-5xl">
                        <input
                          type="number"
                          value={tempRoomCount}
                          onChange={(e) => {
                            setTempRoomCount(e.target.value);
                            validateInput(e.target.value);
                          }}
                          className={`w-24 text-5xl px-2 py-1 border rounded text-right ${
                            errorMessage ? "border-red-500" : "border-gray-300"
                          }`}
                          min="0"
                          max={roomDetails.maxCapacity}
                        />
                        {errorMessage && (
                          <div className="text-xl text-red-600">
                            {errorMessage}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleUpdateRoomCount}
                        variant="light-gray"
                        className="w-fit text-xl"
                      >
                        Update
                      </Button>
                    </>
                  ) : (
                    <p
                      className="font-black text-5xl cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                      onClick={() => setIsEditing(true)}
                    >
                      {roomDetails.totalAvailableRooms}
                    </p>
                  )}
                  {updateMessage && (
                    <div className="text-xl text-green-600 mt-1">
                      {updateMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
