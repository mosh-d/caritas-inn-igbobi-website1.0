import { useRef } from "react";
import { useScroll, useTransform, useReducedMotion } from "motion/react";
import Banner from "../../assets/banner.jpg";
import { MotionDiv } from "../shared/motion";

export default function BannerSection() {
  // The offer comes forward as it rises to the middle of the screen -
  // growing from 88% to full size and brightening - tied to the scroll
  // itself, so it moves exactly as fast as the reader does. Measured on the
  // unscaled wrapper, not the banner, so the scaling can't feed back into
  // its own measurement. Zeroed for reduced motion, which doesn't reach
  // scroll-linked styles on its own.
  const wrapperRef = useRef(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: wrapperRef, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 1 : 0.88, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [reduceMotion ? 1 : 0.35, 1]);

  return (
    <div ref={wrapperRef} className="w-full p-[12rem_0] max-sm:p-[0] overflow-hidden">
      <MotionDiv
        data-component="banner"
        className="w-full aspect-[20/6] bg-no-repeat bg-cover bg-center max-w-[1280px] mx-auto"
        style={{ backgroundImage: `url(${Banner})`, scale, opacity }}
      ></MotionDiv>
    </div>
  );
}
