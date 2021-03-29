#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/common-modules.sh
. bin/common.sh

##############
# parse_args #
##############
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
    assert [ ${LABEL_OPT} = 'this=should_work' ]
}

@test "parse_args with -l 'arbitrary value' should pass" {
    parse_args -l this=should_work
    assert [ ${LABEL_OPT} = 'this=should_work' ]
}
