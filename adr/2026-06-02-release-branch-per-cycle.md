# One release branch per major.minor cycle

- Status: accepted

## Context and Problem Statement

When cutting a release, should each individual version (including each RC) get its own branch, or should a single branch cover the entire major.minor cycle (all RCs, the stable cut, and subsequent patches)?

## Decision Drivers

- Patch releases are common: every minor version in this repo has had multiple patches (`v4.13.0–rc.4`, `v4.15.0–rc.3`, `v5.0.0–rc.1`)
- Cherry-pick overhead: fixes targeting an RC must reach subsequent RCs and the stable cut
- Branch proliferation: one branch per version produces `release/v1.4.0-rc.1`, `release/v1.4.0-rc.2`, `release/v1.4.0`, `release/v1.4.1` as separate branches for a single minor cycle

## Considered Options

- One branch per version (e.g., `release/v1.4.0-rc.1`, `release/v1.4.0`, `release/v1.4.1`)
- One branch per major.minor cycle (e.g., `release/v1.4`)

## Decision Outcome

Chosen option: "one branch per major.minor cycle", because it eliminates cross-branch cherry-picks within a release cycle and matches the `releases/v<major.minor>` branch convention used by the release workflows.

The branch is created once by "Cut Release Branch". All subsequent RC tags, the stable cut, and patch RCs are produced by running "Release from Branch" against the same branch. The "Cut Release Branch" guard (branch must not already exist) correctly prevents accidental cycle restarts.

### Positive Consequences

- A fix committed to `release/v1.4` is automatically present in all subsequent tags from that branch — no cherry-picks needed
- Branch list stays proportional to minor releases, not to the number of RC iterations
- Patch releases (`v1.4.1`, `v1.4.2`) require no new branch; "Release from Branch" handles them via the auto-bump-to-next-patch-RC behaviour after each stable cut

### Negative Consequences

- The branch name (`release/v1.4`) does not encode the current patch level; the authoritative version is always `package.json`, not the branch name
- "Release from Branch" must validate that the major.minor in `package.json` matches the branch suffix, rather than doing an exact version match

## Pros and Cons of the Options

### One branch per version

- Good, because the branch name encodes the exact version being released
- Bad, because a fix on `release/v1.4.0-rc.1` must be cherry-picked to `release/v1.4.0-rc.2`, then again to `release/v1.4.0`, then to `release/v1.4.1` — four manual operations for one fix
- Bad, because the "Cut Release Branch" workflow would need to run once per RC, creating a new branch each time

### One branch per major.minor cycle

- Good, because fixes flow forward automatically within the cycle
- Good, because "Cut Release Branch" runs once and "Release from Branch" handles all subsequent releases on that branch
- Bad, because the branch name alone does not tell you which patch is currently in flight
