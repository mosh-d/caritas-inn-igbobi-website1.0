import HeroSection from "../components/home/Hero";
import WelcomeSection from "../components/home/WelcomeSection";
import BannerSection from "../components/home/BannerSection";
import GallerySection from "../components/home/GallerySection";
import AvailableRoomsSection from "../components/home/AvailableRoomsSection";
import HotelSurroundingsSection from "../components/home/HotelSurroundingsSection";
import FacilitiesSection from "../components/home/FacilitiesSection";
import Footer from "../components/shared/Footer";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <WelcomeSection />
      <BannerSection />
      <GallerySection />
      <AvailableRoomsSection />
      <HotelSurroundingsSection />
      <FacilitiesSection />
      <Footer />
    </>
  );
}
