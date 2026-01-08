import Logo from "../shared/Logo";
import CustomInput from "../shared/CustomInput";
import { NavLink } from "react-router-dom";
import Button from "../shared/Button";
import {
  RiTiktokLine,
  RiFacebookLine,
  RiInstagramLine,
  RiTwitterXLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiMailLine,
} from "react-icons/ri";

export default function Footer() {
  return (
    <>
      <div
        data-component="Footer"
        className="text-[color:var(--footer-text-color)] bg-[color:var(--background-color-2)] px-24 md:px-12 lg:px-[12rem] py-12 md:py-[6rem] flex flex-col gap-[6rem] md:gap-[6rem] justify-center items-center"
      >
        <Logo />
        <div
          data-component="TopSection"
          className="flex flex-col md:flex-row w-full justify-center gap-[8rem] md:gap-[8rem] items-center md:items-start"
        >
          {/* Exclisive offers commented out till email marketing is implemented */}
          {/* <div
            data-component="ExclusiveOffers"
            className="flex flex-col gap-[2.4rem] justify-left items-left"
          >
            <h2 className="text-4xl font-bold">Exclusive Offers</h2>
            <CustomInput
              variant="default"
              type="email"
              id="EmailAddress"
              label="Email Address"
            >
              example@text.com
            </CustomInput>
            <Button variant="light-gray" className="text-2xl">
              Subscribe
            </Button>
          </div> */}
          <ul
            data-component="Socials"
            className="flex gap-[2.4rem] flex-wrap justify-center"
          >
            <li>
              <a
                href="https://www.facebook.com/RingrubyHotel?_rdc=1&_rdr#"
                target="_blank"
              >
                <RiFacebookLine size="3rem" />
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/ringruby_hotel/"
                target="_blank"
              >
                <RiInstagramLine size="3rem" />
              </a>
            </li>
            <li>
              <a href="https://www.tiktok.com/@ringrubyhotels" target="_blank">
                <RiTiktokLine size="3rem" />
              </a>
            </li>
            {/* <li>
              <a href="">
                <RiTwitterXLine size="3rem" />
              </a>
            </li> */}
          </ul>
          <div
            data-component="ContactInformation"
            className="flex flex-col gap-[2.4rem]"
          >
            <h2 className="text-4xl font-bold">Contact Information</h2>
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
              <RiWhatsappLine size="3rem" />
              <a
                href="https://wa.me/2348126955544"
                target="_blank"
                rel="noopener noreferrer"
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
          </div>
        </div>
        {/* Mobile-only horizontal rule */}
        <div className="w-full h-[0.1rem] bg-[color:var(--footer-text-color)]/50 md:hidden"></div>
        <div
          data-component="NavigationSection"
          className="w-full flex flex-col gap-[2.4rem] px-4 md:px-0 max-md:items-center"
        >
          <div
            data-component="Heading"
            className="flex gap-[4rem] w-full items-center"
          >
            <div className="h-[0.1rem] flex-1 bg-[color:var(--footer-text-color)]/50 min-w-[2rem] max-md:hidden"></div>
            <h1 className="text-5xl font-bold font-secondary max-md:m-auto">
              Navigation
            </h1>
            <div className="h-[0.1rem] flex-1 bg-[color:var(--footer-text-color)]/50 min-w-[2rem] max-md:hidden"></div>
          </div>
          <div
            data-component="NavigationItemsContainer"
            className="flex justify-center w-full"
          >
            <ul
              data-component="NavigationItems"
              className="flex flex-col md:flex-row gap-4 md:gap-[8rem] items-center"
            >
              <li data-component="NavigationItem" className="text-xl">
                {" "}
                <NavLink to="/" end>
                  HOME
                </NavLink>
              </li>
              <li data-component="NavigationItem" className="text-xl">
                <NavLink to="/about">ABOUT</NavLink>
              </li>
              <li data-component="NavigationItem" className="text-xl">
                <NavLink to="/contact">CONTACT</NavLink>
              </li>
            </ul>
          </div>
        </div>
        {/* Mobile-only horizontal rule */}
        <div className="w-full h-[0.1rem] bg-[color:var(--footer-text-color)]/50 md:hidden"></div>
        <div
          data-component="HotelSection"
          className="w-full flex flex-col gap-[2.4rem]"
        >
          <div
            data-component="Heading"
            className="flex gap-[4rem] w-full items-center"
          >
            <div className="h-[0.1rem] flex-1 bg-[color:var(--footer-text-color)]/50 min-w-[2rem] max-md:hidden"></div>
            <h1 className="text-5xl font-bold font-secondary max-md:m-auto">
              Hotels
            </h1>
            <div className="h-[0.1rem] flex-1 bg-[color:var(--footer-text-color)]/50 min-w-[2rem] max-md:hidden"></div>
          </div>
          <div
            data-component="HotelsWrapper"
            className="flex flex-col md:flex-row justify-center w-full gap-8 md:gap-[8rem] px-4 md:px-0"
          >
            <div
              data-component="HotelContainer"
              className="flex flex-col gap-[1rem] md:gap-[2rem] items-center md:items-start"
            >
              <div
                data-component="Heading"
                className="text-4xl font-secondary font-bold"
              >
                Five Clover
              </div>
              <div
                data-component="HotelLinks"
                className="flex flex-col gap-[1rem] max-md:text-center"
              >
                <a
                  href="https://fivecloverhotelmonastery.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Monastry Road
                </a>
                <a
                  href="https://fivecloverhotelabijo.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Abijo, GRA
                </a>
                <a
                  href="https://fivecloverilupeju.fivecloverhotels.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Ilupeju
                </a>
              </div>
            </div>
            <div
              data-component="HotelContainer"
              className="flex flex-col gap-[1rem] md:gap-[2rem] items-center md:items-start"
            >
              <div
                data-component="Heading"
                className="text-4xl font-secondary font-bold"
              >
                Caritas Inn
              </div>
              <div
                data-component="HotelLinks"
                className="flex flex-col gap-[1rem] max-md:text-center"
              >
                <a
                  href="https://www.caritasinnigbobihotel.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Igbobo
                </a>
                <a
                  href="https://www.caritasinnilasanhotel.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Ilasan
                </a>
                <a
                  href="https://www.caritasinnlekkihotel.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Lekki, Phase 1
                </a>
                <a
                  href="https://www.caritasinnyabahotel.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Yaba
                </a>
              </div>
            </div>
            <div
              data-component="HotelContainer"
              className="flex flex-col gap-[1rem] md:gap-[2rem] items-center md:items-start"
            >
              <div
                data-component="Heading"
                className="text-4xl font-secondary font-bold"
              >
                Ring Ruby
              </div>
              <div
                data-component="HotelLinks"
                className="flex flex-col gap-[1rem] max-md:text-center"
              >
                <a
                  href="https://ringrubyhotelsangotedo.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Sangotedo
                </a>
                <a
                  href="https://ringrubyhotelesoikejagra.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Eso, Ikeja
                </a>
                <a
                  href="https://ringrubyhoteloduduwaikejagra.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Oduduwa, Ikeja
                </a>
                <a
                  href="https://ringrubyhoteloduduwaikejagra.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Value County
                </a>
              </div>
            </div>
            <div
              data-component="HotelContainer"
              className="flex flex-col gap-[1rem] md:gap-[2rem] items-center md:items-start"
            >
              <div
                data-component="Heading"
                className="text-4xl font-secondary font-bold"
              >
                Cordis
              </div>
              <div
                data-component="HotelLinks"
                className="flex flex-col gap-[1rem] max-md:text-center"
              >
                <a
                  href="https://www.thecordishotelikeja.com/"
                  target="_blank"
                  className="text-2xl"
                >
                  Ikeja
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="h-[0.1rem] w-full bg-[color:var(--footer-text-color)]/50 min-w-[2rem]"></div>
        <div
          data-component="Copyright"
          className="text-[color:var(--footer-text-color)]/50 text-2xl font-bold text-center"
        >
          &copy; {new Date().getFullYear()} Five Clover Hotel Groups. All rights
          reserved.
        </div>
      </div>
    </>
  );
}
