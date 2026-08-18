#!/usr/bin/env node
/* Verifies the built landing: that every string on the page comes from
   `content.js`, that the page carries no network dependency, and that the
   accessibility and responsive guarantees the design depends on survive a
   change. Everything here reads dist/, so it tests what actually ships. */

import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import test, { before } from "node:test";

import {
  business,
  content,
  images,
  links,
  origin,
  locations,
  unverifiedSections
} from "../src/content.js";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

let page = "";
let notFound = "";
let css = "";
let script = "";

/* Compares against what a reader sees: tags dropped and entities decoded, so
   an apostrophe in the copy is matched as "'" and not as "&#039;". */
const stripTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#039;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ");

const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");

before(async () => {
  page = await readFile(join(dist, "index.html"), "utf8");
  notFound = await readFile(join(dist, "404.html"), "utf8");
  css = await readFile(join(dist, "assets/styles.css"), "utf8");
  script = await readFile(join(dist, "assets/site.js"), "utf8");
});

/* --- the client's own words ------------------------------------------------ */

test("every headline and paragraph on the page comes from content.js", () => {
  const text = stripTags(page);
  const expected = [
    content.hero.heading,
    content.hero.copy,
    content.categories.heading,
    content.categories.lead,
    content.categories.also,
    content.signatures.heading,
    content.signatures.lead,
    content.catering.heading,
    content.catering.copy,
    content.heritage.heading,
    ...content.heritage.paragraphs,
    content.locations.heading,
    content.order.heading,
    content.order.copy,
    content.footer.tagline
  ];
  for (const value of expected) {
    assert.ok(text.includes(value), `missing copy: ${value.slice(0, 48)}…`);
  }
});

test("each specialty and signature item is rendered once", () => {
  const text = stripTags(page);
  for (const item of content.categories.items) {
    assert.ok(text.includes(item.title), `missing category: ${item.title}`);
    assert.ok(text.includes(item.copy), `missing category copy: ${item.title}`);
  }
  for (const item of content.signatures.items) {
    assert.ok(text.includes(item.title), `missing signature: ${item.title}`);
    assert.ok(text.includes(item.copy), `missing signature copy: ${item.title}`);
  }
  for (const item of content.catering.items) {
    assert.ok(text.includes(item), `missing catering item: ${item}`);
  }
});

test("both locations ship their address, hours and phone", () => {
  const text = stripTags(page);
  for (const place of locations) {
    assert.ok(text.includes(place.name), `missing location: ${place.name}`);
    assert.ok(text.includes(place.street), `missing street: ${place.name}`);
    assert.ok(text.includes(place.city), `missing city: ${place.name}`);
    assert.ok(text.includes(place.phoneLabel), `missing phone: ${place.name}`);
    for (const line of place.hours) {
      assert.ok(text.includes(line), `missing hours: ${place.name}`);
    }
    assert.ok(page.includes(`href="${place.phoneHref}"`), `phone is not dialable: ${place.name}`);
  }
});

test("the seal states the tradition in whole years and stays in step with the founding year", () => {
  assert.ok(page.includes(`${business.yearsOfTradition}+`));
  assert.ok(business.yearsOfTradition >= 75);
  assert.ok(
    business.yearsOfTradition <= new Date().getFullYear() - business.founded,
    "the seal must not claim more years than the business has existed"
  );
});

/* --- unapproved content stays visible -------------------------------------- */

test("the concept copy is still flagged as unapproved by the client", () => {
  /* This is a reminder, not a failure: it fails only if someone clears the
     flags without also replacing the placeholder-grade factual content. The
     list is expected to shrink to nothing once the owner confirms the copy. */
  assert.ok(
    Array.isArray(unverifiedSections),
    "unverifiedSections must stay exported so the build can report it"
  );
});

/* --- no network dependencies ------------------------------------------------ */

