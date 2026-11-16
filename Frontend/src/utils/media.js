const configuredBackendUrl = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
  ""
).trim();
const isLocalBackendUrl = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(configuredBackendUrl);
const backendUrl = (
  import.meta.env.PROD && isLocalBackendUrl
    ? window.location.origin
    : configuredBackendUrl || (import.meta.env.DEV ? "http://localhost:5000" : window.location.origin)
).replace(/\/$/, "");

export function resolveMediaUrl(image) {
  if (!image || typeof image !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
}
