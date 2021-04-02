#!/usr/bin/env bash
set -eu

[ "$SKIP_TESTS" = 'true' ] && echo "Skipping tests" && exit 0

cp -r .demo/ env/
bin/validate-values.sh
bin/validate-templates.sh
echo $?
bats bin/tests
