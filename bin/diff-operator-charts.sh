#!/usr/bin/env bash
# chart/apl installs the operator, then ArgoCD takes it over with charts/apl-operator. If the two
# render different Deployments, ArgoCD restarts the pod and the install logs are lost. They share
# one template by symlink, so this catches drift between the two values.yaml key sets.
set -Eeuo pipefail

readonly script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly repo_root="$(cd "${script_dir}/.." && pwd)"
readonly out_dir="$(mktemp -d)"
trap 'rm -rf "${out_dir}"' EXIT

# Drops the "# Source:" line, which names the chart, and trailing blank lines, which some helm
# versions emit and others do not. Neither carries meaning once the YAML is parsed.
normalise() {
  local file="$1"
  sed '/^# Source:/d' "${file}" \
    | awk 'NF { last = NR } { line[NR] = $0 } END { for (i = 1; i <= last; i++) print line[i] }' \
    >"${file}.tmp"
  mv "${file}.tmp" "${file}"
}

# Each case is "<tag> <repository the Helmfile values would pass>". A released tag goes through
# the ORCS mirror, a branch build does not, so apl-operator.gotmpl omits the repository for it.
readonly cases=(
  "v9.9.9 mirror.registry.linodelke.net/docker/linode/apl-core"
  "APL-1234 "
)

failed=0
for case in "${cases[@]}"; do
  read -r tag repository <<<"${case}"

  helm template apl "${repo_root}/chart/apl" \
    --namespace default \
    --set cluster.name=local \
    --set cluster.provider=linode \
    --set otomi.version="${tag}" \
    --show-only templates/deployment.yaml \
    2>/dev/null >"${out_dir}/install.yaml"

  helm template apl-operator "${repo_root}/charts/apl-operator" \
    --namespace apl-operator \
    --set image.tag="${tag}" \
    --set image.repository="${repository}" \
    --show-only templates/deployment.yaml \
    2>/dev/null >"${out_dir}/argocd.yaml"

  normalise "${out_dir}/install.yaml"
  normalise "${out_dir}/argocd.yaml"

  if diff -u "${out_dir}/install.yaml" "${out_dir}/argocd.yaml"; then
    echo "OK: identical Deployment for tag ${tag}."
  else
    echo >&2 "ERROR: chart/apl and charts/apl-operator differ for tag ${tag}."
    failed=1
  fi
done

if [[ ${failed} -ne 0 ]]; then
  cat >&2 <<'EOF'

ArgoCD would restart the operator on its first sync after install, discarding the install logs.
Apply the change above to both charts so they render identically.
EOF
  exit 1
fi
