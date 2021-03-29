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

@test "$validate_values_str starts generating with --cluster azure-demo" {
    eval "run timeout 5 bin/validate-values.sh --cluster azure-demo"
    assert_output --partial "/tmp/otomi/values/azure-demo.yaml passed test"
    assert [ ! -f "/tmp/otomi/values/aws-dev.yaml" ]
}

@test "$validate_values_str starts generating with --cluster aws-dev" {
    eval "run timeout 5 bin/validate-values.sh --cluster aws-dev"
    assert_output --partial "/tmp/otomi/values/aws-dev.yaml passed test"
    assert [ ! -f "/tmp/otomi/values/azure-demo.yaml" ]
}