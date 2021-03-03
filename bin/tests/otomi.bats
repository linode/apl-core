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
# bin/otomi 
#####
@test "otomi without arguments prints help message" {
    run bin/otomi
    # Exit code is different depending on global $CI ...
    [ -z "$CI" ] && assert_failure 1 || assert_failure 2
}

#####
# bin/validate-templates 
#####
aws_dev_str="aws-dev"
aws_demo_str="aws-demo"
generating_text="Generating k8s v1.18 manifests for cluster"
assert_output_partial_generating_text="assert_output --partial"
validate_templates_name="validate-templates"
# <timeout> because a real validation can take up to 80 sec
run_otomi_validate_templates="run timeout 5 bin/${validate_templates_name}.sh"

@test "$validate_templates_name without arguments fails" {
    eval "$run_otomi_validate_templates" 
    assert_failure
}

@test "$validate_templates_name with both -A and -l fails" {
    eval "$run_otomi_validate_templates -A -l group=jobs"
    assert_output --partial 'cannot specify --all and --label simultaneously'
    assert_failure 1
}

@test "$validate_templates_name with both --all and --label fails" {
    eval "$run_otomi_validate_templates --all --label group=jobs"
    assert_output --partial 'cannot specify --all and --label simultaneously'
    assert_failure 1
}

assert_generating_text="$assert_output_partial_generating_text $generating_text"
@test "$validate_templates_name -l something starts generating" {
    eval "$run_otomi_validate_templates -l group=jobs"
    eval "$assert_generating_text"
}

@test "$validate_templates_name --label something starts generating" {
    eval "$run_otomi_validate_templates --label group=jobs"
    eval "$assert_generating_text"
}

@test "$validate_templates_name -A starts generating" {
    eval "$run_otomi_validate_templates -A"
    eval "$assert_generating_text"
}

@test "$validate_templates_name --all starts generating" {
    eval "$run_otomi_validate_templates --all"
    eval "$assert_generating_text"
}

@test "$validate_templates_name --cluster aws-demo starts generating 'aws-demo'" {
    eval "$run_otomi_validate_templates --cluster $aws_demo_str"
    eval "$assert_output_partial_generating_text $generating_text $aws_demo_str"
}

@test "$validate_templates_name -c aws-demo starts generating 'aws-demo'" {
    eval "$run_otomi_validate_templates -c $aws_demo_str"
    eval "$assert_output_partial_generating_text $generating_text $aws_demo_str"
}