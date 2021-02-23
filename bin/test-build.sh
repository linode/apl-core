#!/usr/bin/env bash
export CI='true'

bin/validate-values.sh &&
  bin/otomi bats &&
  bin/otomi validate-templates --all &&
  bin/check-policies.sh
