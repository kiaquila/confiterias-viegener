# Confiterías Viegener migration handoff

This is the durable handoff record for the move to the standalone repository
`kiaquila/confiterias-viegener`. The repository is **public for the duration of
the migration**, which is a deliberate decision rather than a lapse: a GitHub
Free private repository cannot run Actions once its included allowance is spent,
and the migration needs green checks. Whether this repository ends up private is
the owner's call once the migration closes out, and until they make it, public
is the accepted state. It distinguishes verified evidence
from accepted exceptions and unresolved work. It does not authorize a deploy or
claim controls that the repository or hosting platform does not enforce.

## Destination and preserved history

- Destination: repository `kiaquila/confiterias-viegener`, default branch
  `main`, currently public as described above.
- Audited destination head: `230b7fe535e38c3ff4e0d590aea4bbdce02a1994`.
- The repository preserves a five-commit chronological bootstrap history:
  `877359697324fa3e3ac231dbc3853375b630d8bd`,
  `267d610dd4baa36ecda93c645df2ab9d1cce9a16`,
  `2c5e56a66c9a811486c31a58eed34a95fc08bfae`,
  `bb0560b7c96deb13dae56a87894e1265a7328b8c`, and
  `230b7fe535e38c3ff4e0d590aea4bbdce02a1994`.
- Commit `bb0560b7c96deb13dae56a87894e1265a7328b8c` records the
  2026-08-20 content approval and adds the approved image set. Its `website/`
  tree is `7aaf95127c14adb6b239110dc7d873a6c9e953df`, byte-identical to
  `website/` at the audited destination head.
- The final commit installs the shared baseline without changing `website/`.
  All 46 managed files and the release manifest matched the pinned upstream
  source during the 2026-08-21 audit.

This was not filtered from the old `kiaquila/web-design` default branch. It was
bootstrapped from the approved feature state and image set described above.
The repository owner approved keeping this direct bootstrap as a one-time
migration exception on 2026-08-21. No pull request existed for those historical
commits. This exception does not permit future direct pushes to `main`.

## Source and asset provenance limits

The root commit records a hand port from an authenticated ChatGPT-hosted concept
preview. No immutable preview URL, export hash, source repository, or source
commit for that prototype was retained. The repository owner accepted this as
the source-provenance exception for the standalone bootstrap on 2026-08-21. Do
not invent a missing identifier or describe this as exact source-tree equality
with the old monorepository.

The project owner approved the page copy, logo, and eight photographs for use on
this site on 2026-08-20. `website/assets/README.md` records their available
source as “Concept prototype.” No author, rights holder, or licence has been
determined. The approval is the only documented basis for current publication;
it does not establish licensed provenance and does not permit reuse elsewhere.
This remains an unresolved provenance and rights risk. If final closeout
requires a confirmed third-party licence, the assets must be replaced or their
rights and origin documented first.

## Baseline

| Field | Audited value |
| --- | --- |
| Source | `kiaquila/web-design` |
| Version | `0.1.0-dev` |
| Commit | `f042879d8b6d11cc80021bb19cc4aacd645cc621` |
| Profile | `static-cloudflare` |

The full commit SHA identifies immutable bytes, but it is an earlier commit in
the history of the open, unmerged `web-design` PR #46 rather than its current
head, and it has no published stable release identity. A separate baseline-only
pull request must replace it with the full SHA of the first stable release. That
pull request may change only the lock and managed bytes moved by the release.

## GitHub governance

At the audit point the repository was private on a GitHub Free plan, which did
not expose branch protection or repository rulesets, so `main` was unprotected.
The repository has since been made public, and branch protection is available to
public repositories on Free — but none is configured yet:
`repos/kiaquila/confiterias-viegener/branches/main/protection` returns 404, and
no ruleset exists. So `main` is still unprotected in fact, and this record still
does not claim that pull requests, reviews, or required checks are technically
enforced. What changed is the reason: it is now an unapplied setting rather than
an unavailable feature, and applying it is closeout work.

Until it is applied, maintainers enforce these controls manually:

1. Make every future change on a focused branch and ready-for-review pull
   request; do not push directly to `main`.
2. Review the exact current head and the Code Owner paths before merge.
3. Require the check names in `.web-design/project.json`, including a
   current-head Codex review, to be successful.
4. Record two unchanged-head green snapshots at least 120 seconds apart before
   merge.
5. Do not force-push or delete `main`, and resolve conversations before merge.

The first Actions runs on `230b7fe535e38c3ff4e0d590aea4bbdce02a1994`
did not start, because the repository was private and its included Actions
allowance was spent: `project-ci`, `repository-guard`, and `osv-scan` concluded
failure with no job steps at all. The baseline verification workflow was skipped
because its triggering Repository Guard run was a `push`, not a pull request.
Those were never green CI results and must not be read as any.

That cause is now removed rather than worked around — the repository is public,
so its runs execute, and re-running those exact runs made them pass. No billing
change was made and none is needed; the Actions budget stays at `$0`. All checks
must still run successfully on the current pull-request head before merge. Secret scanning and push protection were also
unavailable or disabled at the audit point; enable them when the plan exposes
them, or keep recording the missing control.

## Cloudflare handoff and rollback

The project configuration and externally verified Cloudflare Builds settings
agree on the following values:

| Setting | Value |
| --- | --- |
| Worker | `confiterias-viegener` |
| Public URL | `https://confiterias-viegener.ks-design.workers.dev` |
| Source repository | `kiaquila/confiterias-viegener` |
| Production branch | `main` |
| Root directory | `/website` |
| Build command | `npm run build` |
| Production deploy command | `npm run stage:deploy` |
| Preview deploy command | `npm run stage:preview` |

