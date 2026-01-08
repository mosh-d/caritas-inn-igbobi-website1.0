import { FiPower } from "react-icons/fi";
import { IoWifi } from "react-icons/io5";
import { LuSquareParking } from "react-icons/lu";
import { TbSmokingNo } from "react-icons/tb";
import { MdOutlineLocalBar, MdOutlinePermMedia } from "react-icons/md";
import {
  IoRestaurantOutline,
  IoBedOutline,
  IoCheckmarkOutline,
} from "react-icons/io5";
import { SiGoogleclassroom } from "react-icons/si";
import { MdOutlineDesk } from "react-icons/md";
import { TbMoodHappy } from "react-icons/tb";
import { PiBathtub, PiWashingMachineLight } from "react-icons/pi";
import { FaUmbrellaBeach } from "react-icons/fa6";
import { AiOutlineSafety } from "react-icons/ai";

export default function FacilitiesSection() {
  const MOST_POPULAR_SERVICES = [
    {
      icon: FiPower,
      text: "24/7 Power Supply",
    },
    {
      icon: IoWifi,
      text: "Free WiFi",
    },
    {
      icon: LuSquareParking,
      text: "Free Parking",
    },
    {
      icon: TbSmokingNo,
      text: "Non-smoking rooms",
    },
    {
      icon: MdOutlineLocalBar,
      text: "Bar",
    },
    {
      icon: IoRestaurantOutline,
      text: "Restaurant",
    },
    {
      icon: SiGoogleclassroom,
      text: "Conferencing",
    },
    {
      icon: MdOutlineDesk,
      text: "Co-workspace",
    },
  ];

  const SERVICES = [
    {
      icon: TbMoodHappy,
      heading: "Great for your stay",
      services: [
        "Restaurants",
        "Bar",
        "Parking",
        "Air Conditioning",
        "Free WiFi",
        "Smart TV",
      ],
    },
    {
      icon: PiBathtub,
      heading: "Bathroom",
      services: ["Toilet Paper", "Towels", "Shower", "Free Toiletries"],
    },
    {
      icon: IoWifi,
      heading: "Internet",
      services: ["Free WiFi"],
    },
    {
      icon: IoBedOutline,
      heading: "Bedroom",
      services: ["Linen", "Wardrobe/Closet", "Sofa", "Desk"],
    },
    {
      icon: FaUmbrellaBeach,
      heading: "Outdoors",
      services: ["Outdoor Bar", "BBQ Facilities"],
    },
    {
      icon: MdOutlinePermMedia,
      heading: "Media & Technology",
      services: ["Smart TV"],
    },
    {
      icon: LuSquareParking,
      heading: "Parking",
      services: [
        "Free private parking is possible on site (reservation is not needed)",
        "Parking Space",
        "Accessible parking",
      ],
    },
    {
      icon: AiOutlineSafety,
      heading: "Safety & Security",
      services: [
        "Fire extinguishers",
        "CCTV outside property",
        "CCTV in common areas",
        "Smoke alarms",
        "Security alarm",
        "Key card access",
        "Key access",
        "24-hour security",
      ],
    },
    {
      icon: PiWashingMachineLight,
      heading: "Cleaning Services",
      services: ["Daily housekeeping service", "Laundry service"],
    },
  ];

  return (
    <>
      <div
        data-component="FacilitiesSection"
        className="p-[12rem]  max-md:px-[2rem] w-full flex flex-col gap-[4.8rem]"
      >
        <div
          data-component="FacilitiesSectionHeading"
          className="flex flex-col gap-[1.8rem]"
        >
          <h2 className="text-6xl font-secondary font-bold">Facilities</h2>
          <p className="font-secondary text-3xl font-semibold">
            Great facilities!
          </p>
        </div>
        <div
          data-component="FacilitiesMidSection"
          className="flex flex-col gap-[1.8rem]"
        >
          <h2 className="text-4xl font-secondary font-bold">
            Most Popular Services
          </h2>
          <div className="flex flex-wrap gap-[2.4rem] w-full">
            {MOST_POPULAR_SERVICES.map((service, index) => (
              <div
                key={index}
                data-component="FacilitiesMidSectionItem"
                className="flex items-center gap-[2.4rem]"
              >
                <div
                  data-component="FacilitiesMidSectionItemIcon"
                  className="flex gap-[1rem]"
                >
                  <service.icon size="3rem" />
                </div>
                <p
                  data-component="FacilitiesMidSectionItemText"
                  className="text-2xl"
                >
                  {service.text}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div
          data-component="FacilitiesContentWrapper"
          className="flex flex-wrap gap-[4.8rem] w-full justify-center"
        >
          {SERVICES.map((service, index) => (
            <div
              key={index}
              data-component="FacilitiesContentItem"
              className="flex flex-col gap-[2rem] w-[35rem] border-[1px] border-[color:var(--light-gray)]/40 p-[1rem] bg-[color:var(--accent-2)]/30 rounded-lg text-[var(--text-color)]"
            >
              <div
                data-component="FacilitiesContentItemHeading"
                className="flex items-center gap-[2rem] w-full"
              >
                <service.icon size="3rem" />
                <h3
                  data-component="FacilitiesContentItemHeadingText"
                  className="text-3xl font-semibold w-[80%]"
                >
                  {service.heading}
                </h3>
              </div>
              <div
                data-component="FacilitiesContentItemServices"
                className="flex flex-col gap-[2rem]"
              >
                {service.services.map((service, index) => (
                  <div
                    key={index}
                    data-component="FacilitiesContentItemServicesItem"
                    className="flex items-center gap-[2rem] pl-[2rem]"
                  >
                    <IoCheckmarkOutline size="3rem" />
                    <p
                      data-component="FacilitiesContentItemServicesItemText"
                      className="text-2xl w-[80%]"
                    >
                      {service}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
