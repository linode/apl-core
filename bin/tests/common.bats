#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/common-modules.sh
. bin/common.sh

##############
# parse_args #
##############
@test "parse_args with ONLY --label should fail" {
    run binzx/otomi argstest --label
    assert_failure
}

@test "parse_args with ONLY -l should fail" {
    run binzx/otomi argstest argstest -l
    assert_failure
}

@test "parse_args with --label 'arbitrary value' should pass" {
    run binzx/otomi argstest --label this=should_work
    assert_success
}

@test "parse_args with -l 'arbitrary value' should pass" {
    run binzx/otomi argstest -l this=should_work
    assert_success
}
