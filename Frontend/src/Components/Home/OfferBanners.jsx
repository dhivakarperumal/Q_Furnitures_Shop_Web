import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import { resolveMediaUrl } from "../../utils/media";

function getBannerDestination(banner) {
  let destination = banner.destination_link;
  if ((!destination || typeof destination !== "string") && banner.destination_links) {
    try {
      const links = typeof banner.destination_links === "string"
        ? JSON.parse(banner.destination_links)
        : banner.destination_links;
      destination = Array.isArray(links) ? links[0]?.url : "";
    } catch (error) {
      console.error("Could not parse offer banner destination links:", error);
    }
  }

  if (typeof destination !== "string" || !destination) return "/shop";
  if (destination.startsWith("/") && !destination.startsWith("//")) return destination;
  if (/^https?:\/\//i.test(destination)) {
    try {
      const url = new URL(destination);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : "/shop";
    } catch (error) {
      console.error("Invalid offer banner destination URL:", error);
    }
  }
  return "/shop";
}

const OfferBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/banners/offers")
      .then(({ data }) => {
        if (!Array.isArray(data?.banners)) {
          throw new Error("The server returned an invalid offer banner list.");
        }
        if (active) {
          setBanners(data.banners);
          setError("");
        }
      })
      .catch((requestError) => {
        console.error("Could not load homepage offer banners:", requestError);
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || "Could not load offer banners.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!loading && !error && !banners.length) return null;

  return (
    <section aria-label="Furniture collections and offers" className="py-10 sm:py-14">
      <PageContainer>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">Discover your space</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#351d0e] sm:text-3xl">Collections & offers</h2>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-2xl bg-[#eee4d8] sm:h-48" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {banners.map((banner) => {
              const destination = getBannerDestination(banner);
              const image = resolveMediaUrl(banner.desktop_image || banner.mobile_image || "");
              const content = (
                <>
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="relative z-10 flex min-h-40 w-[40%] flex-col items-start justify-center p-3 sm:min-h-48 sm:p-4">
                    {banner.offer && (
                      <span className="mb-1.5 rounded-full bg-[#f07816] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:mb-2 sm:px-2.5 sm:text-xs">
                        {banner.offer}
                      </span>
                    )}
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-[#351d0e] sm:text-lg">
                      {banner.title}
                    </h3>
                    {(banner.subtitle || banner.description) && (
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#351d0e] sm:mt-1.5 sm:text-sm">
                        {banner.subtitle || banner.description}
                      </p>
                    )}
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#e87516] px-2 py-1 text-[10px] font-semibold text-white transition group-hover:bg-[#c95f0a] sm:mt-3 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                      {banner.destination_links?.[0]?.label || "Shop now"}
                      <ArrowRight size={12} />
                    </span>
                  </div>
                </>
              );

              return (
                <article key={banner.id} className="overflow-hidden rounded-2xl">
                  {destination.startsWith("http") ? (
                    <a
                      href={destination}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${banner.title} - ${banner.destination_links?.[0]?.label || "Shop now"}`}
                      className="group relative block min-h-40 overflow-hidden rounded-2xl bg-[#f2e7db] sm:min-h-48"
                    >
                      {content}
                    </a>
                  ) : (
                    <Link
                      to={destination}
                      aria-label={`${banner.title} - ${banner.destination_links?.[0]?.label || "Shop now"}`}
                      className="group relative block min-h-40 overflow-hidden rounded-2xl bg-[#f2e7db] sm:min-h-48"
                    >
                      {content}
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </PageContainer>
    </section>
  );
};

export default OfferBanners;
