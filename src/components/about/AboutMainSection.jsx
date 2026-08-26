import About1 from "../../assets/about/about-1.jpg";
import About2 from "../../assets/about/about-2.jpg";

export default function AboutMainSection() {
  return (
    <>
      <div
        data-component="AboutMainSection"
        className="p-[12rem] max-md:px-[6rem] max-sm:px-[4rem] w-full flex flex-col gap-[4.8rem]"
      >
        <div
          data-component="Block1"
          className="bg-[color:var(--text-color)] p-[6rem] max-sm:p-[4rem] flex flex-col gap-[1.8rem] text-[var(--white)] font-secondary"
        >
          <h1 className="text-6xl font-secondary font-bold">
            Seamless Comfort and Hospitality
          </h1>
          <p className="text-3xl">
            Caritas Inn Igbobi pairs contemporary design with the genuine warmth of West African hospitality. Set in the calm, well-connected Igbobi district, the hotel gives guests a practical base for both downtime and work, within easy reach of the area's key landmarks - an easy pick for anyone who wants Lagos convenience without the noise.
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
              className="flex flex-col gap-[1.8rem] font-secondary bg-[color:var(--background-color-2)] w-[100%] p-[12rem] max-md:p-[6rem] max-sm:p-[4rem]"
            >
              <h2 className="text-6xl font-bold">
                Your Ideal Retreat for Comfort and Convenience
              </h2>
              <p className="text-3xl">
                Just a short drive from the University of Lagos, Caritas Inn brings a fresh take on hospitality to Igbobi. Whether you're here for business or simply passing through, the hotel is built around comfort and ease - think king-sized beds dressed in premium linens, a coffee station stocked with complimentary supplies, reliable air conditioning, free Wi-Fi, flat-screen TVs, and private ensuite bathrooms in every room.
              </p>
            </div>
          </div>
          {/* Second row - you can add this structure for additional img+text pairs */}
          <div className="flex max-sm:flex-col">
            <div
              data-component="Block2Text"
              className="flex flex-col gap-[1.8rem] font-secondary bg-[color:var(--background-color-2)] w-[100%] p-[12rem] max-md:p-[6rem] max-sm:p-[4rem]"
            >
              <h2 className="text-6xl font-bold">
                Experience Tranquil Stays with Unmatched Security
              </h2>
              <p className="text-3xl">
                Set back in Igbobi's quieter streets, Caritas Inn keeps security front of mind - round-the-clock surveillance and an attentive on-site team mean you can relax fully during your stay. Beyond a room to sleep in, we aim to deliver a stay defined by comfort, safety, and service that actually pays attention.
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
            <h2 className="text-6xl font-secondary font-bold">Our Vision</h2>
            <p className="text-3xl">
              We're working toward something bigger than any single property: a hotel group built organically, one branch at a time, that leads on location, service quality, people, and the systems that tie it all together.
            </p>
          </div>
          <div className="flex flex-col gap-[1.8rem]">
            <h2 className="text-6xl font-secondary font-bold">Our Mission</h2>
            <p className="text-3xl">
              Every stay at Caritas Inn Igbobi is a chance to prove the same point - that genuine hospitality, done consistently, is what keeps guests coming back.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
