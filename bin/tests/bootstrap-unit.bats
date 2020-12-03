#!/usr/local/bin/bats

lib_dir="/usr/local/lib"

load "$lib_dir/bats-support/load.bash"
load "$lib_dir/bats-assert/load.bash"
load "$lib_dir/bats-file/load.bash"

setup () {
    TEST_TEMP_DIR="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$TEST_TEMP_DIR"
    export ENV_PATH="$ENV_DIR/env"
}

teardown () {
    temp_del "$TEST_TEMP_DIR"
    unset ENV_DIR
    unset ENV_PATH
}

@test "the env folder should not exist without bootstrap.sh" { 
    assert_file_not_exist "$ENV_PATH"
}

@test "the env folder should exist after bootstrap.sh" {
    git init "$ENV_DIR"
    bin/bootstrap.sh
    assert_file_exist "$ENV_PATH"
}