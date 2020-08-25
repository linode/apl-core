#/usr/bin/env bash
set -e
git pull
drun bin/crypt.sh dec
