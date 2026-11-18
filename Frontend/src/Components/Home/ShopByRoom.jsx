import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";

const ALL_ROOMS = [
  { name: "Living Room",  slug: "living-room",  image: "/images/ph1.png",        imagePosition: "object-[66%_center]" },
  { name: "Bedroom",      slug: "bedroom",       image: "/images/pageheader.png", imagePosition: "object-[88%_center]" },
  { name: "Dining Room",  slug: "dining-room",   image: "/images/ph1.png",        imagePosition: "object-[58%_center]" },
  { name: "Home Office",  slug: "home-office",   image: "/images/pageheader1.png",imagePosition: "object-[70%_center]" },
  { name: "Kids Room",    slug: "kids-room",     image: "/images/pageheader.png", imagePosition: "object-[94%_center]" },
  { name: "Outdoor",      slug: "outdoor",        image: "/images/ph1.png",        imagePosition: "object-[78%_center]" },
];

export default function ShopByRoom() {
  const [rooms, setRooms] = useState(ALL_ROOMS); // show all optimistically

  useEffect(() => {
    let cancelled = false;
    api.get("/products/rooms")
      .then(({ data }) => {
        if (cancelled) return;
        // Build a set of slugs that have at least 1 product
        const withProducts = new Set(
          data.filter((r) => r.productCount > 0).map((r) => r.slug)
        );
        setRooms(ALL_ROOMS.filter((r) => withProducts.has(r.slug)));
      })
      .catch(() => {
        // On error keep all rooms visible
      });
    return () => { cancelled = true; };
  }, []);

  if (!rooms.length) return null;

  return (
    <section aria-labelledby="shop-by-room-title" className="bg-white py-6 sm:py-8">
      <PageContainer>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="shop-by-room-title" className="text-xl font-bold tracking-tight text-[#351d0e] sm:text-2xl">
            Shop by <span className="text-[#e87424]">Room</span>
          </h2>
          <Link
            to="/shop"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#8b4b1f] transition hover:text-[#e87500] sm:text-sm"
          >
            Explore All Rooms
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
          {rooms.map((room) => (
            <Link
              key={room.slug}
              to={`/shop?room=${encodeURIComponent(room.slug)}`}
              aria-label={`Shop ${room.name}`}
              className="group relative aspect-[1.65] overflow-hidden rounded-xl bg-[#eee4d8] shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e87500]"
            >
              <img
                src={room.image}
                alt=""
                loading="lazy"
                className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${room.imagePosition}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
              <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 sm:inset-x-3 sm:bottom-3">
                <span className="truncate text-xs font-bold text-white drop-shadow sm:text-sm">{room.name}</span>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[#9b4e17] transition group-hover:bg-[#f07816] group-hover:text-white sm:h-7 sm:w-7">
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </PageContainer>
    </section>
  );
}
