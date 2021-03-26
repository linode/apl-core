#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/common.sh

function setup () {
    test_temp_dir="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$test_temp_dir" CLOUD=aws CLUSTER=demo
    env_path="$ENV_DIR/env"
    git init "$ENV_DIR"
    bin/bootstrap.sh 
}

function teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR CLOUD CLUSTER env_path
}

#####
# bin/validate-templates 
#####
@test "validate-templates -l something starts generating" {
    eval "run timeout 5 bin/validate-templates.sh -l group=jobs"
    eval "assert_output --partial Templates validation SUCCESS"
}

@test "validate-templates -A starts generating" {
    eval "run timeout 5 bin/validate-templates.sh -A"
    eval "assert_output --partial Templates validation SUCCESS"
}

@test "validate-templates --cluster aws-demo starts generating 'aws-demo'" {
    eval "run timeout 5 bin/validate-templates.sh --cluster aws-demo"
    eval "assert_output --partial Templates validation SUCCESS"
    refute_output "Generating k8s v1.18 manifests for cluster aws-dev"
}