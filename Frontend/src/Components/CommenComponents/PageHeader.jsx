import { Link } from "react-router-dom";

const PageHeader = ({ title, background }) => {

  const bgImage = background || "/images/pageheader.png";

  return (
    <div
      className="relative flex h-[180px] w-full items-center justify-start overflow-hidden bg-black px-5 text-left text-[#351d0e] sm:h-[200px] sm:px-8 md:h-[210px] lg:h-[220px]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-105 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="relative">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl md:mb-3 md:text-4xl lg:text-5xl">
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