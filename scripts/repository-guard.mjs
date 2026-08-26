#!/usr/bin/env node

// Project-owned repository safety guard.
//
// It answers one question: does this repository track anything that should never
// be committed, and does every workflow keep the least-privilege shape? It knows
// nothing about releases, locks, manifests or an upstream baseline, and there is
// no automatic upstream that can rewrite it.

import { lstatSync, readFileSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REQUIRED_FILES = [
  ".gitignore",
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
  // The immutable verifier that makes the guard enforceable. Removing it would
  // leave later pull requests with no trusted check at all, so the trusted
  // policy refuses a tree that does not carry it.
  ".github/workflows/trusted-repository-guard.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "package.json",
  "scripts/repository-guard.mjs",
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

// CI checks out the trusted copy of this guard into `.guard-trusted/` so that a
// pull request cannot weaken the policy judging it. Those files belong to the
// default branch, not to the proposed tree, so they are never scanned — but
// nothing may smuggle a tracked file into that path either.
const TRUSTED_GUARD_PREFIX = ".guard-trusted/";

function gitFiles(root, ...selectors) {
  const result = spawnSync("git", ["ls-files", ...selectors, "-z"], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git ls-files failed");
  return result.stdout.split("\0").filter(Boolean);
}

function repositoryFiles(root) {
  const cached = gitFiles(root, "--cached");
  const files = gitFiles(root, "--cached", "--others", "--exclude-standard").filter(
    (file) => !file.startsWith(TRUSTED_GUARD_PREFIX)
  );
  return {
    files,
    tracked: new Set(cached),
    trustedGuardPathsTracked: cached.filter((file) => file.startsWith(TRUSTED_GUARD_PREFIX))
  };
}

function looksBinary(buffer) {
  return buffer.subarray(0, Math.min(buffer.length, 8192)).includes(0);
}

// Workflow reading. There is no YAML parser here and this repository has no
// dependencies, so the reader never assumes a shape: indentation is derived
// from the document, keys are matched in every spelling YAML allows, and
// anything left unclassified is reported rather than passed over. `null` means
// "unreadable", never "empty".

// A trailing comment on a structural line. Values this reader accepts never
// contain " #", so removing it is safe at the sites that use it.
function strip(content) {
  return content.replace(/\s+#.*$/, "").trim();
}

// `key:`, `'key':` and `"key":` are the same key.
function keyOf(content) {
  const match = strip(content).match(/^(?:([A-Za-z0-9_-]+)|'([^']+)'|"([^"]+)"):(.*)$/);
  if (!match) return null;
  return { name: match[1] ?? match[2] ?? match[3], value: match[4].trim() };
}

// YAML features this reader does not implement. A workflow using one is
// unreadable rather than assumed safe.
const UNSUPPORTED_YAML = [
  [/^\s*<<\s*:/, "merge key"],
  [/(?:^|\s)&[A-Za-z0-9_-]+\s*$/, "anchor"],
  [/(?:^|\s)\*[A-Za-z0-9_-]+\s*$/, "alias"]
];

function lineModel(text) {
  return text.split("\n").map((raw) => {
    const line = raw.replace(/\s+$/, "");
    const content = line.replace(/^[ \t]*/, "");
    const indentText = line.slice(0, line.length - content.length);
    return {
      content,
      indent: indentText.length,
      tabbed: indentText.includes("\t"),
      skip: content === "" || content.startsWith("#")
    };
  });
}

function readable(model) {
  return !model.some(
    (entry) =>
      !entry.skip &&
      (entry.tabbed || UNSUPPORTED_YAML.some(([pattern]) => pattern.test(entry.content)))
  );
}

// The block under `model[index]`: where its children start, how deep they are,
// and where the block ends. `childIndent === null` means the key has no block.
function childBlock(model, index) {
  const parentIndent = model[index].indent;
  let childIndent = null;
  let end = model.length;
  for (let i = index + 1; i < model.length; i += 1) {
    if (model[i].skip) continue;
    if (model[i].indent <= parentIndent) {
      end = i;
      break;
    }
    if (childIndent === null) childIndent = model[i].indent;
  }
  return { childIndent, end };
}

function topLevelKey(model, name) {
  return model.findIndex(
    (entry) => !entry.skip && entry.indent === 0 && keyOf(entry.content)?.name === name
  );
}

const TRIGGER_NAME = /^[a-z_]+$/;

// The trigger names a workflow declares, or `null` when the `on:` section is
// written in a form this reader does not handle.
export function workflowTriggers(text) {
  const model = lineModel(text);
  if (!readable(model)) return null;

  const index = topLevelKey(model, "on");
  if (index === -1) return null;

  const inlineValue = keyOf(model[index].content).value;
  if (inlineValue) {
    if (TRIGGER_NAME.test(inlineValue)) return new Set([inlineValue]);
    const sequence = inlineValue.match(/^\[\s*([a-z_]+(?:\s*,\s*[a-z_]+)*)\s*\]$/);
    if (!sequence) return null;
    return new Set(sequence[1].split(",").map((name) => name.trim()));
  }

  const { childIndent, end } = childBlock(model, index);
  if (childIndent === null) return null;

  const triggers = new Set();
  for (let i = index + 1; i < end; i += 1) {
    const entry = model[i];
    if (entry.skip) continue;
    if (entry.indent > childIndent) continue; // options of a trigger already recorded
    const key = keyOf(entry.content);
    if (key && TRIGGER_NAME.test(key.name)) {
      triggers.add(key.name);
      continue;
    }
    const item = strip(entry.content).match(/^-[ ]+([a-z_]+)$/);
    if (item) {
      triggers.add(item[1]);
      continue;
    }
    return null;
  }
  return triggers;
}

// `pull_request` and `pull_request_target` execute the proposal's own workflow
// definition. Anything this reader cannot prove otherwise counts as reachable.
export function reachableFromPullRequest(text) {
  const triggers = workflowTriggers(text);
  if (!triggers) return true;
  return triggers.has("pull_request") || triggers.has("pull_request_target");
}

// Reads one `permissions:` value, block mapping or scalar. `null` means the
// value could not be read and the caller must refuse it.
function readPermissions(model, index) {
  const scalar = keyOf(model[index].content).value;
  if (scalar) {
    if (scalar === "{}") return [];
    if (/^(?:read-all|write-all)$/.test(scalar)) return [["all", scalar.replace("-all", "")]];
    return null;
  }

  const { childIndent, end } = childBlock(model, index);
  if (childIndent === null) return null;

  const entries = [];
  for (let i = index + 1; i < end; i += 1) {
    const entry = model[i];
    if (entry.skip) continue;
    if (entry.indent !== childIndent) return null;
    const key = keyOf(entry.content);
    if (!key || !/^[a-z-]+$/.test(key.name) || !/^[A-Za-z-]+$/.test(key.value)) return null;
    entries.push([key.name, key.value]);
  }
  return entries;
}

const UNREADABLE = { scope: "job", job: "(unreadable)", guard: "", entries: null };

// Every `permissions:` mapping in the file — the top-level one and each job's —
// with the job's `if:` guard, which decides whether a pull-request event can
// reach that job at all. `entries: null` marks a value that could not be read.
export function permissionBlocks(text) {
  const model = lineModel(text);
  if (!readable(model)) return [{ ...UNREADABLE, scope: "top", job: null }];

  const blocks = [];
  const topIndex = topLevelKey(model, "permissions");
  if (topIndex !== -1) {
    blocks.push({ scope: "top", job: null, guard: "", entries: readPermissions(model, topIndex) });
  }

  const jobsIndex = topLevelKey(model, "jobs");
  if (jobsIndex === -1) return blocks;
  if (keyOf(model[jobsIndex].content).value) {
    blocks.push({ ...UNREADABLE });
    return blocks;
  }

  const { childIndent: jobIndent, end: jobsEnd } = childBlock(model, jobsIndex);
  if (jobIndent === null) return blocks;

  for (let i = jobsIndex + 1; i < jobsEnd; i += 1) {
    const entry = model[i];
    if (entry.skip || entry.indent !== jobIndent) continue;
    const jobKey = keyOf(entry.content);
    if (!jobKey || jobKey.value) {
      blocks.push({ ...UNREADABLE });
      continue;
    }

    const { childIndent: keyIndent, end: jobEnd } = childBlock(model, i);
    if (keyIndent === null) continue;

    let guard = "";
    const permissionLines = [];
    let unclassified = false;
    for (let j = i + 1; j < jobEnd; j += 1) {
      const inner = model[j];
      if (inner.skip || inner.indent !== keyIndent) continue;
      const key = keyOf(inner.content);
      if (!key) {
        // A field of the job this reader cannot name might be `permissions`
        // spelled a way it does not know, so it refuses to look away.
        if (/permissions/.test(inner.content)) unclassified = true;
        continue;
      }
      if (key.name === "permissions") permissionLines.push(j);
      if (key.name !== "if") continue;
      guard = key.value;
      for (let k = j + 1; k < jobEnd && (model[k].skip || model[k].indent > keyIndent); k += 1) {
        if (!model[k].skip) guard += ` ${model[k].content}`;
      }
    }

    if (unclassified) blocks.push({ ...UNREADABLE, job: jobKey.name });
    for (const line of permissionLines) {
      blocks.push({ scope: "job", job: jobKey.name, guard, entries: readPermissions(model, line) });
    }
  }
  return blocks;
}

// A job is exempt only when its condition provably cannot hold for a
// pull-request event: no negation of any kind, no disjunction, no mention of
// pull_request, and at least one plain `github.event_name ==` test for another
// event. Anything more involved is left unexempt rather than reasoned about.
export function unreachableFromPullRequest(guard) {
  if (!guard) return false;
  const condition = guard
    .trim()
    .replace(/^[|>][-+]?[ ]*/, "")
    .replace(/^\$\{\{[ ]*/, "")
    .replace(/[ ]*\}\}$/, "")
    .trim();
  if (!condition) return false;
  if (condition.includes("!") || condition.includes("||")) return false;
  if (/\bpull_request\b/.test(condition) || /\bpull_request_target\b/.test(condition)) return false;
  return condition
    .split("&&")
    .some((part) => /^github\.event_name[ ]*==[ ]*'[a-z_]+'$/.test(part.trim()));
}

// Every action a workflow uses, in any spelling of the `uses` key.
export function workflowActions(text) {
  const actions = [];
  for (const entry of lineModel(text)) {
    if (entry.skip) continue;
    const key = keyOf(entry.content.replace(/^-[ ]+/, ""));
    if (key?.name !== "uses" || !key.value) continue;
    actions.push(key.value.replace(/^["']|["']$/g, ""));
  }
  return actions;
}

export function validateWorkflowText(path, text) {
  const failures = [];
  if (/\bpull_request_target\b/.test(text)) {
    failures.push(`High-risk pull_request_target trigger in ${path}`);
  }

  const blocks = permissionBlocks(text);
  if (!blocks.some((block) => block.scope === "top")) {
    failures.push(`Workflow must declare top-level permissions: ${path}`);
  }

  // `pull_request` runs the proposal's own workflow definition. Any write scope
  // it can reach hands a write-capable token to proposed code, so granular
  // grants are refused there just as `write-all` is. Events that always execute
  // the default branch's definition — workflow_run, issue_comment,
  // pull_request_review, schedule, workflow_dispatch — may hold write scopes.
  const proposed = reachableFromPullRequest(text);
  for (const block of blocks) {
    const where = block.scope === "top" ? "top-level" : `job ${block.job}`;
    if (block.entries === null) {
      failures.push(
        `Workflow permissions could not be read in ${path} (${where}); ` +
          `write them as plain "scope: value" lines`
      );
      continue;
    }
    for (const [scope, value] of block.entries) {
      if (!/^(write|write-all)$/.test(value)) continue;
      if (scope === "all") {
        failures.push(`Workflow may not use write-all permissions: ${path} (${where})`);
        continue;
      }
      if (!proposed) continue;
      if (block.scope === "job" && unreachableFromPullRequest(block.guard)) continue;
      failures.push(
        `Write permission ${scope}: ${value} is reachable from proposed ` +
          `pull-request code in ${path} (${where})`
      );
    }
  }

  for (const action of workflowActions(text)) {
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

  const { files, tracked, trustedGuardPathsTracked } = repositoryFiles(root);
  for (const path of trustedGuardPathsTracked) {
    failures.push(`The trusted guard checkout path is reserved and may not be tracked: ${path}`);
  }

  // Presence alone is not enough. A directory, a symlink or an untracked local
  // file would all satisfy `existsSync`, so a proposal could replace a required
  // workflow with a directory of the same name and keep the guard quiet while
  // GitHub stops seeing the workflow at all.
  for (const path of REQUIRED_FILES) {
    const stat = lstatSync(join(root, path), { throwIfNoEntry: false });
    if (!tracked.has(path) || !stat) {
      failures.push(`Missing required repository file: ${path}`);
      continue;
    }
    if (!stat.isFile()) {
      failures.push(`Required repository path must be a regular file: ${path}`);
    }
  }

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
