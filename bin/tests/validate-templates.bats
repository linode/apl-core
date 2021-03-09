#!/usr/local/bin/bats

. bin/tests/bats-common.sh
. bin/common.sh

function setup () {
    test_temp_dir="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$test_temp_dir" CLOUD=aws CLUSTER=demo
    env_path="$ENV_DIR/env"
    git init "$ENV_DIR"
    bin/bootstrap.sh 
}

function teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR CLOUD CLUSTER env_path
}

#####
# bin/validate-templates 
#####
@test "$validate_templates_name without arguments fails" {
    eval "$run_otomi_validate_templates" 
    assert_failure
}

@test "$validate_templates_name -l something starts generating" {
    eval "$run_otomi_validate_templates -l group=jobs"
    eval "$assert_generating_text"
}

@test "$validate_templates_name -A starts generating" {
    eval "$run_otomi_validate_templates -A"
    eval "$assert_generating_text"
}

@test "$validate_templates_name --cluster aws-demo starts generating 'aws-demo'" {
    eval "$run_otomi_validate_templates --cluster $aws_demo_str"
    eval "$assert_output_partial_generating_text $generating_text $aws_demo_str"
}