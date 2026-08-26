#!/usr/bin/env node

// Project-owned repository safety guard.
//
// It answers one question: does this repository track anything that should never
// be committed, and does every workflow keep the least-privilege shape? It knows
// nothing about releases, locks, manifests or an upstream baseline, and there is
// no automatic upstream that can rewrite it.

import { existsSync, lstatSync, readFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REQUIRED_FILES = [
  ".gitignore",
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "package.json",
  "scripts/check-repository.mjs",
  "tests/repository-guard.test.mjs",
  "third-party-notices.md",
  "website/package.json",
  "website/wrangler.json"
];

const FORBIDDEN_SEGMENTS = new Set([
  ".next",
  ".vinext",
  ".wrangler",
  "coverage",
  "dist",
  "node_modules"
]);

const FORBIDDEN_NAMES = [
  /^\.DS_Store$/,
  /^\.env(?:\..+)?$/,
  /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/,
  /\.(?:key|p12|pfx|pem|session)$/i
];

const SECRET_PATTERNS = [
  ["private key", /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/],
  ["GitHub token", /gh[pousr]_[A-Za-z0-9]{20,}/],
  ["OpenAI-style API key", /sk-[A-Za-z0-9_-]{32,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Telegram bot token", /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/]
];

const PERSONAL_PATH_PATTERNS = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/
];

function parseRoot(argv) {
  const index = argv.indexOf("--root");
  if (index === -1) return resolve(import.meta.dirname, "..");
  if (!argv[index + 1]) throw new Error("--root requires a path");
  return resolve(argv[index + 1]);
}

function repositoryFiles(root) {
  const result = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" }
  );
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git ls-files failed");
  return result.stdout.split("\0").filter(Boolean);
}

function looksBinary(buffer) {
  return buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
}

export function validateWorkflowText(path, text) {
  const failures = [];
  if (/\bpull_request_target\b/.test(text)) {
    failures.push(`High-risk pull_request_target trigger in ${path}`);
  }
  if (!/^permissions:\s*(?:\n|$)/m.test(text)) {
    failures.push(`Workflow must declare top-level permissions: ${path}`);
  }
  if (/^permissions:\s*["']?write-all["']?\s*$/m.test(text)) {
    failures.push(`Workflow may not use write-all permissions: ${path}`);
  }
  for (const match of text.matchAll(/^\s*-?\s*uses:\s*["']?([^\s"']+)["']?\s*(?:#.*)?$/gm)) {
    const action = match[1];
    if (action.startsWith("./") || action.startsWith("docker://")) continue;
    const ref = action.slice(action.lastIndexOf("@") + 1);
    if (!/^[a-f0-9]{40}$/.test(ref)) {
      failures.push(`GitHub Action is not pinned to a full commit SHA in ${path}: ${action}`);
    }
  }
  return failures;
}

export function scanRepository(root) {
  const failures = [];

  for (const path of REQUIRED_FILES) {
    if (!existsSync(join(root, path))) failures.push(`Missing required repository file: ${path}`);
  }

  const files = repositoryFiles(root);

  for (const file of files) {
    const normalized = file.split(sep).join("/");
    const parts = normalized.split("/");
    const name = basename(normalized);

    if (parts.some((part) => FORBIDDEN_SEGMENTS.has(part))) {
      failures.push(`Generated or dependency directory is tracked: ${normalized}`);
    }
    if (FORBIDDEN_NAMES.some((pattern) => pattern.test(name)) && name !== ".env.example") {
      failures.push(`Sensitive or local-only file is tracked: ${normalized}`);
    }

    const absolute = join(root, file);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch {
      failures.push(`Repository path is missing from the worktree: ${normalized}`);
      continue;
    }
    if (stat.isSymbolicLink()) {
      failures.push(`Symbolic links are not allowed: ${normalized}`);
      continue;
    }
    if (!stat.isFile() || stat.size > 2_000_000) continue;

    const buffer = readFileSync(absolute);
    if (looksBinary(buffer)) continue;
    const text = buffer.toString("utf8");

    for (const [label, pattern] of SECRET_PATTERNS) {
      if (pattern.test(text)) failures.push(`Possible ${label} in ${normalized}`);
    }
    if (PERSONAL_PATH_PATTERNS.some((pattern) => pattern.test(text))) {
      failures.push(`Personal absolute path in ${normalized}`);
    }
    if (/^\.github\/workflows\/[^/]+\.ya?ml$/.test(normalized)) {
      failures.push(...validateWorkflowText(normalized, text));
    }
  }

  return { failures, files };
}

export function main(argv = process.argv.slice(2)) {
  const { failures, files } = scanRepository(parseRoot(argv));
  if (failures.length) {
    console.error("Repository guard failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    return 1;
  }
  console.log(`Repository guard passed for ${files.length} tracked paths.`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exitCode = main();
