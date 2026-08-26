import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { validateWorkflowText } from "../scripts/repository-guard.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const guardScript = join(repositoryRoot, "scripts/repository-guard.mjs");
const checkoutSha = "3d3c42e5aac5ba805825da76410c181273ba90b1";

function write(root, path, contents = "placeholder\n") {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "confiterias-guard-"));
  for (const path of [
    ".gitignore",
    ".github/CODEOWNERS",
    ".github/pull_request_template.md",
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "package.json",
    "tests/repository-guard.test.mjs",
    "third-party-notices.md",
    "website/package.json",
    "website/wrangler.json"
  ]) write(root, path);
  cpSync(guardScript, join(root, "scripts/repository-guard.mjs"));

  for (const name of ["ci", "trusted-repository-guard"]) {
    write(root, `.github/workflows/${name}.yml`, [
      `name: ${name}`,
      "on: push",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  check:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      `      - uses: actions/checkout@${checkoutSha}`,
      ""
    ].join("\n"));
  }

  git(root, "init", "-q");
  git(root, "add", "-A");
  return root;
}

function runGuard(root) {
  return spawnSync(process.execPath, [guardScript, "--root", root], { encoding: "utf8" });
}

function withFixture(run) {
  const root = makeFixture();
  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts a minimal conforming repository", () => {
  withFixture((root) => {
    const result = runGuard(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Repository guard passed/);
  });
});

test("requires the project's own context and workflow files", () => {
  withFixture((root) => {
    rmSync(join(root, "AGENTS.md"));
    rmSync(join(root, "website/wrangler.json"));
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing required repository file: AGENTS\.md/);
    assert.match(result.stderr, /Missing required repository file: website\/wrangler\.json/);
  });
});

test("rejects secrets, personal paths, and local environment files", () => {
  withFixture((root) => {
    write(root, "website/token.txt", `ghp_${"A".repeat(32)}\n`);
    write(root, "website/path.txt", ["", "Users", "example", "private", "file.txt"].join("/") + "\n");
    write(root, "website/.env", "SECRET=placeholder\n");
    git(root, "add", "-f", "website/.env", "website/path.txt", "website/token.txt");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible GitHub token/);
    assert.match(result.stderr, /Personal absolute path/);
    assert.match(result.stderr, /Sensitive or local-only file/);
  });
});

test("rejects generated output and dependency directories", () => {
  withFixture((root) => {
    write(root, "website/dist/index.html");
    write(root, "website/node_modules/package/index.js");
    git(root, "add", "-f", "website/dist/index.html", "website/node_modules/package/index.js");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /website\/dist\/index\.html/);
    assert.match(result.stderr, /website\/node_modules\/package\/index\.js/);
  });
});

test("requires safe workflow triggers, permissions, and pinned actions", () => {
  withFixture((root) => {
    const path = join(root, ".github/workflows/ci.yml");
    const workflow = readFileSync(path, "utf8")
      .replace("on: push", "on: pull_request_target")
      .replace("permissions:\n  contents: read\n", "")
      .replace(checkoutSha, "v4");
    writeFileSync(path, workflow);
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pull_request_target/);
    assert.match(result.stderr, /top-level permissions/);
    assert.match(result.stderr, /not pinned to a full commit SHA/);
  });
});

test("ignores the trusted guard checkout but refuses to let it be tracked", () => {
  withFixture((root) => {
    write(root, ".guard-trusted/scripts/repository-guard.mjs", "// trusted copy\n");
    write(root, ".guard-trusted/token.txt", `ghp_${"A".repeat(32)}\n`);
    const ignored = runGuard(root);
    assert.equal(ignored.status, 0, ignored.stderr);

    git(root, "add", "-f", ".guard-trusted/token.txt");
    const tracked = runGuard(root);
    assert.equal(tracked.status, 1);
    assert.match(tracked.stderr, /trusted guard checkout path is reserved/);
  });
});

test("an immutable workflow_run job judges the head with the default branch's guard", () => {
  const workflow = readFileSync(
    join(repositoryRoot, ".github/workflows/trusted-repository-guard.yml"),
    "utf8"
  );
  // `workflow_run` always executes the default branch's copy, so a pull request
  // that edits ci.yml cannot remove this check.
  assert.match(workflow, /^on:\n\s+workflow_run:/m);
  assert.match(workflow, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
  assert.match(
    workflow,
    /node "\$GITHUB_WORKSPACE\/scripts\/repository-guard\.mjs" \\\n\s+--root "\$GITHUB_WORKSPACE\/\.guard-proposed"/
  );
  // Fails closed when the completed run is no longer the pull request's head.
  assert.match(workflow, /RUN_HEAD_SHA" != "\$ASSOCIATED_HEAD_SHA"/);
  assert.match(workflow, /-f name=trusted-repository-guard/);
  assert.match(workflow, /-f head_sha="\$HEAD_SHA"/);
});

test("rejects write-all workflow permissions", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    "on: push\npermissions: write-all\njobs:\n  test:\n    steps:\n      - run: true\n"
  );
  assert.match(failures.join("\n"), /may not use write-all permissions/);
});

test("allows an environment example with placeholders", () => {
  withFixture((root) => {
    write(root, "website/.env.example", "API_KEY=replace-me\n");
    git(root, "add", "-f", "website/.env.example");
    const result = runGuard(root);
    assert.equal(result.status, 0, result.stderr);
  });
});
