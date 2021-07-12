#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/common.sh

function setup () {
    test_temp_dir="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$test_temp_dir"
    env_path="$ENV_DIR/env"
    git init "$ENV_DIR"
    bin/bootstrap.sh
}

function teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR env_path
}

@test "Validating values should run successfully" {
    eval "run timeout 5 bin/validate-values.sh"
    assert_output --partial "/tmp/otomi/values/values.yaml passed test"
}
