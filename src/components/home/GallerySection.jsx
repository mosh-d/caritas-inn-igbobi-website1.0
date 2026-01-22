import React, { useState, useEffect } from "react";
import GalleryModal from "../shared/GalleryModal";

// Desktop gallery images (landscape)
import Gallery1 from "../../assets/gallery/gallery-1.jpg";
import Gallery2 from "../../assets/gallery/gallery-2.jpg";
import Gallery3 from "../../assets/gallery/gallery-3.jpg";
import Gallery4 from "../../assets/gallery/gallery-4.jpg";
import Gallery5 from "../../assets/gallery/gallery-5.jpg";
import Gallery6 from "../../assets/gallery/gallery-6.jpg";
import Gallery7 from "../../assets/gallery/gallery-7.jpg";
import Gallery8 from "../../assets/gallery/gallery-8.jpg";
import Gallery9 from "../../assets/gallery/gallery-9.jpg";
import Gallery10 from "../../assets/gallery/gallery-10.jpg";
import Gallery11 from "../../assets/gallery/gallery-11.jpg";
import Gallery12 from "../../assets/gallery/gallery-12.jpg";
import Gallery13 from "../../assets/gallery/gallery-13.jpg";
import Gallery14 from "../../assets/gallery/gallery-14.jpg";
import Gallery15 from "../../assets/gallery/gallery-15.jpg";
import Gallery16 from "../../assets/gallery/gallery-16.jpg";
import Gallery17 from "../../assets/gallery/gallery-17.jpg";
import Gallery18 from "../../assets/gallery/gallery-18.jpg";
import Gallery19 from "../../assets/gallery/gallery-19.jpg";
import Gallery20 from "../../assets/gallery/gallery-20.jpg";
import Gallery21 from "../../assets/gallery/gallery-21.jpg";
import Gallery22 from "../../assets/gallery/gallery-22.jpg";
import Gallery23 from "../../assets/gallery/gallery-23.jpg";
import Gallery24 from "../../assets/gallery/gallery-24.jpg";
import Gallery25 from "../../assets/gallery/gallery-25.jpg";

// Mobile gallery images (portrait)
import MobileGallery1 from "../../assets/mobile-gallery/gallery-1.jpg";
import MobileGallery2 from "../../assets/mobile-gallery/gallery-2.jpg";
import MobileGallery3 from "../../assets/mobile-gallery/gallery-3.jpg";
import MobileGallery4 from "../../assets/mobile-gallery/gallery-4.jpg";
import MobileGallery5 from "../../assets/mobile-gallery/gallery-5.jpg";
import MobileGallery6 from "../../assets/mobile-gallery/gallery-6.jpg";
import MobileGallery7 from "../../assets/mobile-gallery/gallery-7.jpg";
import MobileGallery8 from "../../assets/mobile-gallery/gallery-8.jpg";
import MobileGallery9 from "../../assets/mobile-gallery/gallery-9.jpg";
import MobileGallery10 from "../../assets/mobile-gallery/gallery-10.jpg";
import MobileGallery11 from "../../assets/mobile-gallery/gallery-11.jpg";
import MobileGallery12 from "../../assets/mobile-gallery/gallery-12.jpg";
import MobileGallery13 from "../../assets/mobile-gallery/gallery-13.jpg";
import MobileGallery14 from "../../assets/mobile-gallery/gallery-14.jpg";
import MobileGallery15 from "../../assets/mobile-gallery/gallery-15.jpg";
import MobileGallery16 from "../../assets/mobile-gallery/gallery-16.jpg";
import MobileGallery17 from "../../assets/mobile-gallery/gallery-17.jpg";
import MobileGallery18 from "../../assets/mobile-gallery/gallery-18.jpg";
import MobileGallery19 from "../../assets/mobile-gallery/gallery-19.jpg";
import MobileGallery20 from "../../assets/mobile-gallery/gallery-20.jpg";
import MobileGallery21 from "../../assets/mobile-gallery/gallery-21.jpg";
import MobileGallery22 from "../../assets/mobile-gallery/gallery-22.jpg";
import MobileGallery23 from "../../assets/mobile-gallery/gallery-23.jpg";
import MobileGallery24 from "../../assets/mobile-gallery/gallery-24.jpg";
import MobileGallery25 from "../../assets/mobile-gallery/gallery-25.jpg";

