# AGENTS.md — Confiterías Viegener

Project rules for `confiterias-viegener/`. The repository-wide rules in the
root [`AGENTS.md`](../AGENTS.md) stay in force; these tighten them.

## Status: unapproved concept

Confiterías Viegener is a **real business that has not commissioned this work
and has not seen it**. Every fact on the page is a draft assumption carried
over from a prototype, not verified source content.

- Do not publish this project, deploy it to a public stage, register it in
  `stageProjects` or `previewProjects`, or point a customer-facing URL at it.
- Do not contact the business, and do not present the page as their website.
- Do not remove or soften the concept warning at the top of `README.md` or the
  `unverified` flags in `src/content.js`. They come off when the owner
  confirms the content, and only then.

## Content

- Every string belongs in [`website/src/content.js`](./website/src/content.js).
  If a string is written anywhere else, that is the bug.
- Do not invent, extend or "improve" any business fact: no new products, no
  prices, no hours, no claims about quality, provenance or awards, no
  testimonials. The page may only say what the prototype already said until
  the client supplies more.
- Keep the copy in Argentinian Spanish, including the voseo (`Hacé`, `Contanos`,
  `Vení`, `Elegí`). Do not switch it to neutral Spanish, and do not add a second
  language without the owner's approved translation.
- A block whose factual content is unconfirmed keeps `unverified: true`. The
  build prints the list; keep that reporting working.

## Photography

- The prototype's photos have no recorded licence or provenance and are
  probably generic stock. **No image may be added to `assets/` without its
  licence and source recorded in [`website/assets/README.md`](./website/assets/README.md).**
- Do not add photographs of a real business that were not supplied by that
  business.
- `assets/source/` holds full-size originals and is an input to
  `npm run images`; it is not shipped. Committed derivatives are the
  deliverable.

## Implementation

- Static HTML/CSS/JS, no framework, no build-time or run-time network access.
- Do not add a webfont, an icon font, analytics, a tag manager, an embed, a map
  iframe or any other third-party request. The typography is deliberately a
  system stack.
- Style layers load in order: `tokens → base → layout → components → sections`.
  Change a value at the layer that owns it — a token in `tokens.css`, a
  component's own rule in `components.css` — rather than overriding it further
  down.
- Keep `src/js/site.js` optional. Anything a visitor needs in order to read the
  page or place an order must work with JavaScript blocked.
- Photographs ship as WebP with a JPEG fallback at the widths declared in
  `images` in `content.js`. Keep every shipped file under the 320KB budget the
  tests enforce.

## Checks

Run before pushing:

```bash
npm --prefix confiterias-viegener/website run check
node scripts/check-repository.mjs
```

Test the smallest and the largest supported layout. The header nav disappears
below 1080px and the fixed order bar appears below 760px, so both breakpoints
change how the page is navigated — a desktop screenshot is not evidence.