The connection uses a dedicated build token, but its scope is broader than the
least privilege required by this Worker. Rotate or replace it with a narrowly
scoped token before final closeout; never record the token value here.

GitHub had no Cloudflare check run or deployment record for the five preserved
commits. After pull request #1 opened, Cloudflare's GitHub App successfully built
exact head `1096824c83aff83adf59bed20470b2e28cadb06d` as build
`e59a993c-f67e-41c5-8178-157f64928275` and version
`eda29209-9c9b-4147-b28e-e455261f8357`. At 2026-08-21 16:37 UTC, both the
versioned preview and branch preview alias returned a home page byte-identical
to the local build. The check's preview URLs are durable GitHub evidence; do not
hard-code them into product files.

At 2026-08-21 16:49 UTC, a read-only Wrangler inventory identified production
deployment `668d0ce5-c9f4-4c3c-ab65-a40100226b99` routing 100% of traffic to
version `fccb8c97-f9dc-406a-8eb9-e91845777c21`, created at
2026-08-20 22:59:07 UTC. Cloudflare listed no preceding production deployment;
versions `eda29209-9c9b-4147-b28e-e455261f8357` and
`21ad9d67-d4e9-4f78-895c-a949e96a2ebb` are pull-request preview uploads and are
not rollback production targets. Re-confirm the active deployment immediately
before cutover. The safe rollback target is the recorded active version above;
there is no independently verified older production version.

GitHub's deployments API still has no record for the pull-request head. Before
cutover, also verify that no other repository can deploy this Worker. Do not
treat the preview or live-byte comparison below as proof of the production
source connection or rollback route.

Cloudflare adds `Report-To` and `NEL` response headers whose reporting endpoint
is under `a.nel.cloudflare.com`. The repository owner accepts this as hosting
provider telemetry for the current `workers.dev` deployment. It is not an
application asset, font, script, embed, analytics package, or endpoint requested
by the page. Reassess this acceptance if the hosting or privacy requirements
change.

## Verification evidence

The 2026-08-21 audit used a fresh clone of the repository and completed
the following local checks without changing product files:

- `npm ci --prefix website` completed successfully.
- `npm --prefix website run check` built `dist/` and passed all 34 site tests.
- `npm run preflight` passed the repository guard, managed-file verification,
  and all 47 baseline policy and updater tests.
- `npm --prefix website run images` regenerated all 34 derivatives without a
  tracked byte changing.
- npm audit and OSV Scanner 2.5.0 found no dependency vulnerabilities.
- Gitleaks 8.30.1 scanned all five commits and found no leaks.
- No dependency directory, generated build, secret file, personal absolute
  path, or unrelated customer-project name was tracked.

Browser checks of the built output at 320, 760, 1079, 1080, 1081, and 1440 CSS
pixels found no horizontal overflow. At widths up to and including 1080, the
desktop navigation was hidden and the fixed order action was visible; at 1081
and 1440, the navigation was visible and the fixed action was hidden. The
mobile order action reached `#pedidos`, and no console warning or error was
observed. The built-output tests also verify the skip link, heading order,
accessible logo names, visible-focus CSS, reduced-motion rules, tap targets,
JavaScript-independent reading and ordering paths, and local-only runtime
assets. A complete manual keyboard tab sequence and an operating-system
reduced-motion session were not independently recorded and remain manual checks
for a future product-changing pull request.

At 2026-08-21 16:19–16:20 UTC, production verification returned:

- `200` for `/`, `/robots.txt`, `/sitemap.xml`, the stylesheet, script, and a
  representative image;
- `404` with the project 404 page for a definitely missing path;
- the expected HSTS, CSP on HTML, `X-Content-Type-Options`, referrer policy,
  permissions policy, cross-origin policies, and frame denial headers;
- canonical, robots, and sitemap URLs pointing to the documented Worker origin;
- byte equality between production and the local build for the home page,
  robots, sitemap, 404 page, stylesheet, script, and representative image.

This proves the audited product bytes were live. The active Cloudflare
production version is known — `fccb8c97-f9dc-406a-8eb9-e91845777c21`, from
deployment `668d0ce5-c9f4-4c3c-ab65-a40100226b99`. What this verification does
not supply is a previous rollback version: no older verified production version
exists, and the two preview versions are not rollback candidates.

## Remaining closeout blockers

- Obtain green current-head checks. The blocker was the exhausted private-repo
  Actions allowance, not the workflows: the repository is public again and its
  runs execute normally, so this is now an ordinary rerun-and-verify step.
- Narrow and rotate the Cloudflare build token.
- Apply branch protection to `main` now that the repository is public and the
  feature is available, using the check names in `.web-design/project.json`.
- Decide the final visibility. Public is the accepted migration-time state, not
  a permanent one; returning to private means accepting that Actions stop once
  the included allowance is spent, so that decision and its consequence belong
  together.
- Re-confirm active production version
  `fccb8c97-f9dc-406a-8eb9-e91845777c21` and verify the absence of any duplicate
  repository deployment source. Cloudflare has no older verified production
  version; pull request #1 supplies the standalone preview evidence.
- Publish an immutable stable `web-design` release, then repin through a
  baseline-only pull request.
- Resolve or explicitly retain the documented prototype and asset provenance
  limitations; do not claim a licence that has not been established.
