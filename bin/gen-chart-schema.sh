#!/usr/bin/env bash
#
# Generate chart/apl/values.schema.json from values-schema.yaml.
#
# Why this exists
# ---------------
# values.schema.json is a generated artifact and is gitignored, exactly as upstream has it.
# Upstream's release pipeline regenerates it before `helm package`, so their users always receive
# it inside the published chart tarball and never think about it.
#
# Installing from a source checkout skips that pipeline. Without this step the file is simply
# absent, and `helm install ./chart/apl` then validates nothing at all -- it does not warn, it
# just silently accepts any values. That is how a missing cluster.domainSuffix stops being a clear
# error and becomes a confusing failure later, inside the operator.
#
# Run this after building the operator image and before `helm install`. Re-run it whenever
# values-schema.yaml changes.
#
# Docker-only by design: js-yaml survives `npm prune --production` and ships inside the operator
# image, so no working host Node is required.
#
# Usage:
#   bin/gen-chart-schema.sh [image]
#   APL_IMAGE=my-image:tag bin/gen-chart-schema.sh
#
set -euo pipefail

IMAGE="${1:-${APL_IMAGE:-apl-core-local:v6.2.1-fork}}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO_ROOT/values-schema.yaml"
DEST="$REPO_ROOT/chart/apl/values.schema.json"

if [ ! -f "$SRC" ]; then
  echo "error: $SRC not found -- run this from a checkout of apl-core" >&2
  exit 1
fi

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  cat >&2 <<EOF
error: image '$IMAGE' is not present locally.

Build it first, from a clean context so local notes do not break the build's spellcheck:

  CTX=\$(mktemp -d)
  git ls-files -z | tar --null -T - -c | tar -x -C "\$CTX"
  docker build --build-arg VERSION=6.2.1-fork -t $IMAGE "\$CTX"

Then re-run this script, or pass a different tag:  bin/gen-chart-schema.sh <image>
EOF
  exit 1
fi

# Generate into a temporary file rather than redirecting onto $DEST directly.
#
# `docker run ... > $DEST` truncates $DEST *before* the container starts, so any failure leaves a
# zero-byte schema behind. Helm treats that as "no constraints" rather than an error, which
# reintroduces precisely the silent-no-validation problem this script exists to prevent.
TMP="$(mktemp)"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

# `set -e` aborts here if the container fails, leaving $DEST untouched.
docker run --rm -v "$REPO_ROOT:/w:ro" "$IMAGE" \
  /home/app/stack/node_modules/.bin/js-yaml /w/values-schema.yaml >"$TMP"

if [ ! -s "$TMP" ]; then
  echo "error: generated schema is empty; $DEST left untouched" >&2
  exit 1
fi

# js-yaml exiting 0 with non-empty output emits valid JSON by construction, so a full parse would
# be redundant. This only guards against a partially written file.
# js-yaml terminates the file with a newline, so look at the last two bytes and strip whitespace.
first_char="$(head -c 1 "$TMP")"
last_char="$(tail -c 2 "$TMP" | tr -d '[:space:]')"
if [ "$first_char" != "{" ] || [ "$last_char" != "}" ]; then
  echo "error: generated schema looks truncated; $DEST left untouched" >&2
  exit 1
fi

mv "$TMP" "$DEST"
trap - EXIT

echo "wrote $DEST ($(wc -c <"$DEST" | tr -d ' ') bytes) using $IMAGE"
