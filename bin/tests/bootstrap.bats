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
@test "env folder should not be overwritten" {
    git init "$ENV_DIR"
    cluster_path="$env_path/cluster.yaml"
    mkdir -p "$env_path" && touch $cluster_path && echo "clouds: please-do-not-remove" > $cluster_path
    binzx/otomi bootstrap

    assert_file_not_exist "$env_path/charts"
    assert_file_not_exist "$env_path/teams"
}

@test "env folder should be created after bootstrap.sh" {
    git init "$ENV_DIR"
    binzx/otomi bootstrap
    assert_file_exist "$env_path/charts"
    assert_file_exist "$env_path/teams"
}

################
# bootstrap.sh #
################
@test "bootstrap.sh should pass with new ENV_DIR (otomi-values) folder" {
    git init "$ENV_DIR"
    binzx/otomi bootstrap
    assert_success
}

@test "bootstrap.sh multiple times should pass with new ENV_DIR (otomi-values)" {
    git init "$test_temp_dir"
    binzx/otomi bootstrap
    binzx/otomi bootstrap
    assert_success
}

@test "bootstrap.sh creates a valid loose schema" {
    git init "$ENV_DIR"
    binzx/otomi bootstrap
    assert_success
    assert_file_exist "$ENV_DIR/.vscode/values-schema.yaml"

    result=$(yq r "$ENV_DIR/.vscode/values-schema.yaml" '**.required.' | wc -l)
    [ "$result" -eq 0 ]
}
