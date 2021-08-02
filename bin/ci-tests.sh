#!/usr/bin/env bash
export CI=1
export IN_DOCKER=1
unlink env 2>&1 >/dev/null
set -e

. bin/common.sh

testEnv=$PWD/tests/fixtures
source $testEnv/env/.env
echo "Validating $testEnv values"

ln -s $testEnv env
bats -T bin/tests
opa test policies -v
bin/validate-values.sh
hf lint
bin/validate-templates.sh
# bin/check-policies.sh
unlink env
