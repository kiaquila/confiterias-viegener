import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  permissionBlocks,
  scanRepository,
  workflowActions,
  workflowJobNames,
  reachableFromPullRequest,
  unreachableFromPullRequest,
  validateWorkflowText,
  workflowTriggers
} from "../scripts/repository-guard.mjs";

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

  for (const [file, name] of [
    ["ci", "Project CI"],
    ["trusted-repository-guard", "Trusted Repository Guard"]
  ]) {
    write(root, `.github/workflows/${file}.yml`, [
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

function workflow(lines) {
  return `${lines.join("\n")}\n`;
}

test("a required path must be a tracked regular file, not merely present", () => {
  withFixture((root) => {
    // A directory of the same name satisfies existsSync while GitHub stops
    // seeing the workflow at all.
    rmSync(join(root, ".github/workflows/trusted-repository-guard.yml"));
    write(root, ".github/workflows/trusted-repository-guard.yml/placeholder.txt");
    git(root, "add", "-A");
    const replaced = runGuard(root);
    assert.equal(replaced.status, 1);
    assert.match(
      replaced.stderr,
      /Missing required repository file: \.github\/workflows\/trusted-repository-guard\.yml/
    );
  });
});

test("a required path present but untracked does not satisfy the guard", () => {
  withFixture((root) => {
    git(root, "rm", "--cached", "-q", "AGENTS.md");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Missing required repository file: AGENTS\.md/);
  });
});

test("granular write permissions are refused on pull-request workflows", () => {
  const text = workflow([
    "name: example",
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: write",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      checks: write",
    "    steps:",
    "      - run: true"
  ]);
  const failures = validateWorkflowText(".github/workflows/example.yml", text);
  assert.match(failures.join("\n"), /Write permission contents: write is reachable.*top-level/);
  assert.match(failures.join("\n"), /Write permission checks: write is reachable.*job build/);
});

test("write permissions stay allowed where proposed code never runs", () => {
  const trusted = workflow([
    "name: example",
    "on:",
    "  workflow_run:",
    "    workflows:",
    "      - Project CI",
    "permissions:",
    "  contents: read",
    "  checks: write",
    "jobs:",
    "  verify:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: true"
  ]);
  assert.deepEqual(validateWorkflowText(".github/workflows/example.yml", trusted), []);

  // A job a pull-request event can never reach keeps its write scopes.
  const gated = workflow([
    "name: example",
    "on:",
    "  pull_request:",
    "  workflow_dispatch:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  dispatch:",
    "    if: github.event_name == 'workflow_dispatch'",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      checks: write",
    "    steps:",
    "      - run: true"
  ]);
  assert.deepEqual(validateWorkflowText(".github/workflows/example.yml", gated), []);
});

test("triggers and permission blocks are read from real workflow shapes", () => {
  assert.deepEqual([...workflowTriggers("on: push\n")], ["push"]);
  assert.deepEqual([...workflowTriggers("on: [push, pull_request]\n")], ["push", "pull_request"]);
  assert.deepEqual(
    [...workflowTriggers(workflow(["on:", "  pull_request:", "  schedule:", '    - cron: "0 6 * * 1"']))],
    ["pull_request", "schedule"]
  );

  const blocks = permissionBlocks(
    workflow([
      "permissions:",
      "  contents: read",
      "jobs:",
      "  one:",
      "    if: github.event_name == 'workflow_dispatch'",
      "    permissions:",
      "      checks: write"
    ])
  );
  assert.deepEqual(blocks.map((block) => [block.scope, block.job]), [
    ["top", null],
    ["job", "one"]
  ]);
  assert.match(blocks[1].guard, /workflow_dispatch/);
});

test("trigger syntax the parser cannot classify counts as pull-request reachable", () => {
  // YAML reads a bare `on` as a boolean, so quoting it is valid and common.
  assert.equal(reachableFromPullRequest(workflow(["'on': [pull_request]", "permissions:"])), true);
  assert.equal(reachableFromPullRequest(workflow(['"on": [push]', "permissions:"])), false);
  // A flow mapping is valid YAML this parser does not read: fail closed.
  assert.equal(workflowTriggers(workflow(["on: {pull_request: {}}"])), null);
  assert.equal(reachableFromPullRequest(workflow(["on: {pull_request: {}}"])), true);
  // No `on:` at all is equally unclassifiable.
  assert.equal(reachableFromPullRequest(workflow(["permissions:", "  contents: read"])), true);

  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    workflow([
      "on: {pull_request: {}}",
      "permissions:",
      "  contents: write",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      "      - run: true"
    ])
  );
  assert.match(failures.join("\n"), /Write permission contents: write is reachable/);
});

test("a permission mapping is read whole, comments and all", () => {
  const entries = permissionBlocks(
    workflow([
      "permissions:",
      "  actions: write",
      "  contents: read",
      "  # GITHUB_TOKEN needs this spelled out.",
      "",
      "  pull-requests: write # publish",
      "jobs:",
      "  build:"
    ])
  )[0].entries;
  assert.deepEqual(entries, [
    ["actions", "write"],
    ["contents", "read"],
    ["pull-requests", "write"]
  ]);
});

test("an unreadable permission mapping is refused, not silently skipped", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    workflow([
      "on:",
      "  pull_request:",
      "permissions:",
      "  contents: read",
      "  checks:",
      "    nested: write",
      "jobs:",
      "  build:"
    ])
  );
  assert.match(failures.join("\n"), /permissions could not be read .*top-level/);
});

