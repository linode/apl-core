#!/usr/local/env bash

lib_dir="/usr/local/lib"

load "$lib_dir/bats-support/load.bash"
load "$lib_dir/bats-assert/load.bash"
load "$lib_dir/bats-file/load.bash"

#####
# Variables to avoid duplication & share between test scripts
#####
parse_args_str="parse_args"
true_var='true'
aws_dev_str="aws-dev"
aws_demo_str="aws-demo"
generating_text="Generating k8s v1.18 manifests for cluster"
assert_output_partial_generating_text="assert_output --partial"
validate_templates_name="validate-templates"
# <timeout> because a real validation can take up to 80 sec
run_otomi_validate_templates="run timeout 5 bin/${validate_templates_name}.sh"
assert_generating_text="$assert_output_partial_generating_text $generating_text"
validate_values_str="validate-values"
run_otomi_validate_values="run timeout 5 bin/${validate_values_str}.sh"
env_folder="env folder"
bootstrap_sh="bootstrap.sh"
env_dir_str="with new ENV_DIR (otomi-values)"
