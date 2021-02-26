#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/common.sh

##############
# parse_args #
##############
@test "parse_args without CLI argument should throw 4" {
    run parse_args
    assert_output --partial '--all or --label not specified'
    assert_failure 1
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
    assert_failure 1
}

@test "parse_args with ONLY -l should fail" {
    run parse_args -l
    assert_output --partial "option requires an argument -- 'l'"
    assert_failure 1
}

@test "parse_args with --label 'arbitrary value' should pass" {
    parse_args --label this=should_work
    assert [ ${label} = 'this=should_work' ]
}