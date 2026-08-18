# Image assets

Every file in this directory needs a recorded source and licence. A photograph
with neither does not ship.

`source/` holds the full-size originals and is an input to
`npm run images`; it is not copied into `dist/`. The `<slot>-<width>.<ext>`
derivatives beside it are what the page serves, and they are committed.

## Provenance

| Slot | Shown as | Source | Licence |
| --- | --- | --- | --- |
| `brand-logo.png` | Wordmark, header and footer | Concept prototype | **Unresolved** — the business's own mark, used without permission |
| `hero-catering` | Baker working dough | Concept prototype | **Unresolved** |
| `product-spread` | Pastelería card | Concept prototype | **Unresolved** |
| `heritage-photo` | Bombonería card | Concept prototype | **Unresolved** |
| `bakers-hands` | Panadería card | Concept prototype | **Unresolved** |
| `pastry-cake` | Desayunos & regalos card | Concept prototype | **Unresolved** |
| `signature-cake` | Signature recipes band | Concept prototype | **Unresolved** |
| `artisan-baker` | History, main image | Concept prototype | **Unresolved** |
| `storefront` | History, inset image | Concept prototype | **Unresolved** |

None of these has a confirmed licence, and their prototype filenames did not
describe what they show — the alt text in `content.js` describes the actual
image, not the filename it arrived under.

**Before this project goes anywhere public**, every row above must be replaced
with either the business's own photography or a licence that permits the use,
with the licence recorded here.
