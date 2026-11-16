import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api";
import { resolveMediaUrl } from "../../utils/media";
import PageContainer from "../CommenComponents/PageContainer";

const benefits = [
  { icon: Truck, title: "Free delivery", detail: "Across India" },
  { icon: ShieldCheck, title: "5 years", detail: "Warranty" },
  { icon: RefreshCw, title: "Easy returns", detail: "Hassle-free" },
  { icon: CreditCard, title: "EMI options", detail: "Flexible payments" },
  { icon: Wrench, title: "Installation", detail: "At your home" },
  { icon: Award, title: "Quality assured", detail: "Premium materials" },
];

function getBannerLinks(banner) {
  let links = banner.destination_links;
  if (typeof links === "string") {
    try {
      links = JSON.parse(links);
    } catch (error) {
      console.error("Could not parse hero banner destination links:", error);
      links = [];
    }
  }

  const validLinks = Array.isArray(links)
    ? links.filter((link) => {
      if (!link || typeof link.label !== "string" || typeof link.url !== "string") return false;
      return link.url.startsWith("/") && !link.url.startsWith("//") ||
        /^https?:\/\//i.test(link.url);
    })
    : [];

  if (validLinks.length) return validLinks.slice(0, 2);
  if (typeof banner.destination_link === "string" && banner.destination_link.startsWith("/")) {
    return [{ label: "Shop now", url: banner.destination_link }];
  }
  return [{ label: "Explore collections", url: "/shop" }];
}

const Hero = () => {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedImageId, setFailedImageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchBanners = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await api.get("/banners/hero");
        if (!Array.isArray(data?.banners)) {
          throw new Error("The server returned an invalid hero banner list.");
        }
        if (active) {
          setBanners(data.banners);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error("Could not load homepage hero banners:", error);
        if (active) {
          setBanners([]);
          setLoadError("Featured banners could not be loaded.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchBanners();
    return () => {
      active = false;
    };
  }, [retryCount]);

  useEffect(() => {
    if (
      loading ||
      loadError ||
      banners.length < 2 ||
      isHovered ||
      hasFocus ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % banners.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [banners.length, currentIndex, hasFocus, isHovered, loadError, loading]);

  const banner = banners[currentIndex];
  const links = useMemo(() => banner ? getBannerLinks(banner) : [], [banner]);
  const headingWords = (banner?.title || "").trim().split(/\s+/);
  const headingAccent = headingWords.pop();
  const headingLead = headingWords.join(" ");
  const imageFailed = banner && failedImageId === banner.id;
  const desktopImage = imageFailed
    ? "/images/welcome.png"
    : resolveMediaUrl(banner?.desktop_image || "");
  const mobileImage = imageFailed
    ? desktopImage
    : resolveMediaUrl(banner?.mobile_image || banner?.desktop_image || "");

  const renderLink = (link, index) => {
    const className = index === 0
      ? "group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      : "inline-flex items-center rounded-full border border-white/60 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
    const content = (
      <>
        {link.label}
        {index === 0 && <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />}
      </>
    );

    return /^https?:\/\//i.test(link.url)
      ? <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" className={className}>{content}</a>
      : <Link key={`${link.url}-${index}`} to={link.url} className={className}>{content}</Link>;
  };

  return (
    <>
      <section
        aria-label="Featured furniture promotions"
        aria-roledescription="carousel"
        className="relative isolate overflow-hidden bg-secondary-dark text-white"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setHasFocus(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
        }}
      >
        {banner && (
          <picture>
            {banner.mobile_image && <source media="(max-width: 640px)" srcSet={mobileImage} />}
            <img
              key={banner.id}
              src={desktopImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[62%_center] md:object-center"
              onError={() => {
                if (!imageFailed) {
                  console.error("Could not load hero banner image:", banner.desktop_image);
                  setFailedImageId(banner.id);
                }
              }}
            />
          </picture>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-secondary-dark/75 via-secondary-dark/40 to-secondary-dark/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary-dark/15 via-transparent to-black/5" />

        <div className="relative flex min-h-[490px] items-center py-16 md:min-h-[540px]">
          <PageContainer>
            {loading ? (
              <p role="status" className="text-sm font-semibold text-white/80">Loading featured furniture...</p>
            ) : loadError ? (
              <div role="alert" className="max-w-xl">
                <p className="text-3xl font-black sm:text-4xl">Discover furniture made for living.</p>
                <p className="mt-3 text-white/80">{loadError}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
                >
                  Try again
                </button>
              </div>
            ) : banner ? (
              <div key={banner.id} className="max-w-xl animate-in fade-in">
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.16em] text-orange-100 backdrop-blur-sm">
                  <span className="h-2 w-2 rounded-full bg-primary-light shadow-[0_0_12px_rgba(255,179,107,0.9)]" />
                  Q LIVING FURNITURE
                </p>
                <h1 className="text-3xl font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                  {headingLead && `${headingLead} `}
                  <span className="text-primary-light">{headingAccent}</span>
                </h1>
                {banner.subtitle && (
                  <p className="mt-5 max-w-lg text-lg font-semibold leading-7 text-primary-light sm:text-xl">
                    {banner.subtitle}
                  </p>
                )}
                {banner.description && (
                  <p className="mt-2 line-clamp-2 max-w-lg text-sm leading-6 text-white/85 sm:text-base">
                    {banner.description}
                  </p>
                )}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {links.map(renderLink)}
                </div>
              </div>
            ) : (
              <div className="max-w-xl">
                <p className="text-3xl font-black sm:text-4xl">Your home, your kind of comfort.</p>
                <p className="mt-3 text-white/80">There are no published hero banners right now.</p>
                <Link to="/shop" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark">
                  Explore furniture
                </Link>
              </div>
            )}
          </PageContainer>
        </div>

        {!loading && !loadError && banners.length > 1 && (
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {banners.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show banner ${index + 1}: ${item.title}`}
                aria-current={index === currentIndex ? "true" : undefined}
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 rounded-full transition-all ${index === currentIndex ? "w-7 bg-primary-light" : "w-2.5 bg-white/60 hover:bg-white"}`}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Shopping benefits" className="border-b border-orange-100 bg-white">
        <PageContainer>
          <div className="grid grid-cols-2 divide-y divide-orange-100 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
            {benefits.map(({ icon: Icon, title, detail }) => (
              <div key={title} className="flex items-center gap-3 px-3 py-4 sm:justify-center lg:px-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-primary-dark">
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold text-secondary-dark">{title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{detail}</span>
                </span>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>
    </>
  );
};

export default Hero;