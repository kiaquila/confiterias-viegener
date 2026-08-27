# Confiterías Viegener

Landing page for Confiterías Viegener, a European pastry, bakery and chocolate
business in Buenos Aires with a production house in Vicente López and a branch
in Palermo.

The design is a single Spanish (`es-AR`) page: hero, specialities, signature
recipes, catering, history, locations, an order band, and the footer. Its
public address is <https://confiterias-viegener.ks-design.workers.dev>.

## Content approval

The project owner approved the page copy, the logo and the photography for use
on this site on **2026-08-20**. That approval is what put the page into search:
until it was given, every content block carried an `unverified` flag, and the
build used those flags to force `noindex, nofollow` and a `Disallow: /`
robots policy.

The approval is recorded as exactly what it is — the project owner's decision to
publish this material here. It is not a licence grant, and it does not name a
rights holder for the photographs or the mark; nothing in this repository
asserts either.

The flag machinery stays in the code on purpose. Any block added later that the
owner has not confirmed sets `unverified: true`, and that single flag pulls the
page back out of search and withdraws the sitemap on the next build. See
[`website/src/content.js`](./website/src/content.js).

## Source of truth

Every string lives in [`website/src/content.js`](./website/src/content.js).
Nothing on the page is written anywhere else.

| Item | Value | Source |
| --- | --- | --- |
| Business name | Confiterías Viegener | Owner-approved, 2026-08-20 |
| Founded | 1949, by Otto Viegener | [La Nación, 26-05-2025](https://www.lanacion.com.ar/lifestyle/hace-75-anos-llego-de-alemania-con-el-oficio-de-pastelero-y-abrio-una-confiteria-que-supero-nid26052025/) |
| Casa central & fábrica | Av. Maipú 1480, Buenos Aires | Owner-approved, 2026-08-20 |
| Sucursal CABA | Av. Coronel Díaz 1855, Ciudad de Buenos Aires | Owner-approved, 2026-08-20 |
| Hours (both) | Lun–Vie 7:30–20:00; Sáb, Dom y feriados 8:00–20:00 | Owner-approved, 2026-08-20 |
| Phone — Vicente López | 011 4791-2666 | Owner-approved, 2026-08-20 |
| Phone — Palermo | 011 4824-4910 | Owner-approved, 2026-08-20 |
| Email | `confiteriasviegener@gmail.com` | Owner-approved, 2026-08-20 |
| Instagram | [@confiteriasviegener](https://www.instagram.com/confiteriasviegener/) | Owner-approved, 2026-08-20 |
| Product ranges, signature items, catering list | Page copy | Owner-approved, 2026-08-20 |

The La Nación article stays cited as the external source for the founding date
and the history, because that is where those facts come from. The "75+ años"
seal is derived from `founded` rather than stored, so it cannot go stale.

## Open questions

1. **No favicon, touch icon or social share image.** Producing them means
   deriving marks from the business's identity, which is a design decision that
   has not been made. The build fails if the document ever references a file it
   does not ship, so these cannot become broken links by accident.
2. **The typefaces are system stacks.** Iowan Old Style and Avenir Next resolve
   on Apple platforms and fall back elsewhere, so the page does not render
   identically on Windows or Android. Shipping licensed webfonts is the fix and
   needs a licence decision, which is deliberately not made here.

## Implementation

Static HTML/CSS/JS with no framework, built by a Node script.

```text
website/
├── src/content.js           # every string and every fact, in one place
├── src/render.js            # renders the page and the 404 from content.js
├── src/styles/              # tokens → base → layout → components → sections
├── src/js/site.js           # marks the current nav link; nothing depends on it
├── scripts/build.mjs        # renders into dist/
├── scripts/make-images.mjs  # local-only: regenerates the image derivatives
├── scripts/serve.mjs        # local preview
├── worker/index.ts          # Cloudflare entry point; attaches security headers
├── wrangler.json            # Worker name, assets and pinned compatibility date
└── tests/site.test.mjs      # asserts against dist/, not against the source
```

The page carries **no network dependency**: no webfont, no analytics, no
embeds, no image CDN. The three outbound destinations are the business's
Instagram, the La Nación article and Google Maps, all reached by ordinary links
marked `rel="noopener noreferrer"`.

### Design tokens

| Token | Value | Used for |
| --- | --- | --- |
| `--ink` | `#25211d` | body text |
| `--ink-soft` | `#645c53` | secondary copy |
| `--paper` / `--cream` / `--white` | `#fbf8f2` / `#f5efe5` / `#fffdf9` | section grounds |
| `--gold` | `#bb8a43` | eyebrows and accents on light grounds |
| `--gold-light` | `#e2c58d` | accents on dark grounds, order band |
| `--forest` | `#253f33` | top note, catering band |

`--gold` clears 4.5:1 on the light grounds; `--gold-light` does not, so it is
only ever used as the light colour on a dark ground.

## Images

Photographs ship as WebP with a JPEG fallback at the widths declared in `images`
in `content.js`, and every shipped file stays under the 320KB budget the tests
enforce. `website/assets/source/` holds the eight full-size originals; it is an
input to `npm run images` and is never copied into `dist/`.

The committed derivatives regenerate byte-for-byte from those originals, and
`make-images.mjs` passes `-strip`, so no shipped image carries EXIF, IPTC, XMP,
GPS or camera-identifying metadata. See
[`website/assets/README.md`](./website/assets/README.md).
The exact approved prototype paths and source hashes are pinned in
`website/assets/source/manifest.json`; the generator refuses any source whose
bytes do not match that manifest.

## Hosting

The site is a Cloudflare Worker serving Workers Static Assets out of `dist/`.
`worker/index.ts` exists only to attach security headers, which the asset
pipeline does not set on its own. Because the page sets no inline style and no
inline script, its Content-Security-Policy needs neither `'unsafe-inline'` nor
any external origin.

| Setting | Value |
| --- | --- |
| Worker name | `confiterias-viegener` |
| Repository | `kiaquila/confiterias-viegener` |
| Production branch | `main` |
| Root directory | `website` |
| Build command | `npm run build` |
| Production deploy command | `npm run stage:deploy` |
| Non-production deploy command | `npm run stage:preview` |

`workers_dev: true` serves the stable URL; `preview_urls: true` gives each pull
request a versioned URL shaped `https://<version>-confiterias-viegener.ks-design.workers.dev`.
The version prefix is assigned by Cloudflare and must not be hard-coded.

The standalone-repository migration, local and production verification,
governance exceptions, and unresolved deployment evidence are recorded in
[`docs/confiterias-viegener-migration-handoff.md`](./docs/confiterias-viegener-migration-handoff.md).

## Checks

```bash
npm ci --prefix website
npm --prefix website run check
```

That builds into `dist/` and runs the test suite against the built output.
`dist/` is generated and is not committed. There is no second, repository-level
check to run: `website/` is the whole project.

Regenerating the photography derivatives is a local step and needs ImageMagick.
It is not part of `check`, because the derivatives are committed:

```bash
npm --prefix website run images
```
