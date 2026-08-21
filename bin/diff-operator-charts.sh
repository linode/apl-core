#!/usr/bin/env bash
# chart/apl installs the operator, then ArgoCD takes it over with charts/apl-operator. If the two
# render different Deployments, ArgoCD restarts the pod and the install logs are lost. They share
# one template by symlink, so this catches drift between the two values.yaml key sets.
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
  --set image.repository="${repository}" \
  --show-only templates/deployment.yaml \
  2>/dev/null >"${out_dir}/install.yaml"

helm template apl-operator "${repo_root}/charts/apl-operator" \
  --namespace apl-operator \
  --set image.tag="${version}" \
  --set image.repository="${repository}" \
  --show-only templates/deployment.yaml \
  2>/dev/null >"${out_dir}/argocd.yaml"

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
