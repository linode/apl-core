#!/usr/sbin/bats

load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'
load 'test_helper/bats-file/load'

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