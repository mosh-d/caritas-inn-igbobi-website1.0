import Footer from "../components/shared/Footer";

export default function PrivacyPolicyPage() {
  return (
    <>
      <div className="max-w-[110rem] mx-auto px-[6rem] max-md:px-[3rem] max-sm:px-[2rem] py-[10rem] font-secondary text-[color:var(--text-color)]">
        <h1 className="text-6xl font-bold text-[color:var(--emphasis)] mb-[3rem]">
          Our Privacy Policy
        </h1>
        <p className="text-2xl mb-[5rem]">
          At Caritas Inn Igbobi, we are committed to protecting your privacy and
          ensuring the security of your personal information. This Privacy
          Policy outlines how we collect, use, and safeguard your data when
          you visit our website, make a booking, or interact with us in any
          way.
        </p>

        <ol className="flex flex-col gap-[4rem] text-2xl list-decimal list-inside">
          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Information We Collect
            </h2>
            <p className="mt-[1.5rem]">
              We may collect personal information from you in several ways,
              including:
            </p>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>
                <strong>Contact and Booking Information:</strong> When you
                book a room or use our services, we may collect details such
                as your name, email address, phone number, home address,
                payment details, and any other relevant information for
                completing your booking.
              </li>
              <li>
                <strong>Website Interaction:</strong> We may collect
                non-personal data such as your IP address, browser type,
                access times, and the pages you visit on our website to help
                us improve our services and user experience.
              </li>
              <li>
                <strong>Cookies:</strong> Our website uses cookies to enhance
                your browsing experience, track your preferences, and provide
                personalized content.
              </li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              How We Use Your Information
            </h2>
            <p className="mt-[1.5rem]">
              We may use the personal information you provide to:
            </p>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>Process and confirm your bookings.</li>
              <li>
                Communicate with you regarding your reservation, inquiries, or
                special requests.
              </li>
              <li>
                Improve our services and tailor our offerings based on your
                preferences.
              </li>
              <li>
                Send you promotional information about special offers,
                discounts, or upcoming events at Caritas Inn Igbobi (if you have
                opted in to receive such communications).
              </li>
              <li>Comply with legal obligations, prevent fraud, and protect our business.</li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Sharing Your Information
            </h2>
            <p className="mt-[1.5rem]">
              We will not share your personal information with third parties,
              except in the following circumstances:
            </p>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>
                <strong>Service Providers:</strong> We may share your
                information with trusted third-party service providers who
                assist us with payment processing, website management,
                marketing, or delivering services on our behalf.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose your
                information if required to do so by law or in response to
                valid legal processes.
              </li>
              <li>
                <strong>Business Transfers:</strong> In the event of a
                merger, acquisition, or sale of assets, your personal
                information may be transferred as part of the transaction.
              </li>
            </ul>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Data Security
            </h2>
            <p className="mt-[1.5rem]">
              We take reasonable measures to protect your personal
              information from unauthorized access, use, or disclosure.
              However, no method of electronic storage or transmission over
              the internet is completely secure, and we cannot guarantee
              absolute security.
            </p>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Your Rights
            </h2>
            <p className="mt-[1.5rem]">You have the right to:</p>
            <ul className="list-disc pl-[3rem] mt-[1.5rem] flex flex-col gap-[1.5rem]">
              <li>Opt-out of marketing communications at any time.</li>
              <li>Request the deletion of your data.</li>
            </ul>
            <p className="mt-[1.5rem]">
              To exercise these rights, please contact us at{" "}
              <a
                href="mailto:info@caritasinnigbobihotel.com"
                className="underline text-[color:var(--emphasis)]"
              >
                info@caritasinnigbobihotel.com
              </a>{" "}
              or use the options provided within our communications.
            </p>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Links to Other Websites
            </h2>
            <p className="mt-[1.5rem]">
              Our website may contain links to third-party websites.
              Caritas Inn Igbobi is not responsible for the privacy practices or
              content of those sites. We encourage you to review the privacy
              policies of those sites before providing any personal
              information.
            </p>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Changes to This Policy
            </h2>
            <p className="mt-[1.5rem]">
              We may update this Privacy Policy from time to time to reflect
              changes in our practices or for legal, technical, or regulatory
              reasons. Any updates will be posted on this page, and we
              encourage you to review the policy periodically.
            </p>
          </li>

          <li>
            <h2 className="inline text-4xl font-bold text-[color:var(--emphasis)]">
              Contact Us
            </h2>
            <p className="mt-[1.5rem]">
              If you have any questions or concerns about our Privacy Policy
              or the handling of your personal information, please contact us
              at{" "}
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