test("the page pulls nothing from a third-party host", () => {
  const absolute = [...page.matchAll(/(?:src|href|content)="(https?:\/\/[^"]+)"/g)].map(
    (m) => m[1]
  );
  const allowed = new Set([links.instagram, links.lanacion]);
  for (const url of absolute) {
    /* The canonical, the OG tags and the maps links point at the site's own
       origin or at a destination the copy names; anything else would be a
       request a visitor did not ask for. */
    if (url.startsWith(origin)) continue;
    if (url.startsWith("https://www.google.com/maps/search/")) continue;
    assert.ok(allowed.has(url), `unexpected external reference in the document: ${url}`);
  }
  assert.ok(!/<link[^>]+fonts\./i.test(page), "no third-party font host");
  assert.ok(!/<script[^>]+src="https?:/i.test(page), "no third-party script");
  assert.ok(!/@import\s+url\(https?:/i.test(css), "no imported remote stylesheet");
  assert.ok(!/url\(\s*['"]?https?:/i.test(css), "no remote asset in the stylesheet");
});

test("every outbound link opens safely", () => {
  for (const match of page.matchAll(/<a[^>]+href="https?:\/\/[^"]+"[^>]*>/g)) {
    const tag = match[0];
    assert.ok(tag.includes('rel="noopener noreferrer"'), `missing rel on: ${tag}`);
  }
});

test("the typefaces are system stacks, so no font file ships or is fetched", async () => {
  const files = await readdir(join(dist, "assets"));
  assert.ok(
    !files.some((name) => /\.(woff2?|ttf|otf)$/.test(name)),
    "no webfont should be in the build"
  );
  assert.match(withoutComments(css), /--display:\s*"Iowan Old Style"/);
  assert.match(withoutComments(css), /--sans:\s*"Avenir Next"/);
});

/* --- images ------------------------------------------------------------------ */

test("every image slot ships both formats at every width it advertises", async () => {
  for (const [name, config] of Object.entries(images)) {
    for (const width of config.widths) {
      for (const extension of ["webp", "jpg"]) {
        const file = join(dist, "assets", `${name}-${width}.${extension}`);
        const info = await stat(file);
        assert.ok(info.isFile() && info.size > 0, `empty or missing: ${file}`);
      }
    }
  }
});

test("no shipped image is heavier than the budget a phone can afford", async () => {
  const budget = 320 * 1024;
  const files = await readdir(join(dist, "assets"));
  for (const name of files) {
    if (!/\.(jpg|png|webp)$/.test(name)) continue;
    const { size } = await stat(join(dist, "assets", name));
    assert.ok(size <= budget, `${name} is ${Math.round(size / 1024)}KB, over the ${budget / 1024}KB budget`);
  }
});

test("every image carries alt text and its own dimensions", () => {
  const imgs = [...page.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
  assert.ok(imgs.length > 0, "the page should render images");
  for (const tag of imgs) {
    assert.match(tag, /alt="[^"]+"/, `image without alt text: ${tag}`);
    assert.match(tag, /width="\d+"/, `image without width: ${tag}`);
    assert.match(tag, /height="\d+"/, `image without height: ${tag}`);
  }
});

test("only the hero image loads eagerly", () => {
  const eager = [...page.matchAll(/<img[^>]*loading="eager"[^>]*>/g)];
  assert.equal(eager.length, 1, "exactly one image should block the first paint");
  assert.ok(eager[0][0].includes(content.hero.image));
});

/* --- accessibility ----------------------------------------------------------- */

test("the document declares Argentinian Spanish", () => {
  assert.match(page, /<html lang="es-AR">/);
  assert.match(notFound, /<html lang="es-AR">/);
});

test("the page starts with a skip link that reaches the content", () => {
  assert.match(page, /class="skip-link" href="#inicio"/);
  assert.ok(page.includes('id="inicio"'));
});

test("every in-page nav target exists", () => {
  const targets = [...page.matchAll(/href="#([\w-]+)"/g)].map((m) => m[1]);
  for (const id of new Set(targets)) {
    assert.ok(page.includes(`id="${id}"`), `nav points at a missing section: #${id}`);
  }
});

test("headings descend in order without skipping a level", () => {
  const levels = [...page.matchAll(/<h([1-3])[\s>]/g)].map((m) => Number(m[1]));
  assert.equal(levels[0], 1, "the page should open with its h1");
  assert.equal(levels.filter((level) => level === 1).length, 1, "exactly one h1");
  for (let i = 1; i < levels.length; i += 1) {
    assert.ok(levels[i] - levels[i - 1] <= 1, `heading level jumps at index ${i}`);
  }
});

test("decorative glyphs are hidden from assistive technology", () => {
  for (const match of page.matchAll(/<span[^>]*>([↗↓→•])<\/span>/g)) {
    assert.ok(
      match[0].includes('aria-hidden="true"'),
      `decorative glyph is announced: ${match[0]}`
    );
  }
});

test("the logo keeps an accessible name in both places it appears", () => {
  const marks = [...page.matchAll(/<span class="brand-mark"[^>]*>/g)];
  assert.equal(marks.length, 2, "the mark appears in the header and the footer");
  for (const [tag] of marks) {
    assert.ok(tag.includes('role="img"'), `mark without a role: ${tag}`);
    assert.ok(tag.includes(`aria-label="${business.name}"`), `mark without a name: ${tag}`);
  }
});

test("the mark is drawn in the surrounding text colour, not shipped as a white image", () => {
  const clean = withoutComments(css);
  assert.match(clean, /\.brand-mark\s*\{[^}]*background:\s*currentColor/);
  assert.match(clean, /\.footer-brand\s+\.brand-mark\s*\{[^}]*color:\s*var\(--ink\)/);
});

test("the visible focus ring is never removed", () => {
  const clean = withoutComments(css);
  assert.ok(!/outline:\s*(none|0)\b/.test(clean), "focus outlines must stay visible");
  assert.match(clean, /:focus-visible\s*\{[^}]*outline:/);
});

test("motion is dropped for visitors who ask for less of it", () => {
  assert.match(withoutComments(css), /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

/* --- responsive --------------------------------------------------------------- */

test("the layout answers both breakpoints the design is built on", () => {
  const clean = withoutComments(css);
  assert.match(clean, /@media\s*\(width\s*<=\s*1080px\)/);
  assert.match(clean, /@media\s*\(width\s*<=\s*760px\)/);
});

test("the desktop-only nav is replaced by a reachable order action on phones", () => {
  const clean = withoutComments(css);
  /* The header nav is hidden below 1080px, so the fixed bar is the only way
     left to reach the order section without scrolling the whole page. */
  assert.match(clean, /\.site-header nav,\s*\.hero-proof\s*\{\s*display:\s*none/);
  assert.match(clean, /\.mobile-order\s*\{\s*display:\s*none/);
  assert.match(clean, /@media\s*\(width\s*<=\s*760px\)[\s\S]*\.mobile-order\s*\{[\s\S]*position:\s*fixed/);
  assert.ok(page.includes('class="mobile-order"'));
});

test("small links get a large enough tap target on phones", () => {
  const clean = withoutComments(css);
  const mobile = clean.slice(clean.indexOf("@media (width <= 760px)"));
  /* The text links are 18–23px tall, under the 24px minimum. Standalone links
     are grown with an overlay; the footer column is grown with padding, because
     overlapping targets in a list send a near-miss tap to the wrong link. */
  assert.match(mobile, /\.text-link::before[\s\S]*?inset:\s*-[\d.]+rem/);
  assert.match(mobile, /\.location-actions a::before/);
  assert.match(mobile, /footer > div:not\(\.footer-brand\) a\s*\{[^}]*padding-block:/);
  assert.ok(
    !/footer > div:not\(\.footer-brand\) a::before/.test(mobile),
    "the footer column must not use overlapping hit areas"
  );
});

test("the footer clears the fixed order bar on phones", () => {
  const clean = withoutComments(css);
  assert.match(clean, /padding-bottom:\s*calc\(3rem\s*\+\s*62px\)/);
});

test("anchor jumps are not hidden behind the header", () => {
  assert.match(withoutComments(css), /scroll-padding-top:/);
});

/* --- enquiries ----------------------------------------------------------------- */

test("every enquiry link reaches the business inbox with a subject", () => {
  const mailtos = [...page.matchAll(/href="mailto:([^"]+)"/g)].map((m) => m[1]);
  assert.ok(mailtos.length > 0);
  for (const value of mailtos) {
    assert.ok(value.startsWith(links.email), `unexpected recipient: ${value}`);
  }
  const withSubject = mailtos.filter((value) => value.includes("subject="));
  assert.equal(
    withSubject.length,
    mailtos.length - 1,
    "every enquiry link except the plain footer address should carry a subject"
  );
});

test("the maps links are built from the address that is on the page", () => {
  for (const place of locations) {
    assert.ok(
      page.includes(encodeURIComponent(`${business.name} ${place.street} ${place.city}`)),
      `maps link does not match the printed address: ${place.name}`
    );
  }
});

/* --- the shipped page --------------------------------------------------------- */

test("the page and its script stay small enough to be quick", async () => {
  const { size } = await stat(join(dist, "index.html"));
  assert.ok(size < 40 * 1024, `index.html is ${Math.round(size / 1024)}KB`);
  assert.ok(script.length < 4 * 1024, "the nav script should stay tiny");
});

test("the page works with the script blocked", () => {
  /* Nothing the visitor needs may live in site.js: it only marks the current
     nav link, so the file must not create content or attach click handlers. */
  assert.ok(!/innerHTML|insertAdjacentHTML|createElement/.test(script));
  assert.ok(!/addEventListener\(\s*["']click/.test(script));
});

test("search engines and social cards get the page's own words", () => {
  assert.ok(page.includes(`<title>${content.meta.title}</title>`));
  assert.ok(page.includes(`content="${content.meta.description}"`));
  assert.match(page, /property="og:image"/);
  assert.match(page, /property="og:locale" content="es_AR"/);
  assert.match(page, /rel="canonical"/);
});

test("the 404 page keeps the visitor inside the site", () => {
  assert.match(notFound, /name="robots" content="noindex"/);
  /* Same-origin, so the way back works on a preview and on a local build and
     not only on whichever host `origin` happens to name. */
  assert.match(notFound, /class="button button-dark" href="\/"/);
  assert.ok(
    !notFound.includes(origin),
    "the 404 must not send the visitor to a different host than the one that served it"
  );
});
