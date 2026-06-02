# Release automation: explicit versioning, one branch per release cycle

- Status: accepted

## Context and Problem Statement

The release process was split across three workflows (`create_rc.yml`, `patch_rc.yml`, `Releases.yml`) using two competing tools (`standard-version` and `semantic-release`). Version progression was implicit — `standard-version` inferred the next semver bump from conventional commit prefixes. Branch naming (`rc/v<major.minor>`) was inconsistent with the repo's existing `releases/` prefix convention. How should a replacement automation be structured?

## Decision Drivers

- Version drift risk: two tools writing to `package.json` and git tags in different workflows with no shared guard against duplicates
- Operational clarity: release managers need to know exactly what version will be tagged before triggering a workflow
- Release cycle continuity: RC patches, stable cuts, and post-release patch RCs must all live on one branch without manual branch juggling

## Considered Options

- Keep `standard-version` with implicit version detection from conventional commits
- Replace with explicit version inputs and GitHub's native release notes API
- Replace with `semantic-release` (already present in `Releases.yml`) as the single tool

## Decision Outcome

Chosen option: "explicit version inputs + GitHub native release notes API", because it makes the release manager's intent unambiguous at trigger time, eliminates the dual-tool conflict, and removes the dependency on conventional commit discipline as a hard requirement for correct version bumps.

### Positive Consequences

- A single `workflow_dispatch` input (`version`) is the source of truth — no inference, no surprise bumps
- GitHub Releases become the authoritative changelog; `CHANGELOG.md` and its maintenance scripts are removed
- Stable release notes correctly skip RC tags by passing the previous stable tag as `previous_tag_name`
- "Cut Release Branch" opens a second PR bumping `base_branch` to the next minor RC (e.g., `1.5.0-rc.0`), keeping `main` from stalling at the released version; the PR makes the bump reviewable and safe against protected branches

### Negative Consequences

- Release managers must supply the correct version string manually; a typo creates a wrong tag (mitigated by the format validation regex and the branch-name cross-check in "Release from Branch")
- `CHANGELOG.md` history is no longer in the repo; it must be consulted via the GitHub Releases page

## Release Branch Change Workflow

Fixes are cherry-picked onto `release/v<major.minor>` via PR, not direct push. Developers open a fix branch, cherry-pick the relevant commit(s), and target the PR at the Release Cycle branch. `release/v<major.minor>` branches are expected to be protected; the `BOT_TOKEN` PAT holds the branch protection bypass used exclusively for the version bump commits made by "Release from Branch".

## Pros and Cons of the Options

### Keep `standard-version` with implicit detection

- Good, because version bump logic is automatic and tied to commit history
- Bad, because it conflicts with `semantic-release` already present in `Releases.yml`
- Bad, because a single non-conventional commit silently produces the wrong version bump

### Explicit version inputs + GitHub native release notes API

- Good, because intent is explicit and auditable in the workflow dispatch log
- Good, because no external changelog tool needed — GitHub generates diff-based notes natively
- Bad, because version must be typed correctly by a human

### `semantic-release` as sole tool

- Good, because it handles the full release lifecycle in one tool
- Bad, because it requires all commits to follow conventional format to produce correct output
- Bad, because it was already present and unused in `Releases.yml`, indicating it was never fully adopted
