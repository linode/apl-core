#!/usr/sbin/bats

@test "executing bootstrap.sh returns 0 with env folder" {
    mkdir /home/app/otomi-values 
    git init /home/app/otomi-values
    declare -x ENV_DIR=/home/app/otomi-values
    . bin/bootstrap.sh
}

@test "executing bootstrap.sh should fail without env folder" {
    run bin/bootstrap.sh
    [ "$status" -eq 1 ]
    [ "$output" = "cp: can't create './env/.secrets': No such file or directory" ]
}