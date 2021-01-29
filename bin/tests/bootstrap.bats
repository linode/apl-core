#!/usr/local/bin/bats

lib_dir="/usr/local/lib"

load "$lib_dir/bats-support/load.bash"
load "$lib_dir/bats-assert/load.bash"
load "$lib_dir/bats-file/load.bash"

setup () {
    test_temp_dir="$(temp_make --prefix 'otomi-values-')"
    export ENV_DIR="$test_temp_dir"
    env_path="$ENV_DIR/env"
}

teardown () {
    temp_del "$test_temp_dir"
    unset ENV_DIR
    unset env_path
}

@test "the env folder should not be overwritten" {
    git init "$ENV_DIR"
    cluster_path="$env_path/clusters.yaml"
    mkdir -p "$env_path" && touch $cluster_path && echo "clouds: please-do-not-remove" > $cluster_path
    bin/bootstrap.sh 

    assert_file_not_exist "$env_path/charts"
    assert_file_not_exist "$env_path/clouds"
    assert_file_not_exist "$env_path/teams"
}

@test "the env folder should be created after bootstrap.sh" {
    git init "$ENV_DIR"
    bin/bootstrap.sh

    assert_file_exist "$env_path/charts"
    assert_file_exist "$env_path/clouds"
    assert_file_exist "$env_path/teams"
}

@test "executing bootstrap.sh should pass with new ENV_DIR (otomi-values) folder" {
    git init "$ENV_DIR"
    run bin/bootstrap.sh
    assert_success
}

@test "executing bootstrap.sh should fail without new ENV_DIR (otomi-values) folder" {
    unset ENV_DIR
    run bin/bootstrap.sh
    assert_failure
}

@test "executing bootstrap.sh multiple times should pass with new ENV_DIR (otomi-values)" {
    git init "$test_temp_dir"
    bin/bootstrap.sh 
    run bin/bootstrap.sh
    assert_success
}

@test "executing bootstrap.sh creates a valid loose schema" {
    git init "$ENV_DIR"
    run bin/bootstrap.sh
    assert_success
    assert_file_exist "$ENV_DIR/.vscode/values-schema.yaml"
    assert_file_exist "$PWD/values-schema.yaml"

    result=$(yq r "$PWD/values-schema.yaml" '**.required.' | wc -l)
    [ "$result" -ne 0 ]
    result=$(yq r "$PWD/values-schema.yaml" 'properties.toolsVersion' | wc -l)
    [ "$result" -ne 0 ]
    result=$(yq r "$PWD/values-schema.yaml" 'properties.cluster' | wc -l)
    [ "$result" -ne 0 ]

    result=$(yq r "$ENV_DIR/.vscode/values-schema.yaml" '**.required.' | wc -l)
    [ "$result" -eq 0 ]
    result=$(yq r "$ENV_DIR/.vscode/values-schema.yaml" 'properties.toolsVersion' | wc -l)
    [ "$result" -eq 0 ]
    result=$(yq r "$ENV_DIR/.vscode/values-schema.yaml" 'properties.cluster' | wc -l)
    [ "$result" -eq 0 ]
    
}
