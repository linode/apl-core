#!/usr/sbin/bats

load 'test_helper/bats-support/load'
load 'test_helper/bats-assert/load'
load 'test_helper/bats-file/load'

setup () {
    export ENV_DIR="/tmp/otomi-values"
}

teardown () {
    rm -rf "$ENV_DIR"
    unset ENV_DIR
}

@test "executing bootstrap.sh should pass with env folder" {
    mkdir -p "$ENV_DIR" && git init "$ENV_DIR"
    bin/bootstrap.sh
}

@test "executing bootstrap.sh should fail without env folder" {
    run bin/bootstrap.sh
    [ "$status" -eq 1 ]
}

@test "executing bootstrap.sh multiple times should pass" {
    mkdir -p "$ENV_DIR" && git init "$ENV_DIR"
    bin/bootstrap.sh 
    run bin/bootstrap.sh
}