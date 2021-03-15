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

@test "otomi without arguments prints help message" {
    run bin/otomi
    # Exit code is different depending on global $CI ...
    [ -z "$CI" ] && assert_failure 1 || assert_failure 2
}