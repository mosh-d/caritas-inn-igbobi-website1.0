import Button from "../shared/Button";
import CustomInput from "../shared/CustomInput";
import {
  RiTiktokLine,
  RiFacebookLine,
  RiInstagramLine,
  RiTwitterXLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiMailLine,
} from "react-icons/ri";

export default function ContactMainSection() {
  return (
    <div>
      <div
        data-component="TopSection"
        className="flex flex-col bg-[color:var(--background-color-2)] text-[var(--text-color)] font-secondary p-[12rem] gap-[1.8rem]"
      >
        <h1 className="text-6xl font-bold">Get In Touch</h1>
        <p className="text-2xl font-semibold">
          Have any questions or need assistance? The team at Caritas Inn, Igbobi
          is always ready to ensure your stay is flawless. Don't hesitate to
          reach out—we're here to help with anything you need.
        </p>
      </div>
      <div
        data-component="BottomSection"
        className="flex max-md:flex-col px-[12rem] py-[6rem] gap-[6rem] w-full"
      >
        <div
          data-component="ContactInfo"
          className="w-[50%] max-md:w-[100%] max-md:max-w-[100%] gap-[1.2rem] flex flex-col"
        >
          <div className="flex flex-col gap-[1.8rem] mb-[.6rem]">
            <h1 className="text-6xl font-bold font-secondary">
              Contact Information
            </h1>
            <p className="text-2xl font-secondary font-semibold">
              Get in touch with us through our contact details below and follow
              our social media pages
            </p>
          </div>
          <div
            data-component="ContactItem"
            className="flex gap-[1.2rem] items-center"
          >
            <RiPhoneLine size="3rem" />
            <a
              href="tel:+2348126955544"
              className="border-b border-[color:var(--text-color)]/30 text-xl"
            >
              +234 812 695 5544
            </a>
          </div>
          <div
            data-component="ContactItem"
            className="flex gap-[1.2rem] items-center"
          >
            <RiMailLine size="3rem" />
            <a
              href="mailto:info@caritasinnigbobihotel.com"
              className="border-b border-[color:var(--text-color)]/30 text-xl"
            >
              info@caritasinnigbobihotel.com
            </a>
          </div>
          <div
            data-component="ContactItem"
            className="flex gap-[1.2rem] items-center"
          >
            <RiFacebookLine size="3rem" />
            <a
              href="https://www.facebook.com/RingrubyHotel?_rdc=1&_rdr#"
              className="border-b border-[color:var(--text-color)]/30 text-xl"
              target="_blank"
              rel="noopener noreferrer"
            >
              RingrubyHotel
            </a>
          </div>
          <div
            data-component="ContactItem"
            className="flex gap-[1.2rem] items-center"
          >
            <RiInstagramLine size="3rem" />
            <a
              href="https://www.instagram.com/ringruby_hotel/"
              className="border-b border-[color:var(--text-color)]/30 text-xl"
              target="_blank"
              rel="noopener noreferrer"
            >
              @ringruby_hotel
            </a>
          </div>
          <div
            data-component="ContactItem"
            className="flex gap-[1.2rem] items-center"
          >
            <RiTiktokLine size="3rem" />
            <a
              href="https://www.tiktok.com/@ringrubyhotels"
              className="border-b border-[color:var(--text-color)]/30 text-xl"
              target="_blank"
              rel="noopener noreferrer"
            >
              @ringrubyhotels
            </a>
          </div>
          <div
            data-component="ContactItem"
            className="flex gap-[1.2rem] items-center"
          >
            <RiTwitterXLine size="3rem" />
            <a
              href=""
              className="border-b border-[color:var(--text-color)]/30 text-xl"
            >
              @fivecloverhotel
            </a>
          </div>
        </div>

        {/* contact form commented out till I implement email messaging */}
        {/* <div
          data-component="Inputs"
          className="flex flex-col justify-between gap-[2.4rem] w-[50%] max-md:w-[100%] max-md:max-w-[100%] pt-[1rem]"
        >
          <div data-component="Row1" className="flex gap-[2.4rem] w-full justify-between">
            <div className="w-1/2">
              <CustomInput
                variant="default"
                type="text"
                id="Name"
                label="Your Name"
              >
                eg. John Doe
              </CustomInput>
            </div>
            <div className="w-1/2">
              <CustomInput
                variant="default"
                type="email"
                id="Email"
                label="Your Email"
              >
                example@text.com
              </CustomInput>
            </div>
          </div>
          <CustomInput
            variant="default"
            type="text"
            id="Subject"
            label="Subject"
          >
            eg. I want to book a room
          </CustomInput>
          <CustomInput
            variant="default"
            type="textarea"
            id="Message"
            label="Message"
          >
            Write your message here
          </CustomInput>
          <Button variant="light-gray" className="w-fit text-xl ">
            Send Message
          </Button>
        </div> */}
      </div>
    </div>
  );
}
