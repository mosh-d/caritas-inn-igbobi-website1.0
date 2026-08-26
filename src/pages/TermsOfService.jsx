import Footer from "../components/shared/Footer";

export default function TermsOfServicePage() {
  return (
    <>
      <div className="max-w-[110rem] mx-auto px-[6rem] max-md:px-[3rem] max-sm:px-[2rem] py-[10rem] font-secondary text-[color:var(--text-color)]">
        <h1 className="text-6xl font-bold text-[color:var(--emphasis)] mb-[3rem]">
          Terms and Conditions
        </h1>
        <p className="text-2xl mb-[5rem]">
          By accessing or using our website, you agree to comply with and be
          bound by the following terms and conditions. Please review them
          carefully before using the site or making any bookings.
        </p>

        <ol className="flex flex-col gap-[4rem] text-2xl list-decimal list-inside">
          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              General Terms
            </h2>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>
                <strong>Acceptance of Terms:</strong> By accessing or using
                this website, you agree to these Terms and Conditions. If you
                do not agree, please do not use the site.
              </li>
              <li>
                <strong>Changes to Terms:</strong> We reserve the right to
                update or modify these terms at any time without prior
                notice. Any changes will be posted on this page. It is your
                responsibility to review these terms periodically.
              </li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Booking and Reservations
            </h2>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>
                <strong>Booking Confirmation:</strong> All bookings made
                through our website are subject to availability and
                confirmation. Once a booking is confirmed, a confirmation
                email will be sent to the email address you provided during
                the booking process.
              </li>
              <li>
                <strong>Payment:</strong> Payment for bookings must be made on
                site.
              </li>
              <li>
                <strong>Cancellation Policy:</strong> Cancellations must be
                made in accordance with our cancellation policy, which is
                outlined on the booking page. Late cancellations or no-shows
                may be subject to a fee.
              </li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Guest Responsibilities
            </h2>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>
                <strong>Conduct:</strong> Guests are expected to behave
                responsibly and in a manner that respects other guests,
                staff, and the property. Any damage to the property may
                result in additional charges.
              </li>
              <li>
                <strong>Prohibited Activities:</strong> Illegal activities,
                including the use of drugs or the involvement in any unlawful
                conduct, are strictly prohibited on hotel premises.
              </li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Website Use
            </h2>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>
                <strong>Accuracy of Information:</strong> While we strive to
                ensure the accuracy of information provided on our website,
                we do not guarantee that the content is free of errors,
                complete, or up to date. We reserve the right to make changes
                to the site's content, services, or prices at any time
                without prior notice.
              </li>
              <li>
                <strong>User Responsibilities:</strong> You agree to use the
                website in a manner that does not harm or infringe upon the
                rights of others. Any attempt to misuse the website, disrupt
                services, or attempt unauthorized access to the website's
                systems is strictly prohibited.
              </li>
              <li>
                <strong>Third-Party Links:</strong> Our website may contain
                links to third-party websites. Caritas Inn Igbobi is not
                responsible for the content, services, or privacy practices of
                third-party sites. Visiting these sites is at your own risk.
              </li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Intellectual Property
            </h2>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>
                <strong>Ownership:</strong> All content on this website,
                including text, images, graphics, and logos, is the property
                of Caritas Inn Igbobi or its licensors and is protected by
                applicable intellectual property laws.
              </li>
              <li>
                <strong>Restrictions:</strong> You may not reproduce,
                distribute, modify, or exploit any content from this website
                without our prior written consent.
              </li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Limitation of Liability
            </h2>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>
                <strong>Disclaimer:</strong> The use of this website is at
                your own risk. Caritas Inn Igbobi does not warrant that the
                website will be error-free or that access will be
                uninterrupted. The information provided is on an "as-is"
                basis.
              </li>
              <li>
                <strong>Limitation of Liability:</strong> Caritas Inn Igbobi shall
                not be liable for any direct, indirect, incidental,
                consequential, or punitive damages arising from your use of
                the website, bookings, or stay at the hotel.
              </li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Governing Law
            </h2>
            <p className="mt-[1.5rem]">
              These Terms and Conditions are governed by and construed in
              accordance with the laws of the Federal Republic of Nigeria,
              without regard to its conflict of law provisions.
            </p>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Contact Us
            </h2>
            <p className="mt-[1.5rem]">
              If you have any questions or concerns about these Terms and
              Conditions, please contact us at{" "}
              <a
                href="mailto:info@caritasinnigbobihotel.com"
                className="underline text-[color:var(--emphasis)]"
              >
                info@caritasinnigbobihotel.com
              </a>
              .
            </p>
          </li>
        </ol>
      </div>
      <Footer />
    </>
  );
}
