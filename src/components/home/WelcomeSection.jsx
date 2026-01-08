import { FaMapMarkerAlt } from "react-icons/fa";

export default function WelcomeSection() {
  return (
    <div
      data-component="Welcome Component"
      className="p-[12rem] max-sm:px-[2rem] flex flex-col gap-[4.8rem] max-sm:gap-[2.4rem]"
    >
      <h2 className="text-6xl font-secondary font-bold">Locate Us</h2>
      <div
        data-component="Google Map"
        className="w-full h-[400px] max-sm:h-[200px] overflow-hidden"
      >
        <iframe
          title="Google Map - Igbobi College Road, WAEC Bus-stop, Yaba, Lagos"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3963.9!2d3.3715264111270296!3d6.521371272421725!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8c4d5f5f5f5f%3A0x5f5f5f5f5f5f5f5f!2sIgbobi%20College%20Road%2C%20Yaba%2C%20Lagos!5e0!3m2!1sen!2sng!4v1709825424356!5m2!1sen!2sng&style=feature:administrative%7Celement:geometry%7Ccolor:0x1b1b1b&style=feature:administrative%7Celement:labels%7Cvisibility:off&style=feature:administrative.land_parcel%7Celement:geometry%7Ccolor:0x1b1b1b&style=feature:administrative.land_parcel%7Celement:labels%7Cvisibility:off&style=feature:landscape%7Celement:geometry%7Ccolor:0x1b1b1b&style=feature:poi%7Celement:geometry%7Ccolor:0x1b1b1b&style=feature:poi%7Celement:labels%7Cvisibility:off&style=feature:road%7Celement:geometry%7Ccolor:0x404040&style=feature:road%7Celement:labels%7Cvisibility:off&style=feature:transit%7Celement:geometry%7Ccolor:0x404040&style=feature:transit%7Celement:labels%7Cvisibility:off&style=feature:water%7Celement:geometry%7Ccolor:0x0a0a0a"
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
      </div>

      <div className="flex max-sm:flex-col gap-[2rem]">
        <p className="font-secondary text-3xl mx-[1rem] font-bold">
          Igbobi College Road, Beside First Bank, WAEC Bus-stop, Yaba, Lagos
        </p>
        <a
          data-component="Map link"
          href="https://maps.google.com/?q=Igbobi+College+Road,+WAEC+Bus-stop,+Yaba,+Lagos"
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
      </div>
    </div>
  );
}
