#!/usr/bin/env bash
export CI=1
export IN_DOCKER=1
set -e

. bin/common.sh

testEnv=$PWD/tests/fixtures
echo "Validating $testEnv values"
ln -s $testEnv env
bats -T bin/tests
opa test policies -v
bin/validate-values.sh
hf lint
# bin/validate-templates.sh
# bin/check-policies.sh
unlink env

for dir in ./profiles/*; do
  profile=$(basename $dir)
  echo "Validating profiles/$profile/ values"
  [ "$profile" == "common" ] && continue
  valuesPath=$(mktemp -d)
  ln -s $valuesPath env
  bin/bootstrap.sh -p $profile
  bin/validate-values.sh
  hf lint
  # bin/validate-templates.sh
  # bin/check-policies.sh
  rm -rf $valuesPath
  unlink env
done
