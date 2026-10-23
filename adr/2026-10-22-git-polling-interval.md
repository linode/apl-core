# Git polling uses a fixed delay after each cycle

- Status: accepted

## Context and Problem Statement

The operator runs Git polling cycles sequentially and waits `POLL_INTERVAL_MS` after each cycle completes; it does not schedule polls at a fixed rate or allow them to overlap. A cycle can take longer than the configured interval because it includes credential reload, Git synchronization and analysis, and any apply triggered by detected changes, so the effective time between cycle starts is the cycle duration plus the interval. `GIT_OP_TIMEOUT_MS` is a per-Git-operation timeout, not a total cycle deadline, and is independent of `POLL_INTERVAL_MS`; a timed-out operation fails the cycle, which is logged before the loop waits and retries.
