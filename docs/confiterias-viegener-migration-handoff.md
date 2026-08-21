# Confiterías Viegener migration handoff

This is the durable handoff record for the move to the private standalone
repository `kiaquila/confiterias-viegener`. It distinguishes verified evidence
from accepted exceptions and unresolved work. It does not authorize a deploy or
claim controls that the repository or hosting platform does not enforce.

## Destination and preserved history

- Destination: private repository `kiaquila/confiterias-viegener`, default
  branch `main`.
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

At the audit point, the private repository was on a GitHub Free plan that did
not expose branch protection or repository rulesets for this private
repository. `main` was therefore unprotected. The repository does not claim
that pull requests, reviews, or required checks are technically enforced.

Until the plan supports enforcement, maintainers apply these controls manually:

1. Make every future change on a focused branch and ready-for-review pull
   request; do not push directly to `main`.
2. Review the exact current head and the Code Owner paths before merge.
3. Require the check names in `.web-design/project.json`, including a
   current-head Codex review, to be successful.
4. Record two unchanged-head green snapshots at least 120 seconds apart before
   merge.
5. Do not force-push or delete `main`, and resolve conversations before merge.

The first Actions runs on `230b7fe535e38c3ff4e0d590aea4bbdce02a1994`
did not start because of the account billing or spending-limit state:
`project-ci`, `repository-guard`, and `osv-scan` concluded failure with no job
steps. The baseline verification workflow was skipped because its triggering
Repository Guard run was a `push`, not a pull request. These are not green CI
results. Billing must be resolved and all checks must run successfully on a
pull-request head before merge. Secret scanning and push protection were also
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

The repository does not contain, and the local audit could not retrieve, the
active Cloudflare deployment/version identifier or the preceding rollback
version. GitHub also had no Cloudflare check run or deployment record for the
five preserved commits. Before any future production deployment, record the
active and previous version IDs from Cloudflare, verify that no other repository
can deploy this Worker, and prove a preview from the standalone repository. Do
not treat the live-byte comparison below as proof of the source connection or
rollback route.

Cloudflare adds `Report-To` and `NEL` response headers whose reporting endpoint
is under `a.nel.cloudflare.com`. The repository owner accepts this as hosting
provider telemetry for the current `workers.dev` deployment. It is not an
application asset, font, script, embed, analytics package, or endpoint requested
by the page. Reassess this acceptance if the hosting or privacy requirements
change.

## Verification evidence

The 2026-08-21 audit used a fresh clone of the private repository and completed
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

This proves the audited product bytes were live. It does not identify the
Cloudflare deployment or previous rollback version.

## Remaining closeout blockers

- Resolve GitHub Actions billing and obtain green current-head checks.
- Narrow and rotate the Cloudflare build token.
- Record the active deployment, previous rollback version, standalone preview,
  and absence of any duplicate repository deployment source.
- Publish an immutable stable `web-design` release, then repin through a
  baseline-only pull request.
- Resolve or explicitly retain the documented prototype and asset provenance
  limitations; do not claim a licence that has not been established.
