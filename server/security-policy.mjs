/** Response headers for documents and API. Do not set frame-ancestors:
 * the live preview embeds the app, and COOP would break the sign-in popup. */
export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://grok.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' ws: wss: https:",
    "frame-src 'self' https://auth.grok.me https://accounts.google.com https://grok.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "form-action 'self' https://auth.grok.me https://accounts.google.com",
  ].join("; "),
};
