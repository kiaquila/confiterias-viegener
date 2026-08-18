# Confiterías Viegener

Concept landing page for Confiterías Viegener, a European pastry, bakery and
chocolate business in Buenos Aires with a production house in Vicente López and
a branch in Palermo.

> **This is an unapproved concept.** Confiterías Viegener is a real business,
> but the owner has not seen, commissioned or confirmed anything in this
> directory. Every fact on the page — addresses, phone numbers, opening hours,
> the email address, the product ranges and the history — is a **draft
> assumption carried over from the prototype**, not verified source content.
> Nothing here may be published, shown to the business, or presented as their
> website until the open questions below are settled.

The design is a single Spanish (`es-AR`) page: hero, specialities, signature
recipes, catering, history, locations, an order band, and the footer.

## Where this came from

The design was prototyped on an authenticated ChatGPT-hosted preview
(`confiterias-viegener.krisredlips.chatgpt.site`) and ported into this
repository by hand. The port reproduces the prototype's copy, structure,
palette, type scale and responsive behaviour; it is not a copy of its build
output. Differences from the prototype are listed under
[Changes made during the port](#changes-made-during-the-port).

## Source of truth

| Item | Value | Source | Status |
| --- | --- | --- | --- |
| Business name | Confiterías Viegener | prototype | **unverified** |
| Founded | 1949, by Otto Viegener | [La Nación, 26-05-2025](https://www.lanacion.com.ar/lifestyle/hace-75-anos-llego-de-alemania-con-el-oficio-de-pastelero-y-abrio-una-confiteria-que-supero-nid26052025/) | press, not client-confirmed |
| Casa central & fábrica | Av. Maipú 1480, Buenos Aires | prototype | **unverified** |
| Sucursal CABA | Av. Coronel Díaz 1855, Ciudad de Buenos Aires | prototype | **unverified** |
| Hours (both) | Lun–Vie 7:30–20:00; Sáb, Dom y feriados 8:00–20:00 | prototype | **unverified** |
| Phone — Vicente López | 011 4791-2666 | prototype | **unverified** |
| Phone — Palermo | 011 4824-4910 | prototype | **unverified** |
| Email | `confiteriasviegener@gmail.com` | prototype | **unverified** |
| Instagram | [@confiteriasviegener](https://www.instagram.com/confiteriasviegener/) | prototype | **unverified** |
| Product ranges, signature items, catering list | Page copy | prototype | **unverified** |

Every string lives in [`website/src/content.js`](./website/src/content.js).
Nothing on the page is written anywhere else. Blocks whose factual content is
still unconfirmed carry an `unverified` flag, and `npm run build` prints them
on every build so an unapproved claim cannot quietly reach a stage.

## Open questions

1. **Client approval.** Nobody at Confiterías Viegener has been contacted. The
   business's own name, marks and details are used here without permission.
   This is the blocking question: until it is answered the project stays
   internal.
2. **Photography licence and provenance — unresolved.** The prototype's photos
   have no recorded source or licence, and their filenames do not describe what
   they show (`location.png` is a baker's hands; `bakery-team.jpg` is a
   decorated cake). They are most likely generic stock rather than pictures of
   this business. Under the repository's content rules they cannot ship until
   their licence is confirmed, and photographs of a real business should be
   that business's own. See [`website/assets/README.md`](./website/assets/README.md).
3. **Addresses, phones and hours** need checking against the business's own
   listings before anyone could act on them; a wrong phone number on a page
   that invites people to call is worse than no page.
4. **The "75+ años" seal** is derived from the 1949 founding date rather than
   stored, so it cannot go stale, but the claim itself still rests on the press
   article rather than on the client.
5. **`Especialidades judías`** appears in the "También hacemos" line. Confirm
   with the business how they describe this range before it is published.

## Implementation

Static HTML/CSS/JS with no framework, built by a Node script — the same shape
as [`ks/website`](../ks/website).

```text
website/
├── src/content.js        # every string and every fact, in one place
├── src/render.js         # renders the page and the 404 from content.js
├── src/styles/           # tokens → base → layout → components → sections
├── src/js/site.js        # marks the current nav link; nothing depends on it
├── scripts/build.mjs     # renders into dist/
├── scripts/make-images.mjs  # local-only: regenerates the image derivatives
├── scripts/serve.mjs     # local preview
└── tests/site.test.mjs   # asserts against dist/, not against the source
```

The page carries **no network dependency**: no webfont, no analytics, no
embeds, no image CDN. The two outbound links are the business's Instagram and
the La Nación article, both marked `rel="noopener noreferrer"`. Typography uses
system stacks (Iowan Old Style / Avenir Next with documented fallbacks), which
is what the prototype used — see [Known limitations](#known-limitations).

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

## Changes made during the port

The port is faithful to the concept's design. These are the deliberate
departures, each fixing a defect in the prototype:

1. **The footer logo was invisible.** The mark ships as a white silhouette. The
   prototype forced it white in the header and placed the same file, unfiltered,
   on the cream footer — about 1.03:1 against its background. It is now drawn as
   a mask filled with `currentColor`, so one asset stays legible on both grounds.
2. **Specialty card links no longer sit on a fixed-height paragraph.** The
   concept reserved `min-height: 4.8rem` for the description, which clips the
   longest one; the link is pushed to the card's baseline with `margin-top: auto`
   instead, so the row still aligns without constraining the copy.
3. **Anchor jumps were landing under the header** — `scroll-padding-top` added.
4. **A skip link and visible focus styles** were added; the concept had neither.
5. **`prefers-reduced-motion`** is honoured for the scroll behaviour, the card
   zoom and the link nudges.
6. **Enquiry links carry a subject line** (`Consulta — Pastelería`), so an
   enquiry from a specific card is distinguishable in the inbox.
7. **Maps links are built from the printed address** rather than stored as
   opaque URLs, so a corrected address cannot leave a stale pin.
8. **Images ship responsively** as WebP with a JPEG fallback at the widths the
   markup asks for. The concept sent one full-size file to every viewport,
   including a 3.4MB PNG.
9. **The heading levels and the hero statistics** were made a real description
   list (`dl`), and decorative arrows are `aria-hidden`.
10. **A 404 page** was added; the concept had none.

## Known limitations

- **The typefaces are system stacks.** Iowan Old Style and Avenir Next resolve
  on Apple platforms and fall back elsewhere, so the page does not look the same
  on Windows or Android as it does in the concept screenshots. Shipping licensed
  webfonts is the fix, and it needs a licence decision — it is deliberately not
  made here.
- The page has no menu, no prices and no ordering flow. It is a landing page
  that routes enquiries to a phone or an inbox.

## Checks

```bash
npm --prefix confiterias-viegener/website run check
```

That builds into `dist/` and runs the test suite against the built output.
`dist/` is generated and is not committed. From the repository root, also run:

```bash
node scripts/check-repository.mjs
```

Regenerating the photography derivatives is a local step and needs ImageMagick;
it is not part of `check`, because the derivatives are committed:

```bash
npm --prefix confiterias-viegener/website run images
```
