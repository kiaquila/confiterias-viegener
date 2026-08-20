# AGENTS.md — Confiterías Viegener

Read this file, the root [`README.md`](./README.md) and the task-relevant
product documents before changing the project.

## Status

Confiterías Viegener is a real business. The project owner approved the page
copy, the logo and the photography for use on this site on **2026-08-20**, and
its public address is <https://confiterias-viegener.ks-design.workers.dev>.

That approval is the owner's decision to publish this material here. Do not
restate it as a licence grant, and do not attribute the photographs or the mark
to a named rights holder — no such determination has been made.

## Content

- Every string belongs in [`website/src/content.js`](./website/src/content.js).
  If a string is written anywhere else, that is the bug.
- Do not invent, extend or "improve" any business fact: no new products, no
  prices, no hours, no claims about quality, provenance or awards, no
  testimonials. New facts come from the owner, not from the page.
- Keep the copy in Argentinian Spanish, including the voseo (`Hacé`, `Contanos`,
  `Vení`, `Elegí`). Do not switch it to neutral Spanish, and do not add a second
  language without the owner's approved translation.
- The `unverified` flag is the publication gate and stays wired up. Any block
  whose facts the owner has not confirmed sets `unverified: true`; the build
  then forces `noindex, nofollow`, writes a `Disallow: /` robots policy and
  withholds the sitemap until the flag is cleared. `unverifiedSections` is empty
  today — keep the mechanism, and keep the build's reporting of it working.
- The La Nación article is the external source for the 1949 founding date and
  the history. Keep it cited; do not replace it with an unsourced assertion.

## Photography

- `website/assets/source/` holds the eight full-size originals. It is an input
  to `npm run images` and is never shipped — `build.mjs` excludes it from
  `dist/`, and that exclusion is deliberate. The committed derivatives are the
  deliverable.
- Derivatives regenerate byte-for-byte from the originals, and `make-images.mjs`
  passes `-strip`. No shipped image may carry EXIF, IPTC, XMP, GPS or camera
  metadata; re-check after changing the pipeline.
- Record any new image's source in
  [`website/assets/README.md`](./website/assets/README.md) before committing it.
- Photographs ship as WebP with a JPEG fallback at the widths declared in
  `images` in `content.js`. Keep every shipped file under the 320KB budget the
  tests enforce.

## Implementation

- Static HTML/CSS/JS, no framework, no build-time or run-time network access.
- Do not add a webfont, an icon font, analytics, a tag manager, an embed, a map
  iframe or any other third-party request. The typography is deliberately a
  system stack, and the Worker's CSP denies `font-src` and `connect-src`
  outright — adding one means widening the policy, which needs a real reason.
- The page sets no inline style and no inline script, which is what lets
  `script-src` and `style-src` stay `'self'` without `'unsafe-inline'`. Tests
  assert this. Keep it true.
- Style layers load in order: `tokens → base → layout → components → sections`.
  Change a value at the layer that owns it — a token in `tokens.css`, a
  component's own rule in `components.css` — rather than overriding it further
  down.
- Keep `website/src/js/site.js` optional. Anything a visitor needs in order to
  read the page or place an order must work with JavaScript blocked.

## Deployment

The site is a Cloudflare Worker named `confiterias-viegener` serving Workers
Static Assets from `website/dist/`, with root directory `website`, build command
`npm run build`, production `npm run stage:deploy` and preview
`npm run stage:preview`. Keep `compatibility_date` pinned and the Wrangler
version exact. Worker names, account data, routes and credentials are
project-owned and are never committed.

## Checks

Run before pushing:

```bash
npm ci --prefix website
npm --prefix website run check
```

Test the smallest and the largest supported layout; a desktop screenshot is not
evidence. Two breakpoints change how the page is navigated:

- **`width <= 1080px`** — the desktop nav disappears and the fixed order bar
  becomes the persistent way to reach the order section. The bar appears at the
  same width the nav goes, not 320px later: the header is absolutely positioned,
  so between 760 and 1080 the hero's order button scrolls away with the hero.
- **`width <= 760px`** — the phone layout proper.

Check 1079 and 1080 specifically. They sit on opposite sides of the nav/order-bar
handover, and a screenshot at 1440 shows neither.
