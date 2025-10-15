// Application constants
export const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Resolve API base URL with mixed-content safety:
// - In production: avoid http:// URLs to prevent mixed content; prefer same-origin ('')
//   so that Netlify can proxy /api/* via public/_redirects.
// - In development: use env if provided, otherwise same-origin ('').
const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
export const apiUrl = (() => {
  if (import.meta.env.PROD) {
    if (!rawApiUrl) return ""; // same-origin
    if (rawApiUrl.startsWith("https://")) return rawApiUrl;
    if (rawApiUrl.startsWith("/")) return ""; // treat as same-origin
    // Any http:// value is ignored in production to avoid mixed content
    return "";
  }
  return rawApiUrl ?? "";
})();

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;
export const socketUrl = (() => {
  if (import.meta.env.PROD) {
    if (!rawSocketUrl) return ""; // same-origin
    if (
      rawSocketUrl.startsWith("https://") ||
      rawSocketUrl.startsWith("wss://")
    )
      return rawSocketUrl;
    if (rawSocketUrl.startsWith("/")) return ""; // treat as same-origin path
    return ""; // ignore http:// and ws:// in production to prevent mixed content
  }
  return rawSocketUrl ?? "";
})();