test("a job is exempt only when its condition cannot hold for a pull request", () => {
  assert.equal(unreachableFromPullRequest("github.event_name == 'workflow_dispatch'"), true);
  // A disjunction that also admits pull_request must never be exempt.
  assert.equal(
    unreachableFromPullRequest(
      "github.event_name == 'workflow_dispatch' || github.event_name == 'pull_request'"
    ),
    false
  );
  assert.equal(unreachableFromPullRequest("github.event_name != 'pull_request'"), false);
  assert.equal(unreachableFromPullRequest("github.event.pull_request.draft == false"), false);
  assert.equal(unreachableFromPullRequest(""), false);

  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    workflow([
      "on:",
      "  pull_request:",
      "  workflow_dispatch:",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  either:",
      "    if: github.event_name == 'workflow_dispatch' || github.event_name == 'pull_request'",
      "    runs-on: ubuntu-latest",
      "    permissions:",
      "      checks: write",
      "    steps:",
      "      - run: true"
    ])
  );
  assert.match(failures.join("\n"), /Write permission checks: write is reachable.*job either/);
});

test("indentation is derived from the document, not assumed", () => {
  // YAML allows any consistent indent. A four-space `on:` mapping is valid.
  const deepTriggers = workflow(["on:", "    pull_request:", "permissions:", "  contents: write"]);
  assert.deepEqual([...workflowTriggers(deepTriggers)], ["pull_request"]);
  assert.equal(reachableFromPullRequest(deepTriggers), true);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", deepTriggers).join("\n"),
    /Write permission contents: write is reachable/
  );

  // So is a four-space `jobs:` mapping, whose job permissions must stay visible.
  const deepJobs = workflow([
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "    build:",
    "        runs-on: ubuntu-latest",
    "        permissions:",
    "            checks: write",
    "        steps:",
    "          - run: true"
  ]);
  const blocks = permissionBlocks(deepJobs);
  assert.deepEqual(blocks.map((block) => [block.scope, block.job]), [
    ["top", null],
    ["job", "build"]
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", deepJobs).join("\n"),
    /Write permission checks: write is reachable.*job build/
  );
});

