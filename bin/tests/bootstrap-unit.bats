#!/usr/local/bin/bats

lib_dir="/usr/local/lib"

load "$lib_dir/bats-support/load.bash"
load "$lib_dir/bats-assert/load.bash"
load "$lib_dir/bats-file/load.bash"

setup () {
    test_temp_dir="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$test_temp_dir"
    env_path="$ENV_DIR/env"
}

teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR
    unset env_path
}

@test "the env folder should not exist without bootstrap.sh" { 
    assert_file_not_exist "$env_path"
}

@test "the env folder should exist after bootstrap.sh" {
    git init "$ENV_DIR"
    bin/bootstrap.sh
    assert_file_exist "$env_path"
}