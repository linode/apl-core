#!/usr/local/bin/bats

lib_dir="/usr/local/lib"

load "$lib_dir/bats-support/load.bash"
load "$lib_dir/bats-assert/load.bash"
load "$lib_dir/bats-file/load.bash"

. bin/common.sh

##############
# parse_args #
##############
@test "parse_args without CLI argument should throw 4" {
    run parse_args
    assert_output 'Error: --all or --label not specified'
    assert_failure 5
}

@test "parse_args with --all should succeed" {
    parse_args --all
    assert [ $all = 'y' ]
}

@test "parse_args with -A should succeed" {
    parse_args -A
    assert [ $all = 'y' ]
}

@test "parse_args with ONLY --label should fail" {
    run parse_args --label
    assert_output --partial "option '--label' requires an argument"
    assert_failure 2
}

@test "parse_args with ONLY -l should fail" {
    run parse_args -l
    assert_output --partial "option requires an argument -- 'l'"
    assert_failure 2
}

@test "parse_args with --label 'arbitrary value' should pass" {
    parse_args --label this=should_work
    assert [ ${label} = 'this=should_work' ]
}