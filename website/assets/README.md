# Image assets

Every file in this directory needs a recorded source. This is that register.

`source/` holds the eight full-size originals and is an input to
`npm run images`; it is not copied into `dist/`. The `<slot>-<width>.<ext>`
derivatives beside it are what the page serves, and they are committed.
`source/manifest.json` records the exact approved prototype path and SHA-256 for
each original. Both the test suite and the image generator verify those hashes.
The generator also refuses responsive widths larger than the approved original.

## Approval

The project owner approved the logo and all eight photographs for use on this
site on **2026-08-20**.

That is recorded as what it is: the project owner's decision to publish this
material here. It is **not** a licence grant, and this file does not name a
rights holder or a licence type for any image, because no such determination has
been made. Anyone reusing these files elsewhere needs to settle that question
first — the approval above covers this site only.

## Register

| Slot | Shown as | Approved prototype file | Approved for this site |
| --- | --- | --- | --- |
| `brand-logo.png` | Wordmark, header and footer | `/brand-logo.png` | Owner, 2026-08-20 |
| `hero-catering` | Hero — baker working dough | `/hero-catering.jpg` | Owner, 2026-08-20 |
| `product-spread` | Pastelería card | `/product-spread.jpg` | Owner, 2026-08-20 |
| `heritage-photo` | Bombonería card | `/heritage-photo.jpg` | Owner, 2026-08-20 |
| `bakers-hands` | Panadería card | `/location.png` | Owner, 2026-08-20 |
| `pastry-cake` | Desayunos & regalos card | `/pastry-cake.png` | Owner, 2026-08-20 |
| `signature-cake` | Signature recipes band | `/bakery-team.jpg` | Owner, 2026-08-20 |
| `artisan-baker` | History, main image | `/artisan-baker.jpg` | Owner, 2026-08-20 |
| `storefront` | History, inset image | `/pastry-feature.jpg` | Owner, 2026-08-20 |

The prototype filenames did not describe what they show, so the alt text in
`content.js` describes the actual image rather than the name it arrived under.

## Embedded metadata

None of the shipped files carries EXIF, IPTC, XMP, GPS or camera-identifying
metadata. The JPEGs hold a JFIF density header (APP0) and nothing else; the
WebP and PNG files carry no metadata chunks. `make-images.mjs` passes `-strip`,
which is what keeps that true, and every derivative regenerates byte-for-byte
from `source/`.

Re-check after changing the image pipeline or adding a photograph:

```bash
npm run images
```

## Adding an image

1. Put the full-size original in `source/<slot>.<ext>`.
2. Record its approved prototype path and SHA-256 in `source/manifest.json`.
3. Declare the slot and its widths in `images` in `src/content.js`.
4. Run `npm run images` and commit both the original and the derivatives.
5. Add a row above recording where the file came from and who approved it.
6. Keep every shipped file under the 320KB budget the tests enforce.
