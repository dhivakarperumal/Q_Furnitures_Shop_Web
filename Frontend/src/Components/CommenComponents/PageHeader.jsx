import { Link } from "react-router-dom";

const PageHeader = ({ title, background }) => {

  const bgImage = background || "/images/pageheader.png";

  return (
    <div
      className="relative flex h-[140px] w-full items-center justify-start overflow-hidden bg-black px-5 text-left text-[#351d0e] sm:h-[160px] sm:pl-[15%] sm:pr-8 md:h-[170px] md:pl-[15%] lg:h-[180px]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-105 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#fff3e3]/45 via-[#fff3e3]/30 to-[#fff3e3]/30"
      />
      <div className="relative">
        <h1 className="mb-2 text-2xl font-bold text-[#ef7412] sm:text-3xl md:mb-3 md:text-4xl lg:text-5xl">
          {title}
        </h1>
        <div className="flex items-center justify-start gap-2 text-xs sm:text-sm md:text-base">
          <Link to="/" className="transition hover:text-[#a34720]">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#725d4b]">{title}</span>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;