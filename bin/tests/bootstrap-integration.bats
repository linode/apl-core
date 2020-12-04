#!/usr/local/bin/bats

lib_dir="/usr/local/lib"

load "$lib_dir/bats-support/load.bash"
load "$lib_dir/bats-assert/load.bash"
load "$lib_dir/bats-file/load.bash"

setup () {
    test_temp_dir="$(temp_make --prefix "otomi-values-")"
    export ENV_DIR="$test_temp_dir"
}

teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR
}

@test "executing bootstrap.sh should pass with env folder" {
    git init "$ENV_DIR"
    bin/bootstrap.sh
    assert_success
}

@test "executing bootstrap.sh should fail without env folder" {
    run bin/bootstrap.sh
    assert_failure
}

@test "executing bootstrap.sh multiple times should pass" {
    git init "$test_temp_dir"
    bin/bootstrap.sh 
    run bin/bootstrap.sh
    assert_success
}