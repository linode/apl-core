#!/usr/sbin/bats

load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'
load 'test_helper/bats-file/load'

setup () {
    TEST_TEMP_DIR="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$TEST_TEMP_DIR"
}

teardown () {
    temp_del "$TEST_TEMP_DIR"
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
    git init "$TEST_TEMP_DIR"
    bin/bootstrap.sh 
    run bin/bootstrap.sh
    assert_success
}