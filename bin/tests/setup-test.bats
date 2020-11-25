#!/usr/sbin/bats

@test "executing bootstrap.sh returns 0 by default" {
    mkdir /home/app/otomi-values 
    git init /home/app/otomi-values
    declare -x ENV_DIR=/home/app/otomi-values
    . bin/bootstrap.sh
}

