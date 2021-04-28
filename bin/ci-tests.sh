#!/usr/bin/env bash
export CI='true'
set -e

test_env=$PWD/tests/fixtures
echo "Validating test values"
ENV_DIR=$test_env
bats -T bin/tests
bin/validate-values.sh
bin/validate-templates.sh
bin/check-policies.sh

for dir in ./profiles/*; do
  profile=$(basename $dir)
  echo "Validating profiles '$profile' values"
  [ "$profile" == "common" ] && continue
  ENV_DIR=$values_path
  bin/validate-values.sh
  bin/validate-templates.sh
  bin/check-policies.sh
done
