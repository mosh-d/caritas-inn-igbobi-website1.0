import Banner from "../../assets/banner.jpg";

export default function BannerSection() {
  return (
    <div className="w-full p-[12rem_0] max-sm:p-[0] overflow-hidden">
      <div
        data-component="banner"
        className="w-full aspect-[20/6] bg-no-repeat bg-cover bg-center max-w-[1280px] mx-auto"
        style={{ backgroundImage: `url(${Banner})` }}
      ></div>
    </div>
  );
}
