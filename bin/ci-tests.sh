#!/usr/bin/env bash
export CI='true'
set -e

testEnv=$PWD/tests/fixtures
echo "Validating $testEnv values"
ln -s $testEnv env
bats -T bin/tests
bin/validate-values.sh
bin/validate-templates.sh
bin/check-policies.sh
unlink env

profiles=$(find profiles -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)
for profile in $profiles; do
  echo "Validating profiles/$profile/ values"
  [ "$profile" == "common" ] && continue
  valuesPath=$(mktemp -d)
  ln -s $valuesPath env
  bin/bootstrap.sh $profile
  bin/validate-values.sh
  bin/validate-templates.sh
  bin/check-policies.sh
  rm -rf $valuesPath
  unlink env
done
