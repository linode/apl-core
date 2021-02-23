#!/usr/bin/env bash
export CI='true'

bin/validate-values.sh &&
  bats -T bin/tests &&
  bin/validate-templates.sh --all &&
  bin/check-policies.sh
