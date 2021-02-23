#!/usr/local/bin/bats

lib_dir="/usr/local/lib"

load "$lib_dir/bats-support/load.bash"
load "$lib_dir/bats-assert/load.bash"
load "$lib_dir/bats-file/load.bash"

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
    unset ENV_DIR
    unset env_path
}

#############
# bin/otomi #
#############
@test "executing otomi without arguments prints help message" {
    run bin/otomi
    assert_failure 2
}

##########################
# bin/validate-templates #
##########################
@test "executing validate-templates without arguments fails" {
    run bin/otomi validate-templates
    assert_failure
}

@test "executing validate-templates with both -A and -l fails" {
    run bin/otomi validate-templates -A -l group=jobs
    assert_output --partial 'Error: cannot specify --all and --label simultaneously'
    assert_failure 6
}

@test "executing validate-templates with --label something works" {
    run bin/otomi validate-templates -l group=jobs
    assert_output --partial "Generating k8s v1.18 manifests for cluster 'aws-dev'"
}