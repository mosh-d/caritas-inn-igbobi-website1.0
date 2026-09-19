import { useEffect, useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

import { fetchBranchContact } from "../../utils/room-data";
import { EASE_OUT, MotionDiv } from "../shared/motion";
import { Reveal, Words } from "../shared/guestMotion";

// What this section shows until the server answers, and if it never does.
// The branches table is the source of truth (owner, 2026-09-17); this copy
// is only here so a slow or failed request leaves Locate Us reading
// correctly rather than empty.
const FALLBACK_CONTACT = {
  name: "Caritas Inn Igbobi",
  address:
    "Caritas Inn, Igbobi, WAEC Bus Stop, Igbobi College Rd, beside First Bank, Yaba, Lagos 101245, Lagos",
  maps_url: null,
};

export default function WelcomeSection() {
  const [contact, setContact] = useState(FALLBACK_CONTACT);

  useEffect(() => {
    let cancelled = false;

    fetchBranchContact()
      .then((data) => {
        if (!cancelled && data?.address) setContact(data);
      })
      .catch((error) => {
        // Not worth showing a guest: the fallback above already reads
        // correctly, and nothing else on the page depends on this.
        console.error("Error fetching branch contact:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The address on file is the hotel's full Google Maps address, its own
  // name included, so it is searched as it stands and lands on the hotel's
  // listing rather than on the street.
  const mapQuery = encodeURIComponent(contact.address || "");
  const mapsLink =
    contact.maps_url ||
    `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  return (
    <div
      data-component="Welcome Component"
      className="p-[12rem] max-sm:px-[2rem] flex flex-col gap-[4.8rem] max-sm:gap-[2.4rem]"
    >
      <Words text="Locate Us" className="text-6xl font-secondary font-bold" />
      <MotionDiv
        initial={{ clipPath: "inset(18% 18% 18% 18%)", opacity: 0 }}
        whileInView={{ clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.2, ease: EASE_OUT }}
        data-component="Google Map"
        className="w-full h-[400px] max-sm:h-[200px] overflow-hidden"
      >
        <iframe
          title={`Google Map - ${contact.address}`}
          src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
          width="100%"
          height="100%"
          style={{
            border: 0,
            filter:
              "invert(90%) hue-rotate(180deg) brightness(0.8) contrast(0.9)",
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </MotionDiv>

      <Reveal delay={0.2} className="flex max-sm:flex-col gap-[2rem]">
        <p className="font-secondary text-3xl mx-[1rem] font-bold">
          {contact.address}
        </p>
        <a
          data-component="Map link"
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 w-fit max-sm:w-full"
        >
          <FaMapMarkerAlt size="1.8rem" />
          <div
            data-component="text"
            className="text-xl border-b border-[color:var(--text-color)]/30 hover:cursor-pointer hover:border-[color:var(--text-color)]"
          >
            View on Google Maps
          </div>
        </a>
      </Reveal>
    </div>
  );
}