export default function GallerySection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Desktop gallery images array (landscape - 25 images to match mobile)
  const desktopGalleryImages = [
    { src: Gallery1, alt: "Gallery 1" },
    { src: Gallery2, alt: "Gallery 2" },
    { src: Gallery3, alt: "Gallery 3" },
    { src: Gallery4, alt: "Gallery 4" },
    { src: Gallery5, alt: "Gallery 5" },
    { src: Gallery6, alt: "Gallery 6" },
    { src: Gallery7, alt: "Gallery 7" },
    { src: Gallery8, alt: "Gallery 8" },
    { src: Gallery9, alt: "Gallery 9" },
    { src: Gallery10, alt: "Gallery 10" },
    { src: Gallery11, alt: "Gallery 11" },
    { src: Gallery12, alt: "Gallery 12" },
    { src: Gallery13, alt: "Gallery 13" },
    { src: Gallery14, alt: "Gallery 14" },
    { src: Gallery15, alt: "Gallery 15" },
    { src: Gallery16, alt: "Gallery 16" },
    { src: Gallery17, alt: "Gallery 17" },
    { src: Gallery18, alt: "Gallery 18" },
    { src: Gallery19, alt: "Gallery 19" },
    { src: Gallery20, alt: "Gallery 20" },
    { src: Gallery21, alt: "Gallery 21" },
    { src: Gallery22, alt: "Gallery 22" },
    { src: Gallery23, alt: "Gallery 23" },
    { src: Gallery24, alt: "Gallery 24" },
    { src: Gallery25, alt: "Gallery 25" },
  ];

  // Mobile gallery images array (portrait - 25 images)
  const mobileGalleryImages = [
    { src: MobileGallery1, alt: "Gallery 1" },
    { src: MobileGallery2, alt: "Gallery 2" },
    { src: MobileGallery3, alt: "Gallery 3" },
    { src: MobileGallery4, alt: "Gallery 4" },
    { src: MobileGallery5, alt: "Gallery 5" },
    { src: MobileGallery6, alt: "Gallery 6" },
    { src: MobileGallery7, alt: "Gallery 7" },
    { src: MobileGallery8, alt: "Gallery 8" },
    { src: MobileGallery9, alt: "Gallery 9" },
    { src: MobileGallery10, alt: "Gallery 10" },
    { src: MobileGallery11, alt: "Gallery 11" },
    { src: MobileGallery12, alt: "Gallery 12" },
    { src: MobileGallery13, alt: "Gallery 13" },
    { src: MobileGallery14, alt: "Gallery 14" },
    { src: MobileGallery15, alt: "Gallery 15" },
    { src: MobileGallery16, alt: "Gallery 16" },
    { src: MobileGallery17, alt: "Gallery 17" },
    { src: MobileGallery18, alt: "Gallery 18" },
    { src: MobileGallery19, alt: "Gallery 19" },
    { src: MobileGallery20, alt: "Gallery 20" },
    { src: MobileGallery21, alt: "Gallery 21" },
    { src: MobileGallery22, alt: "Gallery 22" },
    { src: MobileGallery23, alt: "Gallery 23" },
    { src: MobileGallery24, alt: "Gallery 24" },
    { src: MobileGallery25, alt: "Gallery 25" },
  ];

  // Select appropriate gallery based on screen size
  const galleryImages = isMobile ? mobileGalleryImages : desktopGalleryImages;

  const openModal = (index) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const ImageWithOverlay = ({ src, alt, index, className }) => (
    <div
      className={`relative group cursor-pointer ${className}`}
      onClick={() => openModal(index)}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-all duration-300"
      />
      {/* Dark overlay on hover */}
      <div
        className="absolute inset-0 bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center"
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "hsla(21, 90%, 10%, 0.7)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="p-[1rem]">
            <span className="text-[color:var(--white)] font-semibold text-xl">
              View More Images
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        data-component="Gallery Container"
        className="py-[12rem] px-[18vw] max-lg:px[6rem] max-md:px-[2rem] max-sm:px-[.5rem] max-md:py-[12rem] w-full h-[80rem] flex flex-col gap-[.8rem]"
      >
        <div
          data-component="1st row"
          className="flex gap-[.8rem] h-[50%] w-full"
        >
          <ImageWithOverlay
            src={galleryImages[0].src}
            alt="Gallery 1"
            index={0}
            className="w-[60%] h-full"
          />
          <ImageWithOverlay
            src={galleryImages[1].src}
            alt="Gallery 2"
            index={1}
            className="w-[40%] h-full"
          />
        </div>
        <div
          data-component="2nd row"
          className="flex gap-[.8rem] h-[50%] w-full"
        >
          <ImageWithOverlay
            src={galleryImages[2].src}
            alt="Gallery 3"
            index={2}
            className="w-[40%] h-full"
          />
          <ImageWithOverlay
            src={galleryImages[3].src}
            alt="Gallery 4"
            index={3}
            className="w-[25%] h-full"
          />
          <ImageWithOverlay
            src={galleryImages[4].src}
            alt="Gallery 5"
            index={4}
            className="w-[35%] h-full"
          />
        </div>

        {/* Mobile/Tablet View More Images Button */}
        <div className="md:hidden w-full flex justify-start py-4">
          <button
            onClick={() => openModal(0)}
            className="text-lg cursor-pointer font-semibold text-[color:var(--emphasis)] border-b border-[color:var(--emphasis)/50] pb-1 hover:text-[color:var(--emphasis)]/80 transition-colors duration-300"
          >
            View More Images
          </button>
        </div>
      </div>

      <GalleryModal
        isOpen={isModalOpen}
        onClose={closeModal}
        images={galleryImages}
        currentImageIndex={currentImageIndex}
      />
    </>
  );
}
