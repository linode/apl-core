#!/usr/local/bin/bats

. bin/tests/bats-common.sh

function setup () {
    test_temp_dir="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$test_temp_dir"
    env_path="$ENV_DIR/env"
}

function teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR
    unset env_path
}
#######################
# env folder creation #
#######################
env_folder="env folder"

@test "$env_folder should not be overwritten" {
    git init "$ENV_DIR"
    cluster_path="$env_path/clusters.yaml"
    mkdir -p "$env_path" && touch $cluster_path && echo "clouds: please-do-not-remove" > $cluster_path
    bin/bootstrap.sh 

    assert_file_not_exist "$env_path/charts"
    assert_file_not_exist "$env_path/clouds"
    assert_file_not_exist "$env_path/teams"
}

@test "$env_folder should be created after bootstrap.sh" {
    git init "$ENV_DIR"
    bin/bootstrap.sh

    assert_file_exist "$env_path/charts"
    assert_file_exist "$env_path/clouds"
    assert_file_exist "$env_path/teams"
}

################
# bootstrap.sh #
################
bootstrap_sh="bootstrap.sh"
env_dir_str="with new ENV_DIR (otomi-values)"

@test "$bootstrap_sh should pass $env_dir_str folder" {
    git init "$ENV_DIR"
    run bin/bootstrap.sh
    assert_success
}

@test "$bootstrap_sh multiple times should pass $env_dir_str" {
    git init "$test_temp_dir"
    bin/bootstrap.sh 
    run bin/bootstrap.sh
    assert_success
}

@test "$bootstrap_sh creates a valid loose schema" {
    git init "$ENV_DIR"
    run bin/bootstrap.sh
    assert_success
    assert_file_exist "$ENV_DIR/.vscode/values-schema.yaml"

    result=$(yq r "$ENV_DIR/.vscode/values-schema.yaml" '**.required.' | wc -l)
    [ "$result" -eq 0 ]
}
