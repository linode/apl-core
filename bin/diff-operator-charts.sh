#!/usr/bin/env bash
# APL installs the operator twice: chart/apl does it with `helm install`, then ArgoCD takes over
# with charts/apl-operator. If the two render different Deployments, ArgoCD rolls the pod on its
# first sync and the install logs are lost. This renders both and fails on any difference.
#
# Scope: structural drift, which is the failure mode that has actually bitten. It does not prove
# the values each chart receives at runtime agree — apl-operator.gotmpl derives some of those from
# the platform values, which are not available here.
set -Eeuo pipefail

readonly script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly repo_root="$(cd "${script_dir}/.." && pwd)"
readonly out_dir="$(mktemp -d)"
trap 'rm -rf "${out_dir}"' EXIT

readonly version="v9.9.9"
readonly repository="docker.io/linode/apl-core"

helm template apl "${repo_root}/chart/apl" \
  --namespace default \
  --set cluster.name=local \
  --set cluster.provider=linode \
  --set otomi.version="${version}" \
  --set operator.image.repository="${repository}" \
  --show-only templates/deployment.yaml \
  >"${out_dir}/install.yaml"

helm template apl-operator "${repo_root}/charts/apl-operator" \
  --namespace apl-operator \
  --set image.tag="${version}" \
  --set image.repository="${repository}" \
  --set image.pullPolicy=IfNotPresent \
  --show-only templates/deployment.yaml \
  >"${out_dir}/argocd.yaml"

# Only the "# Source:" comment may differ — the charts have different names.
sed -i.bak '/^# Source:/d' "${out_dir}/install.yaml" "${out_dir}/argocd.yaml"

if diff -u "${out_dir}/install.yaml" "${out_dir}/argocd.yaml"; then
  echo "OK: chart/apl and charts/apl-operator render the same Deployment."
else
  cat >&2 <<'EOF'

ERROR: chart/apl and charts/apl-operator render different Deployments.

ArgoCD would restart the operator on its first sync after install, discarding the install logs.
Apply the change above to both charts so they render identically.
EOF
  exit 1
fi
