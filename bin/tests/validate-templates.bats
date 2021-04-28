#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/common.sh

function setup () {
    test_temp_dir="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$test_temp_dir"
    env_path="$ENV_DIR/env"
    git init "$ENV_DIR"
    bin/bootstrap.sh aws
}

function teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR env_path
}

#####
# bin/validate-templates 
#####
@test "Validating templates should run successfully" {
    run timeout 5 bin/validate-templates.sh -l group=jobs
    assert_output --partial 'Templates validation SUCCESS'
}
