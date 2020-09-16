#!/usr/bin/env bash

# accepts a list of versions to check against
# example:~$ otomi kubeval 1.15.0 1.16.0 1.17.0
local k8s_versions=("${@:-1.16.0}")
local tmp_validation_dir=/tmp/kubeval-fixtures
local exitcode=0

clean_exit() {
    [[ $exitcode -eq 0 ]] && echo "Validation Success" || echo "Validation Failed"
    rm -rf $tmp_validation_dir
    exit $exitcode
}

echo "Generating Manifests in tmp location."
# using OUTPUT-DIR parameter because kubeval is not accepting multiple resources per file
drun helmfile -e $CLOUD-$CLUSTER --quiet template --skip-deps --output-dir=$tmp_validation_dir >/dev/null
for version in "${k8s_versions[@]}"; do
    echo "Validating Otomi Stack against Kubernetes Version: $version"
    (
        drun kubeval --force-color -d $tmp_validation_dir --strict --ignore-missing-schemas --kubernetes-version $version
    ) || exitcode=1
done
clean_exit
