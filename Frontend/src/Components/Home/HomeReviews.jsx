import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";
import { resolveMediaUrl } from "../../utils/media";

const HomeReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/reviews/published")
      .then(({ data }) => {
        if (!Array.isArray(data?.reviews)) {
          throw new Error("The server returned an invalid review list.");
        }
        if (active) setReviews(data.reviews);
      })
      .catch((requestError) => {
        console.error("Could not load homepage reviews:", requestError);
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || "Could not load customer reviews.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!loading && !error && !reviews.length) return null;

  return (
    <section aria-label="Customer reviews" className="bg-white py-12 sm:py-16">
      <PageContainer>
        <div className="mb-7 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06e46]">Loved by our customers</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#351d0e] sm:text-4xl">Customer reviews</h2>
          <p className="mt-2 text-sm text-[#8b735e] sm:text-base">Real experiences from people who made Q Living part of their home.</p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-2xl border border-[#eee4d8] bg-[#f7f1e9]" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
            {error}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review) => (
              <article key={review.id} className="flex h-full flex-col rounded-2xl border border-[#eee4d8] bg-[#fcfaf7] p-5 sm:p-6">
                <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      size={16}
                      className={index < Number(review.rating) ? "fill-[#d49a46] text-[#d49a46]" : "text-[#d9cfc4]"}
                    />
                  ))}
                </div>

                <p className="mt-4 flex-1 text-sm leading-6 text-[#634d3b]">“{review.comment}”</p>

                {review.review_image && (
                  <img
                    src={resolveMediaUrl(review.review_image)}
                    alt={`Customer photo for ${review.product_name || "furniture"} review`}
                    loading="lazy"
                    className="mt-4 h-28 w-full rounded-xl object-cover"
                  />
                )}

                {review.admin_reply && (
                  <div className="mt-4 rounded-xl border-l-2 border-[#d49a46] bg-white px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8b5a35]">Q Living reply</p>
                    <p className="mt-1 text-xs leading-5 text-[#634d3b]">{review.admin_reply}</p>
                  </div>
                )}

                <div className="mt-5 border-t border-[#eee4d8] pt-4">
                  <p className="text-sm font-bold text-[#351d0e]">{review.user_name}</p>
                  {review.product_name && <p className="mt-1 text-xs text-[#8b735e]">Purchased: {review.product_name}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </PageContainer>
    </section>
  );
};

export default HomeReviews;
