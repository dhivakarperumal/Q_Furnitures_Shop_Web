const backendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:5000"
).replace(/\/$/, "");

export function resolveMediaUrl(image) {
  if (!image || typeof image !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
}
