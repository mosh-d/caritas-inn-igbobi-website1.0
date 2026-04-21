import React, { useState, useEffect } from "react";
import { FaTimes, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const GalleryModal = ({ isOpen, onClose, images, currentImageIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(currentImageIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(currentImageIndex);
    }
  }, [isOpen, currentImageIndex]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length
    );
  };

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/90 bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 text-white transition-all duration-300 cursor-pointer"
          aria-label="Close modal"
        >
          <FaTimes size="2.5rem" color="var(--black)" />
        </button>

        <div className="w-full h-full flex flex-col items-center justify-center gap-[1rem] px-4">
          {images.length > 1 && (
            <>
              {/* Flex container for image + navigation */}
              <div className="w-full max-w-[95vw] lg:max-w-[70vw] flex flex-col gap-[1rem]">
                {/* Main image */}
                <div data-component="image container" className="w-full">
                  <img
                    src={currentImage.src}
                    alt={currentImage.alt}
                    className="w-full aspect-[16/9] object-cover shadow-[0_0_10rem_1rem_rgba(0,0,0,.5)] border border-white/20"
                  />
                </div>

                {/* Navigation buttons container - below image */}
                <div className="flex items-center justify-between w-full bg-black/60 rounded-full px-4 py-2">
                  <button
                    onClick={goToPrevious}
                    className="rounded-full p-3 text-white transition-all duration-300 cursor-pointer hover:bg-white/20"
                    aria-label="Previous image"
                  >
                    <FaChevronLeft size="2rem" color="var(--white)" />
                  </button>

                  <span className="text-white text-lg font-semibold">
                    {currentIndex + 1} / {images.length}
                  </span>

                  <button
                    onClick={goToNext}
                    className="rounded-full p-3 text-white transition-all duration-300 cursor-pointer hover:bg-white/20"
                    aria-label="Next image"
                  >
                    <FaChevronRight size="2rem" color="var(--white)" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GalleryModal;
