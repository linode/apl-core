#!/usr/sbin/bats

@test "executing bootstrap.sh returns 0 by default" {
    . bin/bootstrap.sh
}

