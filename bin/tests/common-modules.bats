#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/common-modules.sh
. bin/common.sh

##############
# parse_args #
##############
@test "$parse_args_str with --all should succeed" {
    parse_args --all
    assert [ $ALL_OPT = $true_var ]
}

@test "$parse_args_str with -A should succeed" {
    parse_args -A
    assert [ $ALL_OPT = $true_var ]
}

@test "$parse_args_str with ONLY --label should fail" {
    run parse_args --label
    assert_output --partial "option '--label' requires an argument"
    assert_failure 1
}

@test "$parse_args_str with ONLY --cluster should fail" {
    run parse_args --cluster
    assert_output --partial "option '--cluster' requires an argument"
    assert_failure 1
}

@test "$parse_args_str with ONLY -l should fail" {
    run parse_args -l
    assert_output --partial "option requires an argument -- 'l'"
    assert_failure 1
}

@test "$parse_args_str with ONLY -c should fail" {
    run parse_args -c
    assert_output --partial "option requires an argument -- 'c'"
    assert_failure 1
}

@test "$parse_args_str with --label 'arbitrary value' should pass" {
    parse_args --label this=should_work
    assert [ ${LABEL_OPT} = 'this=should_work' ]
}

@test "$parse_args_str with -l 'arbitrary value' should pass" {
    parse_args -l this=should_work
    assert [ ${LABEL_OPT} = 'this=should_work' ]
}

@test "$parse_args_str with --cluster 'arbitrary cluster' should pass" {
    parse_args --cluster aws-dev
    assert [ ${CLUSTER_OPT} = 'aws-dev' ]
}

@test "$parse_args_str with -c 'arbitrary cluster' should pass" {
    parse_args -c aws-dev
    assert [ ${CLUSTER_OPT} = 'aws-dev' ]
}

@test "$validate_templates_name with both -A and -c fails" {
    eval "$run_otomi_validate_templates -A -c aws-dev"
    assert_output --partial 'cannot specify --all and --cluster simultaneously'
    assert_failure 1
}

@test "$validate_templates_name with both --all and --cluster fails" {
    eval "$run_otomi_validate_templates --all --cluster aws-dev"
    assert_output --partial 'cannot specify --all and --cluster simultaneously'
    assert_failure 1
}