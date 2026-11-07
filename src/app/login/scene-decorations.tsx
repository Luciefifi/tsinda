import Image from "next/image";


const DOODLES = [
  { src: "book-stack.svg", width: 80, height: 64, className: "bottom-6 left-5 w-16 lg:bottom-auto lg:left-[5%] lg:top-[8%] lg:w-28" },
  { src: "star.svg", width: 40, height: 40, className: "left-5 top-5 w-6 lg:left-[23%] lg:top-[14%] lg:w-8" },
  { src: "lightbulb.svg", width: 64, height: 72, className: "right-5 top-3 w-11 lg:right-[7%] lg:top-[9%] lg:w-16" },
  { src: "pencil.svg", width: 80, height: 80, className: "bottom-6 right-5 w-14 lg:bottom-auto lg:right-[24%] lg:top-[11%] lg:w-20" },
  { src: "star.svg", width: 40, height: 40, className: "bottom-9 left-1/2 w-5 lg:bottom-[10%] lg:left-[30%] lg:w-7" },
  { src: "abc.svg", width: 84, height: 48, className: "hidden lg:block lg:left-[17%] lg:top-[30%] lg:w-28" },
  { src: "globe.svg", width: 64, height: 72, className: "hidden lg:block lg:bottom-[8%] lg:left-[6%] lg:w-20" },
  { src: "math.svg", width: 132, height: 48, className: "hidden lg:block lg:bottom-[8%] lg:right-[6%] lg:w-36" },
  { src: "star.svg", width: 40, height: 40, className: "hidden lg:block lg:right-[17%] lg:top-[31%] lg:w-6" },
];

export function SceneDecorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {DOODLES.map((doodle, index) => (
        <Image
          key={index}
          src={`/illustrations/${doodle.src}`}
          alt=""
          width={doodle.width}
          height={doodle.height}
          className={`absolute h-auto ${doodle.className}`}
        />
      ))}
    </div>
  );
}
