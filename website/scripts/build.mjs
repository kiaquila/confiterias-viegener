#!/usr/bin/env node
/* Static build for the Confiterías Viegener landing.

   Renders the page and a 404, concatenates the stylesheet layers in order,
   and copies scripts and images into dist/. No framework runtime and no
   network access at build or at run time. */

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import { images, origin as ORIGIN, unverifiedSections } from "../src/content.js";
import { renderNotFound, renderPage } from "../src/render.js";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

/* Order matters: later layers are expected to win, so a section's own media
   query can override the generic frame. */
const STYLE_ORDER = [
  "tokens.css",
  "base.css",
  "layout.css",
  "components.css",
  "sections.css"
];

async function buildStylesheet() {
  const parts = [];
  for (const name of STYLE_ORDER) {
    parts.push(await readFile(join(root, "src/styles", name), "utf8"));
  }
  return parts.join("\n");
}

/** Every width the markup references has to exist as both WebP and JPEG, or a
 *  visitor gets a broken slot in whichever format their browser picked. */
function checkImageAssets() {
  const missing = [];
  for (const [name, config] of Object.entries(images)) {
    for (const width of config.widths) {
      for (const extension of ["webp", "jpg"]) {
        const file = `${name}-${width}.${extension}`;
        if (!existsSync(join(root, "assets", file))) missing.push(file);
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing image assets (${missing.length}):\n  ${missing.join("\n  ")}\n` +
        "Run `npm run images` after putting the source photos in assets/source/."
    );
  }
}

/* Working files that live beside the photographs but are not part of what a
   visitor receives: `source/` holds the full-size originals the optimiser
   reads, and README.md is the licence and provenance register, which records
   what is still unresolved about these images. */
const NOT_SHIPPED = new Set(["source", "README.md"]);

async function copyAssets() {
  const from = join(root, "assets");
  await cp(from, join(dist, "assets"), {
    recursive: true,
    /* Matched per path segment relative to assets/. A substring test on the
       absolute path excludes anything merely *starting* with the name, so
       `assets/source-notes.md` would silently vanish too. Dotted entries are
       local tooling state and never ship. */
    filter: (path) =>
      !relative(from, path)
        .split(sep)
        .filter(Boolean)
        .some((part) => NOT_SHIPPED.has(part) || part.startsWith("."))
  });
}

/** Every local file the built pages point at has to exist in dist/.
 *
 *  `checkImageAssets` only knows about the slots declared in `images`, so it
 *  could not see a favicon, a touch icon or an OG image referenced straight
 *  from the document head — three of those shipped as 404s, and the OG one
 *  would have broken every link preview. This reads the rendered HTML instead,
 *  so it covers any reference however it got there. */
async function checkRenderedAssets() {
  const missing = new Set();
  for (const page of ["index.html", "404.html"]) {
    const html = await readFile(join(dist, page), "utf8");
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
    /* `content` is only a URL on the social-image tags; on every other meta it
       is prose, which is why this is not matched attribute-wide. */
    for (const [tag] of html.matchAll(/<meta[^>]+>/g)) {
      if (!/(?:property|name)="[^"]*image[^"]*"/.test(tag)) continue;
      const value = tag.match(/content="([^"]+)"/);
      if (value) references.push(value[1]);
    }
    for (const url of references) {
      if (/^(?:https?:|mailto:|tel:|#|data:)/.test(url)) continue;
      const path = url.replace(/^\//, "").split(/[?#]/)[0];
      if (!path) continue;
      if (!existsSync(join(dist, path))) missing.add(`${page} → ${url}`);
    }
    for (const [, url] of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const candidate of url.split(",")) {
        const path = candidate.trim().split(/\s+/)[0];
        if (path && !existsSync(join(dist, path.replace(/^\//, "")))) {
          missing.add(`${page} → ${path}`);
        }
      }
    }
  }
  if (missing.size > 0) {
    throw new Error(
      `The build references files it does not ship (${missing.size}):\n  ` +
        [...missing].join("\n  ")
    );
  }
}

/** Names the blocks whose factual content the client has not confirmed, so an
 *  unapproved claim cannot quietly reach a customer-facing stage unnoticed. */
function reportUnverified() {
  if (unverifiedSections.length === 0) return;
  console.warn(
    `\n  ! Concept copy the client has not approved: ${unverifiedSections.join(", ")}\n` +
      "    Confirm the wording, hours, addresses and phone numbers before this\n" +
      "    is shown to a customer, then clear the `unverified` flags.\n"
  );
}

async function main() {
  checkImageAssets();

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  await writeFile(join(dist, "index.html"), renderPage(ORIGIN), "utf8");
  await writeFile(join(dist, "404.html"), renderNotFound(), "utf8");

  await copyAssets();
  await writeFile(join(dist, "assets/styles.css"), await buildStylesheet(), "utf8");

  for (const file of await readdir(join(root, "src/js"))) {
    if (file.endsWith(".js")) {
      await cp(join(root, "src/js", file), join(dist, "assets", file));
    }
  }

  /* An unapproved concept is not offered to crawlers at all, and it ships no
     sitemap inviting them in: the page carries a real business's name and
     unconfirmed phone numbers. Both flip together with the last `unverified`
     flag in content.js. */
  if (unverifiedSections.length > 0) {
    await writeFile(join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");
  } else {
    await writeFile(
      join(dist, "robots.txt"),
      `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`,
      "utf8"
    );
    await writeFile(
      join(dist, "sitemap.xml"),
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        `  <url><loc>${ORIGIN}/</loc></url>\n` +
        "</urlset>\n",
      "utf8"
    );
  }

  await checkRenderedAssets();

  console.log("Built the Confiterías Viegener landing into dist/.");
  reportUnverified();
}

await main();