test("scalar permissions are read at every scope", () => {
  const jobScalar = workflow([
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    permissions: write-all",
    "    steps:",
    "      - run: true"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", jobScalar).join("\n"),
    /may not use write-all permissions.*job build/
  );

  // A scalar the reader does not recognise is refused rather than ignored.
  assert.match(
    validateWorkflowText(
      ".github/workflows/example.yml",
      workflow(["on:", "  push:", "permissions: something-else"])
    ).join("\n"),
    /permissions could not be read/
  );

  // `read-all` and `{}` are read as the read-only forms they are.
  assert.deepEqual(
    validateWorkflowText(
      ".github/workflows/example.yml",
      workflow(["on:", "  pull_request:", "permissions: read-all"])
    ),
    []
  );
});

test("a negated guard never earns the exemption", () => {
  assert.equal(
    unreachableFromPullRequest("${{ !(github.event_name == 'workflow_dispatch') }}"),
    false
  );
  assert.equal(unreachableFromPullRequest("${{ github.event_name == 'workflow_run' }}"), true);

  const negated = workflow([
    "on:",
    "  pull_request:",
    "  workflow_dispatch:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  inverted:",
    "    if: ${{ !(github.event_name == 'workflow_dispatch') }}",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      checks: write",
    "    steps:",
    "      - run: true"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", negated).join("\n"),
    /Write permission checks: write is reachable.*job inverted/
  );
});

test("tab indentation is not guessed at", () => {
  assert.equal(workflowTriggers("on:\n\tpush:\n"), null);
  assert.equal(reachableFromPullRequest("on:\n\tpush:\n"), true);
});

test("keys are recognised in every spelling YAML allows", () => {
  // An inline comment on the jobs key must not hide the jobs beneath it.
  const commented = workflow([
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs: # workflow jobs",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    permissions:",
    "      contents: write",
    "    steps:",
    "      - run: true"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", commented).join("\n"),
    /Write permission contents: write is reachable.*job build/
  );

  // Neither may a quoted job-level permissions key.
  const quoted = workflow([
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    'permissions':",
    "      contents: write",
    "    steps:",
    "      - run: true"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", quoted).join("\n"),
    /Write permission contents: write is reachable.*job build/
  );

  // A quoted `uses` key still has to name a pinned action.
  assert.deepEqual(workflowActions(workflow(["    steps:", "      - 'uses': actions/checkout@v4"])), [
    "actions/checkout@v4"
  ]);
  assert.match(
    validateWorkflowText(
      ".github/workflows/example.yml",
      workflow([
        "on:",
        "  push:",
        "permissions:",
        "  contents: read",
        "jobs:",
        "  build:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - 'uses': actions/checkout@v4"
      ])
    ).join("\n"),
    /not pinned to a full commit SHA/
  );
});

test("an explicit mapping key is refused, however its name is spelled", () => {
  for (const key of ['    ? permissions', '    ? "permiss\\u0069ons"']) {
    const text = workflow([
      "on:",
      "  pull_request:",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      key,
      "    :",
      "      contents: write",
      "    steps:",
      "      - run: true"
    ]);
    assert.equal(reachableFromPullRequest(text), true);
    assert.match(
      validateWorkflowText(".github/workflows/example.yml", text).join("\n"),
      /permissions could not be read/,
      key
    );
  }
});

test("an escaped key is caught inside a sequence item too", () => {
  const text = workflow([
    "on:",
    "  push:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    '      - "us\\u0065s": actions/checkout@v4'
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", text).join("\n"),
    /permissions could not be read/
  );
});

test("a job field the reader cannot name is refused, not skipped", () => {
  const failures = validateWorkflowText(
    ".github/workflows/example.yml",
    workflow([
      "on:",
      "  pull_request:",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  build:",
      "    runs-on: ubuntu-latest",
      "    ? permissions",
      "    steps:",
      "      - run: true"
    ])
  );
  // The file-level refusal of explicit mapping keys fires first; either way the
  // job's write scope is never silently accepted.
  assert.match(failures.join("\n"), /permissions could not be read/);
});

test("the trusted check name and the workflow it keys off are reserved", () => {
  withFixture((root) => {
    // Renaming Project CI would stop the trusted verifier's workflow_run from
    // ever firing.
    const path = join(root, ".github/workflows/ci.yml");
    writeFileSync(path, readFileSync(path, "utf8").replace("name: Project CI", "name: Renamed CI"));
    git(root, "add", "-A");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /must stay named "Project CI"/);
  });

  // And a proposed job may not carry the trusted check's name, whether as its
  // key or as its display name.
  for (const job of ["  trusted-repository-guard:", "  spoof:\n    name: trusted-repository-guard"]) {
    const failures = validateWorkflowText(
      ".github/workflows/ci.yml",
      workflow([
        "name: Project CI",
        "on:",
        "  pull_request:",
        "permissions:",
        "  contents: read",
        "jobs:",
        job,
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - run: true"
      ])
    );
    assert.match(failures.join("\n"), /Only .* may publish the trusted-repository-guard check/, job);
  }

  // The verifier itself is of course allowed to publish it.
  assert.deepEqual(
    validateWorkflowText(
      ".github/workflows/trusted-repository-guard.yml",
      workflow([
        "name: Trusted Repository Guard",
        "on:",
        "  workflow_run:",
        "permissions:",
        "  contents: read",
        "jobs:",
        "  verify:",
        "    name: trusted-repository-guard",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - run: true"
      ])
    ),
    []
  );
});

test("the trusted name is refused wherever a pull request could publish it", () => {
  // Turning the verifier's own file into a pull-request workflow is how a
  // proposal would publish the trusted check for itself.
  const hijacked = workflow([
    "name: Trusted Repository Guard",
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  verify:",
    "    name: trusted-repository-guard",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: true"
  ]);
  const failures = validateWorkflowText(
    ".github/workflows/trusted-repository-guard.yml",
    hijacked
  );
  assert.match(failures.join("\n"), /may not be reachable from pull-request events/);
  assert.match(failures.join("\n"), /Only the immutable .* may publish/);
});

test("an escaped job name cannot smuggle in the trusted check name", () => {
  // YAML decodes escapes in double-quoted values, so this resolves to the
  // reserved name while its spelling in the file does not.
  const encoded = workflow([
    "name: Project CI",
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  spoof:",
    '    name: "trusted\\u002drepository\\u002dguard"',
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: true"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/ci.yml", encoded).join("\n"),
    /could not be read/
  );
});

test("a job name the reader cannot resolve is refused, not recorded raw", () => {
  // A block scalar keeps the text on the following line.
  const blockScalar = workflow([
    "name: Project CI",
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  spoof:",
    "    name: >-",
    "      trusted-repository-guard",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: true"
  ]);
  assert.equal(workflowJobNames(blockScalar), null);
  assert.match(
    validateWorkflowText(".github/workflows/ci.yml", blockScalar).join("\n"),
    /jobs could not be read/
  );

  // YAML allows whitespace before the colon, and that is still the name key.
  const spaced = workflow([
    "name: Project CI",
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  spoof:",
    "    name : trusted-repository-guard",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - run: true"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/ci.yml", spaced).join("\n"),
    /Only the immutable .* may publish/
  );
});

test("an action step is read or refused, never ignored", () => {
  // `uses : value` is the uses key with whitespace before the colon.
  assert.deepEqual(
    workflowActions(workflow(["    steps:", "      - uses : actions/checkout@v4"])),
    ["actions/checkout@v4"]
  );

  // An explicit key inside a sequence item is refused.
  const explicitStep = workflow([
    "on:",
    "  push:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - ? uses",
    "        : actions/checkout@v4"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", explicitStep).join("\n"),
    /could not be read/
  );
});

test("a flow-style step is refused rather than left unchecked", () => {
  const flow = workflow([
    "on:",
    "  push:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - { uses: actions/checkout@v4 }"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", flow).join("\n"),
    /permissions could not be read/
  );

  // A YAML property between the marker and the brace does not hide it.
  const anchored = workflow([
    "on:",
    "  push:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - &checkout { uses: actions/checkout@v4 }"
  ]);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", anchored).join("\n"),
    /permissions could not be read/
  );
});

test("YAML features the reader does not implement make a workflow unreadable", () => {
  for (const line of ["    <<: *defaults", "    runs-on: *runner"]) {
    const text = workflow([
      "on:",
      "  pull_request:",
      "permissions:",
      "  contents: read",
      "jobs:",
      "  build:",
      line,
      "    steps:",
      "      - run: true"
    ]);
    assert.equal(reachableFromPullRequest(text), true);
    assert.match(
      validateWorkflowText(".github/workflows/example.yml", text).join("\n"),
      /permissions could not be read/
    );
  }

  // A cron expression is not an alias, and must keep reading normally.
  assert.deepEqual(
    validateWorkflowText(
      ".github/workflows/example.yml",
      workflow(["on:", "  schedule:", '    - cron: "0 6 * * 1"', "permissions:", "  contents: read"])
    ),
    []
  );
});

test("a quoted key carrying escapes is refused, not read literally", () => {
  // YAML decodes escapes in double-quoted keys, so GitHub reads these as
  // `permissions` and `uses` while no plain spelling matches them.
  const escaped = workflow([
    "on:",
    "  pull_request:",
    "permissions:",
    "  contents: read",
    "jobs:",
    "  build:",
    "    runs-on: ubuntu-latest",
    '    "permiss\\u0069ons":',
    "      contents: write",
    "    steps:",
    '      - "us\\u0065s": actions/checkout@v4'
  ]);
  assert.equal(reachableFromPullRequest(escaped), true);
  assert.match(
    validateWorkflowText(".github/workflows/example.yml", escaped).join("\n"),
    /permissions could not be read/
  );

  // A quoted key without escapes still reads normally.
  assert.deepEqual(
    validateWorkflowText(
      ".github/workflows/example.yml",
      workflow(["on:", "  push:", '"permissions":', "  contents: read"])
    ),
    []
  );
});

test("size and NUL bytes do not excuse a file from the secret scan", () => {
  const token = `ghp_${"A".repeat(32)}`;

  withFixture((root) => {
    // A credential file exported as UTF-16 reads as binary in UTF-8.
    writeFileSync(join(root, "website/utf16.txt"), Buffer.from(`${token}\n`, "utf16le"));
    git(root, "add", "-f", "website/utf16.txt");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible GitHub token in website\/utf16\.txt/);
  });

  withFixture((root) => {
    // A NUL byte no longer ends the search through the rest of the file.
    writeFileSync(join(root, "website/padded.txt"), Buffer.concat([
      Buffer.from([0, 0]),
      Buffer.from(`${token}\n`, "utf8")
    ]));
    git(root, "add", "-f", "website/padded.txt");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible GitHub token in website\/padded\.txt/);
  });

  withFixture((root) => {
    // UTF-32 in both byte orders, which two-byte decoding never made contiguous.
    const utf32le = Buffer.concat(
      [...`${token}\n`].map((char) => Buffer.from([char.charCodeAt(0), 0, 0, 0]))
    );
    const utf32be = Buffer.concat(
      [...`${token}\n`].map((char) => Buffer.from([0, 0, 0, char.charCodeAt(0)]))
    );
    writeFileSync(join(root, "website/utf32le.txt"), utf32le);
    writeFileSync(join(root, "website/utf32be.txt"), utf32be);
    git(root, "add", "-f", "website/utf32le.txt", "website/utf32be.txt");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible GitHub token in website\/utf32le\.txt/);
    assert.match(result.stderr, /Possible GitHub token in website\/utf32be\.txt/);
  });

  withFixture((root) => {
    // A trailing padding byte makes the length odd; the pairs before it still
    // decode.
    writeFileSync(join(root, "website/odd.txt"), Buffer.concat([
      Buffer.from(`${token}\n`, "utf16le"),
      Buffer.from([0x00])
    ]));
    git(root, "add", "-f", "website/odd.txt");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible GitHub token in website\/odd\.txt/);
  });

  withFixture((root) => {
    // A fine-grained personal access token uses a different prefix entirely.
    writeFileSync(join(root, "website/fine.txt"), `github_pat_${"B".repeat(40)}\n`);
    git(root, "add", "-f", "website/fine.txt");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible fine-grained GitHub token in website\/fine\.txt/);
  });

  withFixture((root) => {
    // Temporary AWS credentials use ASIA, not AKIA.
    writeFileSync(join(root, "website/aws.txt"), `ASIA${"C".repeat(16)}\n`);
    git(root, "add", "-f", "website/aws.txt");
    const result = runGuard(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Possible AWS access key in website\/aws\.txt/);
  });

  withFixture((root) => {
    // A file too large to scan is refused rather than waved through.
    writeFileSync(join(root, "website/large.txt"), `${token}\n`);
    git(root, "add", "-f", "website/large.txt");
    const { failures } = scanRepository(root, { maxScanBytes: 8 });
    assert.ok(
      failures.some((failure) => /too large for the guard to scan: website\/large\.txt/.test(failure)),
      failures.join("\n")
    );
  });
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
