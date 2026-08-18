#!/usr/bin/env node
/* Regenerates the shipped image derivatives from the originals.

   This is a local maintenance tool, not part of `npm run check`: the derived
   files are committed, so CI never needs ImageMagick. Put the full-size
   originals in assets/source/<slot>.<ext> — one per slot in `images` — and run
   `npm run images`. Each slot ships as WebP with a JPEG fallback at every
   width the markup references. */

import { execFile } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { images } from "../src/content.js";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const sourceDir = join(root, "assets", "source");
const outDir = join(root, "assets");

const QUALITY = { webp: 78, jpg: 82 };

async function findSource(slot, entries) {
  const match = entries.find((name) => name.replace(/\.[^.]+$/, "") === slot);
  if (!match) {
    throw new Error(
      `No original for "${slot}" in assets/source/. Expected ${slot}.<jpg|png|webp>.`
    );
  }
  return join(sourceDir, match);
}

async function main() {
  try {
    await run("magick", ["-version"]);
  } catch {
    throw new Error(
      "ImageMagick (`magick`) is required to regenerate the images. " +
        "The derivatives are committed, so this is only needed when a photo changes."
    );
  }

  const entries = await readdir(sourceDir);
  let written = 0;

  for (const [slot, config] of Object.entries(images)) {
    const source = await findSource(slot, entries);
    for (const width of config.widths) {
      for (const extension of ["webp", "jpg"]) {
        const target = join(outDir, `${slot}-${width}.${extension}`);
        await run("magick", [
          source,
          "-auto-orient",
          "-resize",
          `${width}x>`,
          "-strip",
          "-quality",
          String(QUALITY[extension]),
          target
        ]);
        written += 1;
      }
    }
  }

  console.log(`Wrote ${written} image derivatives into assets/.`);
}

await main();
