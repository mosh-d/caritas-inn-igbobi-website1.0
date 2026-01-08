import { useState, useEffect } from "react";
import Button from "./Button";

export default function RoomSelectionModal({ isOpen, onClose, onSelectRoom, selectedRoomType, selectedNumberOfRooms }) {
  const [step, setStep] = useState(1); // 1: Room Type, 2: Number of Rooms
  const [tempRoomType, setTempRoomType] = useState(selectedRoomType || "");

  const BUDGET_ROOM_LIMIT = 12;
  const DIPLOMATIC_ROOM_LIMIT = 4;

  const handleRoomTypeSelect = (roomType) => {
    setTempRoomType(roomType);
    setStep(2);
  };

  const handleNumberSelect = (number) => {
    onSelectRoom(tempRoomType, number);
    onClose();
    setStep(1);
    setTempRoomType("");
  };

  const handleBack = () => {
    setStep(1);
    setTempRoomType("");
  };

  const handleClose = () => {
    onClose();
    setStep(1);
    setTempRoomType("");
  };

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTempRoomType(selectedRoomType || "");
    }
  }, [isOpen, selectedRoomType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-[3rem] rounded-lg shadow-xl max-w-md w-full mx-[2rem]">
        <div className="flex justify-between items-center mb-[2rem]">
          <h2 className="text-3xl font-secondary font-bold text-[color:var(--text-color)]">
            {step === 1 ? "Select Room Type" : "Select Number of Rooms"}
          </h2>
          <button
            onClick={handleClose}
            className="text-[color:var(--text-color)] hover:text-[color:var(--emphasis)] text-2xl"
          >
            ✕
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-[1.5rem]">
            <Button
              variant={selectedRoomType === "Budget Room" ? "emphasis" : "light-gray"}
              className="w-full text-xl py-3"
              onClick={() => handleRoomTypeSelect("Budget Room")}
            >
              Budget Room (1-{BUDGET_ROOM_LIMIT} rooms available)
            </Button>
            <Button
              variant={selectedRoomType === "Diplomatic Room" ? "emphasis" : "light-gray"}
              className="w-full text-xl py-3"
              onClick={() => handleRoomTypeSelect("Diplomatic Room")}
            >
              Diplomatic Room (1-{DIPLOMATIC_ROOM_LIMIT} rooms available)
            </Button>
          </div>
        ) : (
          <div className="space-y-[1rem]">
            <div className="mb-[2rem]">
              <Button
                variant="text-color"
                className="mb-[1rem]"
                onClick={handleBack}
              >
                ← Back to Room Type
              </Button>
              <p className="text-lg text-[color:var(--text-color)] font-semibold">
                Selected: <span className="text-[color:var(--emphasis)]">{tempRoomType}</span>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-[1rem]">
              {Array.from({ length: tempRoomType === "Budget Room" ? BUDGET_ROOM_LIMIT : DIPLOMATIC_ROOM_LIMIT }, (_, i) => i + 1).map((number) => (
                <Button
                  key={number}
                  variant={selectedNumberOfRooms === number.toString() ? "emphasis" : "light-gray"}
                  className="text-lg py-2"
                  onClick={() => handleNumberSelect(number.toString())}
                >
                  {number}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
