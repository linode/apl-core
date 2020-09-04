#!/usr/bin/env bash
shopt -s expand_aliases
. bin/utils.sh
set -e

TEST_PATH=/tmp/json-fixtures
[[ -z "$TEST_PATH" ]] && echo "Error: Missing the TEST_PATH environment variable" && exit 2

function drun_api() {
    img=eu.gcr.io/otomi-cloud/otomi-stack-api:jsonschema
    # execute any kubectl command to refresh access token
    # k version >/dev/null
    d run -it --rm -v $PWD:$PWD \
        -v /tmp:/tmp \
        -v ~/.kube/config:/home/app/.kube/config \
        -v $HELM_CONFIG:/home/app/.config/helm \
        -v ~/.config/gcloud:/home/app/.config/gcloud \
        -v ~/.aws:/home/app/.aws \
        -v ~/.azure:/home/app/.azure \
        -v $ENV_DIR:$PWD/env \
        -e K8S_CONTEXT=$K8S_CONTEXT \
        -e CLOUD=$CLOUD \
        -e GCLOUD_SERVICE_KEY=$GCLOUD_SERVICE_KEY \
        -e CLUSTER=$CLUSTER \
        -w $PWD $img $@
}

function extract_schemas() {
    declare -a supported_versions
    supported_versions=(v1.17.0 v1.16.0 v1.15.0)
    EXTRACT_COMMAND="mkdir -p $TEST_PATH/schemas && \
      curl https://codeload.github.com/instrumenta/kubernetes-json-schema/tar.gz/master | \
      tar -C $TEST_PATH/schemas --strip-components=1 -xzvf - "
    for sv in "${supported_versions[@]}"; do
        echo "Supported version: $sv"
        EXTRACT_COMMAND+=" kubernetes-json-schema-master/$sv-standalone kubernetes-json-schema-master/$sv kubernetes-json-schema-master/$sv-standalone-strict"
    done
    eval $EXTRACT_COMMAND
    export KUBEVAL_SCHEMA_LOCATION="file://$TEST_PATH/schemas"
}

function compile_values_bundle() {
    helmfile -f helmfile.tpl/helmfile-dump.yaml build | yq r - 'releases[0].values[0]' >$COMPILED_VALUES_PATH
}

function generate_values_schema_bundle() {
    # run compile_values_bundle??
    drun_api npm run tasks:otomi:compile-schema >/tmp/json-fixtures/OTOMI-STACK-schema.json
    drun_api npm run tasks:otomi:validate-values
}

function generate_stack_bundle() {
    echo ""
    echo "Generating Helmfile template bundle for Otomi-Stack" && sleep 2
    hfd template --output-dir="$TEST_PATH/otomi-stack/"
    # drun helmfile --quiet -e ${CLOUD}-$CLUSTER template --output-dir="$TEST_PATH/otomi-stack/"
}

function drun_kube_validation() {
    echo ""
    echo "Validating Otomi-Stack Resources for Kubernetes Version - ${K8S_VERSION}" && sleep 3
    docker run -it -v "$TEST_PATH/otomi-stack/":/fixtures garethr/kubeval --force-color "$@" -d /fixtures
    testFailed=$?
    if [[ $testFailed -eq 1 ]]; then
        echo "Validation Failed; Check ERR"
        exit 1
    else
        echo "Validation Success;"
        exit 0
    fi
}

function validate() {
    # supported_versions=(v1.17.0 v1.16.0 v1.15.0)
    K8S_VERSION=${1:-1.16.0}

    # (generate_stack_bundle)

    (drun_kube_validation --strict \
        --ignore-missing-schemas \
        --kubernetes-version $K8S_VERSION) || exit 1
    # --exit-on-error \

}
