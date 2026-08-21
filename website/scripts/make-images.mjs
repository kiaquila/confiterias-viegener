#!/usr/bin/env node
/* Regenerates the shipped image derivatives from the originals.

   This is a local maintenance tool, not part of `npm run check`: the derived
   files are committed, so CI never needs ImageMagick. Put the full-size
   originals in assets/source/<slot>.<ext> — one per slot in `images` — and run
   `npm run images`. Each slot ships as WebP with a JPEG fallback at every
   width the markup references. */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

import { images } from "../src/content.js";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const sourceDir = join(root, "assets", "source");
const outDir = join(root, "assets");

const QUALITY = { webp: 78, jpg: 82 };
const JPEG_BUDGET = "320kb";

async function findSource(slot, entries) {
  const match = entries.find((name) => name.replace(/\.[^.]+$/, "") === slot);
  if (!match) {
    throw new Error(
      `No original for "${slot}" in assets/source/. Expected ${slot}.<jpg|png|webp>.`
    );
  }
  return join(sourceDir, match);
}

async function verifyApprovedSource(slot, source, manifest) {
  const approved = manifest.images?.[slot];
  if (!approved) {
    throw new Error(`No approved source manifest entry for "${slot}".`);
  }
  if (basename(source) !== approved.file) {
    throw new Error(
      `Source file mismatch for "${slot}": expected ${approved.file}, found ${basename(source)}.`
    );
  }

  const digest = createHash("sha256").update(await readFile(source)).digest("hex");
  if (digest !== approved.sha256) {
    throw new Error(
      `Source hash mismatch for "${slot}". Refusing to generate derivatives from an unapproved file.`
    );
  }
}

async function verifySourceWidth(slot, source, widths) {
  const { stdout } = await run("magick", ["identify", "-format", "%w", source]);
  const sourceWidth = Number.parseInt(stdout, 10);
  const maximumWidth = Math.max(...widths);
  if (!Number.isFinite(sourceWidth) || sourceWidth < maximumWidth) {
    throw new Error(
      `Original for "${slot}" is ${sourceWidth || "an unknown number of"}px wide, ` +
        `but its largest responsive descriptor is ${maximumWidth}w.`
    );
  }
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
  const manifest = JSON.parse(await readFile(join(sourceDir, "manifest.json"), "utf8"));
  let written = 0;

  for (const [slot, config] of Object.entries(images)) {
    const source = await findSource(slot, entries);
    await verifyApprovedSource(slot, source, manifest);
    await verifySourceWidth(slot, source, config.widths);
    for (const width of config.widths) {
      for (const extension of ["webp", "jpg"]) {
        const target = join(outDir, `${slot}-${width}.${extension}`);
        const args = [
          source,
          "-auto-orient",
          "-resize",
          `${width}x>`,
          "-strip",
          "-quality",
          String(QUALITY[extension])
        ];
        if (extension === "jpg") {
          args.push("-define", `jpeg:extent=${JPEG_BUDGET}`);
        }
        args.push(target);
        await run("magick", args);
        written += 1;
      }
    }
  }

  console.log(`Wrote ${written} image derivatives into assets/.`);
}

await main();
