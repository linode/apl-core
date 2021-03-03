#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/configure.sh

function setup () {
    test_temp_dir="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$test_temp_dir"
    env_path="$ENV_DIR/env"
    git init "$ENV_DIR"
    bin/bootstrap.sh 
}

function teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR CLOUD CLUSTER env_path
}

@test "configure.sh without args doesn't create otomi.cfg" {
    run bin/configure.sh
    assert_output --partial "--all, --cluster or --label not specified"
    assert [ ! -f "$ENV_DIR/otomi.cfg" ]
}

@test "configure.sh with CLUSTER_OPT env creates otomi.cfg" {
    run bin/configure.sh --cluster aws-dev
    assert [ -f "$ENV_DIR/otomi.cfg" ]
}