import About1 from "../../assets/about/about-1.jpg";
import About2 from "../../assets/about/about-2.jpg";

export default function AboutMainSection() {
  return (
    <>
      <div
        data-component="AboutMainSection"
        className="p-[12rem] max-md:px-[6rem] max-sm:px-[2rem] w-full flex flex-col gap-[4.8rem]"
      >
        <div
          data-component="Block1"
          className="bg-[color:var(--text-color)] p-[6rem] flex flex-col gap-[1.8rem] text-[var(--white)] font-secondary"
        >
          <h1 className="text-6xl font-secondary font-bold">
            Seamless Comfort and Hospitality
          </h1>
          <p className="text-2xl">
            Caritas Inn, Igbobi seamlessly blends modern comfort with the warmth
            of West African hospitality, offering a unique and inviting
            experience for our esteemed guests. Located in the serene and
            accessible Yaba area of Lagos, our hotel offers a balanced mix of
            relaxation, workspaces, and proximity to popular destinations,
            making it a top choice for travelers seeking comfort and convenience
            in Yaba.
          </p>
        </div>
        <div data-component="Block2" className="flex flex-col w-full">
          <div className="flex max-sm:flex-col">
            <div
              data-component="Block2Image"
              className="w-[60%] max-sm:w-[100%] max-w-[40rem] max-sm:max-w-[100%] max-sm:h-[25rem]"
            >
              <img
                src={About1}
                alt=""
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div
              data-component="Block2Text"
              className="flex flex-col gap-[1.8rem] font-secondary bg-[color:var(--background-color-2)] w-[100%] p-[12rem] max-md:p-[6rem] max-sm:p-[2rem]"
            >
              <h1 className="text-6xl font-bold">
                Your Ideal Retreat for Comfort and Convenience
              </h1>
              <p className="text-2xl">
                Welcome to a new standard of hospitality in Yaba. Caritas Inn is
                a modern hotel located in the peaceful Igbobi area with few
                minutes' drive from the University of Lagos. It offers a perfect
                environment for both business and leisure travelers by combining
                comfort, functionality, and elegance. The hotel features a
                variety of well-appointed rooms designed for relaxation,
                including king-sized beds with luxurious bedding, a coffee
                station with complimentary packages, air conditioning, free
                Wi-Fi, flat-screen TVs, and ensuite bathrooms.
              </p>
            </div>
          </div>
          {/* Second row - you can add this structure for additional img+text pairs */}
          <div className="flex max-sm:flex-col">
            <div
              data-component="Block2Text"
              className="flex flex-col gap-[1.8rem] font-secondary bg-[color:var(--background-color-2)] w-[100%] p-[12rem] max-md:p-[6rem] max-sm:p-[2rem]"
            >
              <h1 className="text-6xl font-bold">
                Experience Tranquil Stays with Unmatched Security
              </h1>
              <p className="text-2xl">
                Caritas Inn is a modern hotel located in the peaceful Yaba area.
                We ensure a secure environment with advanced surveillance
                systems and a dedicated team, providing peace of mind throughout
                your stay. We offer more than just a place to stay; we provide a
                luxurious experience marked by comfort, security, and
                personalized service.
              </p>
            </div>
            <div
              data-component="Block2Image"
              className="w-[60%] max-w-[40rem] max-sm:w-[100%] max-sm:max-w-[100%] max-sm:h-[25rem]"
            >
              <img
                src={About2}
                alt=""
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
        </div>
        <div
          data-component="Block3"
          className="bg-[color:var(--text-color)] p-[6rem] flex max-sm:flex-col gap-[6rem] text-[var(--white)] font-secondary"
        >
          <div className="flex flex-col gap-[1.8rem]">
            <h1 className="text-6xl font-secondary font-bold">Our Vision</h1>
            <p className="text-2xl">
              To be an organically developed global hotel management company
              that excels in its core components of place, service,
              people and system.
            </p>
          </div>
          <div className="flex flex-col gap-[1.8rem]">
            <h1 className="text-6xl font-secondary font-bold">Our Mission</h1>
            <p className="text-2xl">
              Our mission is to be the most hospitable company in the world by
              creating world-class experiences for guests.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
