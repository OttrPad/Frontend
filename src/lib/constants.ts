// Application constants
export const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Resolve API base URL with mixed-content safety:
// - In production: avoid http:// URLs to prevent mixed content; prefer same-origin ('')
//   so that Netlify can proxy /api/* via public/_redirects.
// - In development: default to http://localhost:4000 unless explicitly overridden.
const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
export const apiUrl = (() => {
  if (import.meta.env.PROD) {
    if (!rawApiUrl) return ""; // same-origin
    if (rawApiUrl.startsWith("https://")) return rawApiUrl;
    if (rawApiUrl.startsWith("/")) return ""; // treat as same-origin
    // Any http:// value is ignored in production to avoid mixed content
    return "";
  }
  return rawApiUrl ?? "http://157.230.246.60:4000";
})();

const rawChatUrl = import.meta.env.VITE_CHAT_URL as string | undefined;
export const chatUrl = (() => {
  if (import.meta.env.PROD) {
    if (!rawChatUrl) return ""; // same-origin
    if (rawChatUrl.startsWith("https://")) return rawChatUrl;
    if (rawChatUrl.startsWith("/")) return ""; // treat as same-origin path
    return ""; // ignore http:// in production to prevent mixed content
  }
  return rawChatUrl ?? "http://157.230.246.60:5002";
})();

// Add other constants here as needed
// export const API_VERSION = "v1";
// export const APP_NAME = "OttrPad";
