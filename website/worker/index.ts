/**
 * Cloudflare Worker entry point for the Confiterías Viegener site.
 *
 * The page is fully static: Workers Static Assets serves everything out of
 * `dist/`, and this Worker exists only to attach the security headers the
 * assets pipeline does not set on its own.
 */

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/** Applied to every response, whatever it is. */
const BASELINE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // No preload: that submission is effectively irreversible for the domain.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy":
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Frame-Options": "DENY"
};

/**
 * Every directive below is what this page actually needs, and nothing else.
 *
 * The page loads one local stylesheet, one local script and local images; the
 * logo is a CSS `mask-image`, which `img-src` governs. It sets no inline style
 * and no inline script, so neither `style-src` nor `script-src` needs
 * `'unsafe-inline'` — tests assert both, which is what lets this stay strict.
 *
 * The typography is a system stack, there is no form, and `site.js` makes no
 * request, so fonts, connections and form submissions are denied outright
 * rather than left to the `default-src` fallback. The outbound links to
 * Instagram, Google Maps and La Nación are ordinary navigations, which CSP
 * fetch directives do not govern, so they need no allowance here.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'none'",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests"
].join("; ");

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(BASELINE_HEADERS)) {
      headers.set(name, value);
    }
    if ((headers.get("content-type") ?? "").includes("text/html")) {
      headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
