#!/usr/bin/env bash
export CI='true'

bin/validate-values.sh -A &&
  bats -T bin/tests &&
  bin/validate-templates.sh -A &&
  bin/check-policies.sh -A
