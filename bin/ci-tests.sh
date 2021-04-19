#!/usr/bin/env bash
export CI='true'
set -e

tests=$(ls .test | xargs)
for test in $tests; do
  echo "Validating .test/$test values"
  ln -s $PWD/.test/$test env
  bats -T bin/tests
  bin/validate-values.sh
  bin/validate-templates.sh
  bin/check-policies.sh
  unlink env
done

profiles=$(ls profiles | xargs)

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
