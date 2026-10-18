# Release guide

Lightener Studio releases must preserve curve behavior, package correctly for
HACS, and keep versions, bundles, documentation, and the public demo aligned.
The release workflow builds and uploads the integration archive after a GitHub
release is published. Only stable feature releases deploy the public demo.

Publishing a branch, merging a pull request, creating a release, and installing
or restarting Home Assistant require the responsible maintainer or instance
owner's explicit authorization. Passing checks alone does not authorize them.

## Release lines and versions

- Feature releases use `origin/master`. The `2.16` maintenance line is anchored
  at `v2.16.1` and is closed unless a maintainer approves an urgent regression fix.
  Create any maintenance branch from the newest `v2.16.x` tag and delete it after
  the release; there is no permanent maintenance branch.
- Cherry-pick maintenance fixes onto `master`. Never merge either line into the
  other: `scripts/assert-release-ref` checks commit-set separation, so a merge
  would either contaminate the maintenance line or block later maintenance tags.
  The guard does not detect cherry-picked, squashed, or reimplemented feature
  content; review the maintenance diff separately.
- Use `vX.Y.Z[-prerelease][+build]` tags, normally `-beta.N` for prereleases.
  Promote a beta to stable only after an authorized Home Assistant smoke test
  and a maintainer's explicit release decision.
- Prepare versions in a release pull request. A stable tag requires the exact
  version in `manifest.json`, both `CARD_VERSION` constants, and committed
  generated bundles. A prerelease uses the same committed stable core version;
  the release workflow adds the prerelease suffix to the package, synchronizes
  the version markers, and rebuilds its bundles.
- Milestones describe intended release contents; the tagged commit determines
  what is actually released. `scripts/release-line` supplies the classification
  used by both the ref guard and the demo deployment condition.

## Prepare and validate the candidate

1. Refresh `origin/master` and tags, inspect the exact candidate diff, and check
   for another open pull request covering the same change. Keep unrelated work
   out of the release candidate.
2. Run `python3 scripts/sync-version` and `cd js && npm run build`. Commit the
   synchronized versions and generated bundles before creating a stable tag.
   Update `CHANGELOG.md` for user-facing changes and verify the installation and
   upgrade documentation.
3. Run `scripts/preflight`, the browser suite, and the relevant coverage jobs
   described in [CONTRIBUTING.md](../CONTRIBUTING.md). Verify the effective GitHub
   checks, including Quality, Validate, and verify-claims, for the exact candidate.
   A skipped or incomplete check is not a pass. Never bypass failing hooks.
4. Export `RELEASE_PRERELEASE=true` for a prerelease or `false` for stable, then
   run `scripts/assert-release-version <tag>` from the clean, committed candidate
   checkout as a preliminary version check. Defer the feature-line ref check
   until after merge: an unmerged feature commit is not yet contained in
   `origin/master`. Both guards are mandatory on the final release tag and tree
   as described below. Run `scripts/test-release-guards` when changing release
   behavior.
5. Run `scripts/demo-freshness-check` for a stable feature release. It must pass
   before publishing. For prereleases and maintenance releases, use
   `--warn-only`; they do not deploy the demo. Refresh the demo through the
   Demo refresh workflow when rendered card, scene, or capture sources change,
   and review the resulting pull request before merging. An optional
   `verified_through_sha` may acknowledge a change that leaves the rendered card
   unchanged; it must descend from `source_sha` and does not replace visual
   evidence when rendered behavior changes. A fresh capture clears that override.
6. For editor or setup changes, check the relevant interactions and appearance
   on an authorized test instance: group setup, editing, preview and restore,
   save, membership changes, keyboard access, and cached-client compatibility.
   A local demo proves only its simulated behavior. Record missing live coverage
   explicitly and fix blocking defects before release.
7. Review packaging and frontend update behavior: the archive needs
   `manifest.json` at its root and no `custom_components/` prefix; asset routes
   must remain stable; cached bundles must retain compatible WebSocket contracts.
   Use reviewer-accessible evidence in the pull request's Proof block, following
   the [contribution guide](../CONTRIBUTING.md#pull-requests). Sanitize logs and
   screenshots using the [privacy rules](OPEN-ROOM-LAB.md#privacy-rules).

## Publish and verify

Before merging or publishing, verify the destination is this maintained fork
and that the base branch and exact candidate commit match the approved release.
Do not publish to upstream as part of this workflow. Review the exact outgoing
content for private information before requesting publication approval.

After explicit approval, merge the reviewed candidate into its intended base
and fetch the resulting base (`origin/master` for feature releases) and tags.
Identify the exact resulting release commit and verify its checks. Check out
that commit in a clean worktree, create the local release tag on it, and confirm
that `<tag>^{commit}` equals `HEAD`. Do not move an existing tag to make checks
pass.

From that clean checkout, export `RELEASE_PRERELEASE=true` for a prerelease or
`false` for stable and run both `scripts/assert-release-ref <tag>` and
`scripts/assert-release-version <tag>`. The ref guard evaluates the tag's commit;
the version guard reads the checked-out manifest, so the tag and working tree
must represent the same final release commit. Either a violation or an
indeterminate result blocks publication. Push the tag and publish the GitHub
release only after both guards pass and explicit publication approval is given.
Remove the merged feature branch. The release workflow owns archive creation,
structure validation, upload, and stable-feature demo deployment; do not manually
replace release archives or use a failed workflow as permission to bypass it.

Wait for the release workflow to finish and inspect its result. For a stable
feature release, compare SHA-256 hashes of the card bundle at the release commit,
the bundle extracted from the release archive, and the deployed demo bundle.
All three must agree. Prerelease package bundles intentionally carry the
prerelease version, and neither prereleases nor maintenance releases update the
public demo; do not claim demo parity for those releases.

With the test-instance owner's explicit approval, confirm HACS offers the new
version, install it, and verify the integration loads and the changed behavior
works. An uploaded archive, a green workflow, or a successful demo check does
not establish installation or physical-light acceptance. For direct development
syncs, `scripts/ha-sync` reads an operator-supplied target from the ignored
`.context/ha-sync.env`; use a test instance. The script never restarts Home
Assistant. Obtain explicit instance-owner approval before any restart or reload.

If verification fails, stop promotion and capture sanitized evidence. Use the
[troubleshooting guide](TROUBLESHOOTING.md) for stale assets and installation
problems. A failure does not authorize a restart, a replacement asset, or another
release. An approved rollback uses the previous HACS version and must be checked
on the affected instance.

Release notes should explain the user-visible changes, relevant upgrade steps,
known limits, and rollback option. Preserve the canonical upstream attribution
from the README, following [Attribution](../CONTRIBUTING.md#attribution).
